# utils/voice_predictor.py
import torch
import torch.nn.functional as F
import librosa
import numpy as np
from transformers import Wav2Vec2FeatureExtractor

# --- ✅ EXACT VARIABLES FROM YOUR ML TEAMMATE ---
MODEL_NAME = "facebook/wav2vec2-base"
SAMPLE_RATE = 16000
MAX_LENGTH = SAMPLE_RATE * 4  # 4 seconds
DEVICE = "cpu"  # Forcing CPU to keep your Flask server stable

STRESS_LABELS = ["Low", "Moderate", "High"]
POSITIVITY_LABELS = ["Negative", "Neutral", "Positive"]
POSITIVITY_SCORE = {"Negative": 0.0, "Neutral": 50.0, "Positive": 100.0}

# Initialize the audio feature extractor
print("Loading Wav2Vec2 Feature Extractor...")
feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(MODEL_NAME)

try:
    print("Loading 300MB Voice PyTorch Model...")
    # Make sure your teammate's file is named voice_model.pt inside the ml_models folder!
    model = torch.load("ml_models/voice_model.pt", map_location=torch.device(DEVICE))
    model.eval()
    print("Voice Model Loaded Successfully!")
except Exception as e:
    print(f"⚠️ CRITICAL: Could not load voice model. Error: {e}")

def predict_stress(audio_path):
    """
    Takes an audio file path, runs it through the PyTorch model, 
    and returns the stress tier, confidence, and positivity score.
    """
    try:
        # 1. Load and process audio using the exact 4-second rule
        speech, _ = librosa.load(audio_path, sr=SAMPLE_RATE)
        speech = librosa.util.fix_length(speech, size=MAX_LENGTH)
        
        # 2. Extract features 
        input_values = feature_extractor(speech, sampling_rate=SAMPLE_RATE, return_tensors="pt").input_values.to(DEVICE)
        
        # 3. Model Inference (No Gradients needed for prediction)
        with torch.no_grad():
            stress_logits, pos_logits = model(input_values)
            
            # Convert raw logits to probabilities
            stress_probs = F.softmax(stress_logits, dim=-1)[0].cpu().numpy()
            pos_probs = F.softmax(pos_logits, dim=-1)[0].cpu().numpy()
            
        # 4. Map the probabilities to the exact labels and math provided by your teammate
        stress_idx = int(stress_probs.argmax())
        positivity_score = float(sum(p * POSITIVITY_SCORE[l] for p, l in zip(pos_probs, POSITIVITY_LABELS)))
        
        return {
            "stress_level": STRESS_LABELS[stress_idx],
            "confidence": round(float(stress_probs[stress_idx]) * 100, 2),
            "positivity": round(positivity_score, 2)
        }
        
    except Exception as e:
        print(f"Error processing audio in PyTorch: {e}")
        # Safe fallback dictionary to prevent server crash
        return {"stress_level": "Moderate", "confidence": 0.0, "positivity": 50.0}