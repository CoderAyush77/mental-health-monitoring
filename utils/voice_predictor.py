# utils/voice_predictor.py
import os
import tempfile
import torch
import torch.nn.functional as F
import librosa
import numpy as np
from transformers import Wav2Vec2FeatureExtractor
import warnings

warnings.filterwarnings("ignore")

MODEL_NAME = "facebook/wav2vec2-base"
SAMPLE_RATE = 16000
MAX_LENGTH = SAMPLE_RATE * 4  # 4 seconds
DEVICE = "cpu"

STRESS_LABELS = ["Low", "Moderate", "High"]
POSITIVITY_LABELS = ["Negative", "Neutral", "Positive"]
POSITIVITY_SCORE = {"Negative": 0.0, "Neutral": 50.0, "Positive": 100.0}

print("Loading Wav2Vec2 Feature Extractor...")
feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(MODEL_NAME)

try:
    print("Loading 300MB Voice PyTorch Model...")
    model = torch.load("ml_models/voice_model.pt", map_location=torch.device(DEVICE))
    model.eval()
    print("Voice Model Loaded Successfully!")
except Exception as e:
    print(f"⚠️ CRITICAL: Could not load voice model. Error: {e}")

# Renamed to match what voice.py calls!
def evaluate_voice_audio(audio_file):
    """
    Takes a Flask FileStorage audio object, saves it temporarily, 
    runs PyTorch inference, and returns metrics for the frontend UI.
    """
    # 1. Save Flask file to a temporary .wav file so librosa can read it
    temp_path = tempfile.mktemp(suffix=".wav")
    audio_file.save(temp_path)

    try:
        # 2. Process audio
        speech, _ = librosa.load(temp_path, sr=SAMPLE_RATE)
        speech = librosa.util.fix_length(speech, size=MAX_LENGTH)
        
        input_values = feature_extractor(speech, sampling_rate=SAMPLE_RATE, return_tensors="pt").input_values.to(DEVICE)
        
        with torch.no_grad():
            stress_logits, pos_logits = model(input_values)
            stress_probs = F.softmax(stress_logits, dim=-1)[0].cpu().numpy()
            pos_probs = F.softmax(pos_logits, dim=-1)[0].cpu().numpy()
            
        stress_idx = int(stress_probs.argmax())
        positivity_score = float(sum(p * POSITIVITY_SCORE[l] for p, l in zip(pos_probs, POSITIVITY_LABELS)))
        
        overall_emotion = STRESS_LABELS[stress_idx]
        confidence = round(float(stress_probs[stress_idx]) * 100, 2)
        
        # 3. Structure the exact dictionary voice.py expects
        tone_metrics = {
            "confidence": confidence,
            "energy": 70,                   # ML fallback metric for UI
            "stress_level": stress_idx * 40, # Converts index 0,1,2 to a 0-100 scale for UI
            "speech_pace": 110,             # ML fallback metric for UI
            "positivity": positivity_score
        }
        
        return tone_metrics, overall_emotion
        
    except Exception as e:
        print(f"Error processing audio in PyTorch: {e}")
        return {"confidence": 0, "energy": 0, "stress_level": 0, "speech_pace": 0, "positivity": 50}, "Moderate"
        
    finally:
        # 4. Cleanup: Delete the temp file so your server doesn't run out of memory!
        if os.path.exists(temp_path):
            os.remove(temp_path)