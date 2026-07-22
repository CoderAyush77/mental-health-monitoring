# utils/predictor.py
import joblib
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import warnings

# Suppress sklearn version warnings for cleaner terminal output
warnings.filterwarnings("ignore", category=UserWarning)

# 1. LOAD THE .PKL FILES INTO MEMORY
try:
    # Load the specific BERT model name
    bert_config = joblib.load("ml_models/bert_model_name.pkl")
    MODEL_NAME = bert_config.get("bert_model", "j-hartmann/emotion-english-distilroberta-base")

    # Load the Scikit-Learn pipeline components
    scaler = joblib.load("ml_models/feature_scaler.pkl")
    stress_classifier = joblib.load("ml_models/stress_model_1.pkl")

    # Initialize the NLP Transformer Engine
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    bert_model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    
except Exception as e:
    print(f"⚠️ CRITICAL: Could not load ML models. Ensure the 3 .pkl files are in the 'ml_models' folder. Error: {e}")

def evaluate_journal_stress(text):
    """
    Takes raw journal text, extracts 7 emotions via DistilRoBERTa, 
    scales them, and predicts the final categorical stress tier.
    """
    try:
        # STAGE 1: Transformer Extraction
        inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
        with torch.no_grad():
            outputs = bert_model(**inputs)
        
        # Convert raw logits to a 0-1 probability array for the 7 emotions
        probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1).numpy()[0]
        
        # Wrap in a 2D array format required by Scikit-Learn: [[feat1, feat2, ...]]
        feature_vector = [probabilities.tolist()]
        
        # STAGE 2: Feature Normalization (Using your teammate's scaler)
        scaled_features = scaler.transform(feature_vector)
        
        # STAGE 3: Logistic Regression Classification
        prediction = stress_classifier.predict(scaled_features)
        stress_tier = prediction[0] # Outputs: 'low', 'Medium', 'High', or 'Extreme'
        
        # Structure the raw emotions to save in the database for your Analytics graphs!
        emotions_dict = {
            "anger": float(probabilities[0]),
            "disgust": float(probabilities[1]),
            "fear": float(probabilities[2]),
            "joy": float(probabilities[3]),
            "neutral": float(probabilities[4]),
            "sadness": float(probabilities[5]),
            "surprise": float(probabilities[6])
        }
        
        return stress_tier, emotions_dict
        
    except Exception as e:
        print(f"Error during ML prediction pipeline: {e}")
        # Safe fallback so the server doesn't crash
        return "Medium", {}
    