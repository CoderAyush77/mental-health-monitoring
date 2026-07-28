# utils/predictor.py
import joblib
import torch
import re
import numpy as np
import pandas as pd
from scipy.special import softmax
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import warnings

# Suppress sklearn version warnings for cleaner terminal output
warnings.filterwarnings("ignore")

DEVICE = torch.device("cpu") # Forcing CPU to keep your Flask server stable

# 1. LOAD THE .PKL FILES INTO MEMORY
try:
    # Load everything using your exact absolute paths
    bert_config = joblib.load(r"C:\Users\APLUS\Desktop\Backend\ml_models\bert_model_name.pkl")
    scaler = joblib.load(r"C:\Users\APLUS\Desktop\Backend\ml_models\feature_scaler.pkl")
    stress_classifier = joblib.load(r"C:\Users\APLUS\Desktop\Backend\ml_models\stress_model_1.pkl")
    
    MODEL_NAME = bert_config.get("bert_model", "j-hartmann/emotion-english-distilroberta-base")

    # Initialize the NLP Transformer Engine
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    bert_model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    bert_model.to(DEVICE)
    bert_model.eval()
    
    EMOTION_LABELS = [bert_model.config.id2label[i] for i in range(bert_model.config.num_labels)]
    
except Exception as e:
    print(f"⚠️ CRITICAL: Could not load ML models. Error: {e}")

# --- NEW CHUNKING HELPER FUNCTIONS ---
def split_into_sentences(text):
    text = text.strip()
    if not text:
        return []
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def chunk_paragraph(text, max_length=128):
    sentences = split_into_sentences(text)
    if not sentences:
        return [text]

    chunks = []
    current = ""
    for sent in sentences:
        candidate = f"{current} {sent}".strip() if current else sent
        n_tokens = len(tokenizer.encode(candidate, add_special_tokens=True))
        if n_tokens <= max_length:
            current = candidate
        else:
            if current:
                chunks.append(current)
            current = sent
    if current:
        chunks.append(current)

    return chunks if chunks else [text]

def mean_pool(last_hidden_state, attention_mask):
    mask = attention_mask.unsqueeze(-1).expand(last_hidden_state.size()).float()
    summed = torch.sum(last_hidden_state * mask, dim=1)
    counts = torch.clamp(mask.sum(dim=1), min=1e-9)
    return summed / counts

def _encode_text_as_feature_vector(text, batch_size=16, max_length=128):
    chunks = chunk_paragraph(text, max_length=max_length)

    chunk_embeddings = []
    chunk_emotion_probs = []
    chunk_weights = []

    for i in range(0, len(chunks), batch_size):
        batch_chunks = chunks[i:i + batch_size]

        encoded = tokenizer(
            batch_chunks,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt"
        ).to(DEVICE)

        with torch.no_grad():
            output = bert_model(**encoded, output_hidden_states=True)

        probs = softmax(output.logits.cpu().numpy(), axis=1)
        last_hidden_state = output.hidden_states[-1]
        pooled = mean_pool(last_hidden_state, encoded["attention_mask"])
        pooled = torch.nn.functional.normalize(pooled, p=2, dim=1)
        pooled = pooled.cpu().numpy()

        weights = encoded["attention_mask"].sum(dim=1).cpu().numpy()

        for p, emb, w in zip(probs, pooled, weights):
            chunk_emotion_probs.append(p)
            chunk_embeddings.append(emb)
            chunk_weights.append(w)

    weights = np.array(chunk_weights, dtype=float)
    if weights.sum() > 0:
        weights = weights / weights.sum()

    agg_embedding = np.average(np.vstack(chunk_embeddings), axis=0, weights=weights)
    norm = np.linalg.norm(agg_embedding)
    if norm > 0:
        agg_embedding = agg_embedding / norm

    agg_probs = np.average(np.vstack(chunk_emotion_probs), axis=0, weights=weights)
    emotion_dict = {f"emotion_{label}": float(score) for label, score in zip(EMOTION_LABELS, agg_probs)}

    return agg_embedding, emotion_dict

# --- MAIN PREDICTION FUNCTION ---
def evaluate_journal_stress(text):
    """
    Takes raw journal text (any length), processes it through the BERT 
    chunking pipeline, and returns the stress tier and exact emotion dictionary.
    """
    try:
        # 1. Run the chunking and feature extraction
        agg_embedding, emotion_dict = _encode_text_as_feature_vector(text)
        
        # 2. Format for Scikit-Learn
        embeddings = np.array([agg_embedding])
        emotion_df = pd.DataFrame([emotion_dict])
        embedding_cols = [f"embed_{i}" for i in range(embeddings.shape[1])]
        embedding_df = pd.DataFrame(embeddings, columns=embedding_cols)
        features_df = pd.concat([embedding_df, emotion_df], axis=1)

        # 3. Scale and Predict
        X_scaled = scaler.transform(features_df.values)
        predictions = stress_classifier.predict(X_scaled)
        
        # FIX: Ensure it is a clean string, not a tuple
        stress_tier = str(predictions[0]) 
        
        # Clean up the emotion keys for the database (remove 'emotion_' prefix)
        clean_emotions = {k.replace("emotion_", ""): v for k, v in emotion_dict.items()}
        
        return stress_tier, clean_emotions
        
    except Exception as e:
        print(f"Error during ML prediction pipeline: {e}")
        # Safe fallback so the server doesn't crash
        return "Medium", {}