import os
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import librosa
import torch
from transformers import BertTokenizer, BertForSequenceClassification

# -------------------------------------------------------------------
# Model Initialization (BERT for Text/Wordings)
# -------------------------------------------------------------------
METRICS_MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models", "bert_metrics")
print("Loading trained BERT metrics model...")
try:
    metrics_tokenizer = BertTokenizer.from_pretrained(METRICS_MODEL_DIR)
    metrics_model = BertForSequenceClassification.from_pretrained(METRICS_MODEL_DIR)
    metrics_model.eval()
    print("Metrics model loaded successfully!")
except Exception as e:
    print(f"Warning: Could not load metrics model: {e}")
    metrics_tokenizer = None
    metrics_model = None

def get_text_metrics(text):
    """Extract metrics based purely on what is being said (Wordings)."""
    if not metrics_model or not metrics_tokenizer:
        return {"confidence": 50, "energy": 50, "stress": 50, "pace": 50, "positivity": 50}
    
    inputs = metrics_tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    with torch.no_grad():
        outputs = metrics_model(**inputs)
        predictions = outputs.logits.squeeze(0).tolist()
        
    return {
        "confidence": max(0, min(100, int(predictions[0] * 100))),
        "energy": max(0, min(100, int(predictions[1] * 100))),
        "stress": max(0, min(100, int(predictions[2] * 100))),
        "pace": max(0, min(100, int(predictions[3] * 100))),
        "positivity": max(0, min(100, int(predictions[4] * 100)))
    }

# -------------------------------------------------------------------
# Acoustic Feature Extraction (Tone)
# -------------------------------------------------------------------
def get_audio_metrics(audio_path):
    """Extract metrics based purely on how it is being said (Tone) using librosa."""
    try:
        # Load audio (downsample to 16kHz for speed)
        y, sr = librosa.load(audio_path, sr=16000)
        
        # 1. Energy/Volume -> proxy for Energy and Confidence
        rms = librosa.feature.rms(y=y)[0]
        mean_rms = float(np.mean(rms))
        # Normalize RMS (typical speaking RMS might be around 0.05 - 0.1)
        audio_energy = min(100, (mean_rms / 0.1) * 100)
        
        # 2. Pitch (F0) -> proxy for Stress/Emotion
        f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
        valid_f0 = f0[voiced_flag]
        if len(valid_f0) > 0:
            mean_f0 = float(np.mean(valid_f0))
            # Typical human pitch 85Hz - 255Hz. High pitch -> Stress/Energy
            audio_stress = min(100, max(0, ((mean_f0 - 85) / 170) * 100))
        else:
            audio_stress = 50.0
            
        # 3. Speech Pace -> proxy via Zero Crossing Rate
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        mean_zcr = float(np.mean(zcr))
        # Normal ZCR for speech ~ 0.05 to 0.15
        audio_pace = min(100, (mean_zcr / 0.15) * 100)
        
        return {
            "energy": audio_energy,
            "stress": audio_stress,
            "pace": audio_pace,
            "confidence": audio_energy * 0.7 + (100 - audio_stress) * 0.3, # Loud but calm = confident
            "positivity": 50.0 # Acoustic positivity is hard without full ML model, neutral baseline
        }
    except Exception as e:
        print(f"Error extracting acoustic features: {e}")
        return {"confidence": 50, "energy": 50, "stress": 50, "pace": 50, "positivity": 50}

# -------------------------------------------------------------------
# True Multi-Modal Fusion (Tone + Wordings)
# -------------------------------------------------------------------
def fuse_metrics(text_metrics, audio_metrics):
    """Side-by-side analysis of what is said (text) and how it's said (audio)."""
    fused = {}
    
    # 50/50 Fusion strategy
    for key in text_metrics.keys():
        text_weight = 0.5
        audio_weight = 0.5
        
        # Positivity is better detected via words
        if key == "positivity":
            text_weight = 0.8
            audio_weight = 0.2
            
        # Pace is better detected via audio
        if key == "pace":
            text_weight = 0.2
            audio_weight = 0.8
            
        fused[key] = int((text_metrics[key] * text_weight) + (audio_metrics[key] * audio_weight))
        fused[key] = max(0, min(100, fused[key]))
        
    return fused

def derive_overall_emotion(metrics):
    """Determine a dominant emotion label based on the fused metrics."""
    if metrics['stress'] > 75: return "Stressed"
    if metrics['positivity'] > 70 and metrics['energy'] > 60: return "Happy"
    if metrics['energy'] > 80 and metrics['stress'] > 60: return "Angry"
    if metrics['energy'] < 30 and metrics['positivity'] < 40: return "Sad"
    if metrics['confidence'] > 75: return "Confident"
    if metrics['stress'] < 40 and metrics['positivity'] > 50: return "Calm"
    return "Neutral"

# -------------------------------------------------------------------
# Flask Application Setup
# -------------------------------------------------------------------
app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/voice-reflection', methods=['POST'])
def process_voice_reflection():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
            
        audio_file = request.files['audio']
        frontend_transcript = request.form.get('transcript', 'I am feeling quite anxious today.').strip()
        
        raw_audio_path = os.path.join(UPLOAD_FOLDER, secure_filename("temp_recording.webm"))
        audio_file.save(raw_audio_path)
        
        # 1. Wordings Analysis (BERT)
        text_metrics = get_text_metrics(frontend_transcript)
        
        # 2. Tone Analysis (Librosa Acoustic Features)
        audio_metrics = get_audio_metrics(raw_audio_path)
        
        # 3. Multi-Modal Fusion (Tone + Wordings side-by-side)
        final_metrics = fuse_metrics(text_metrics, audio_metrics)
        
        # 4. Overall Emotion Prediction
        final_emotion = derive_overall_emotion(final_metrics)
        
        if os.path.exists(raw_audio_path):
            os.remove(raw_audio_path)
        
        return jsonify({
            "overall_emotion": final_emotion,
            "metrics": final_metrics,
            "message": "Successfully analyzed Tone and Wordings side-by-side"
        })
        
    except Exception as e:
        print(f"Error processing audio: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Multi-Modal Vector Fusion API is running on http://localhost:5000")
    app.run(port=5000, debug=True)
