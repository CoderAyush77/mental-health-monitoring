from flask import request, jsonify, Blueprint
from datetime import datetime, timezone
from database import voice_collection, cipher_suite
from utils.voice_predictor import evaluate_voice_audio # Import your PyTorch script

voice_bp = Blueprint('voice', __name__)

# 1. CREATE ROUTE: Triggered when user submits a voice reflection
@voice_bp.route('/api/voice/create', methods=['POST'])
def save_voice_reflection():
    # We expect a file and form data, NOT standard JSON
    email = request.form.get('email')
    content = request.form.get('content') # The live transcript text
    audio_file = request.files.get('audio') # The actual .wav file from frontend

    if not email or not content or not audio_file:
        return jsonify({"error": "Missing email, transcript, or audio file."}), 400
    
    # Pass the audio file directly to your PyTorch model script
    try:
        tone_metrics, overall_emotion = evaluate_voice_audio(audio_file)
    except Exception as e:
        return jsonify({"error": "Audio processing failed. Please try again."}), 500

    # Encrypt the transcript securely before database storage
    try:
        encrypted_content = cipher_suite.encrypt(content.encode()).decode()
    except Exception:
        return jsonify({"error": "Encryption failed. Data not saved."}), 500
        
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Construct the document with the ML-generated metrics
    new_voice_log = {
        "email": email,
        "content": encrypted_content,
        "tone_analyzer_metrics": {
            "confidence": int(tone_metrics.get('confidence', 0)),
            "energy": int(tone_metrics.get('energy', 0)),
            "stress_level": int(tone_metrics.get('stress_level', 0)),
            "speech_pace": int(tone_metrics.get('speech_pace', 0)),
            "positivity": int(tone_metrics.get('positivity', 0))
        },
        "overall_emotion_state": overall_emotion,
        "date": today_str,
        "time_of_creation": datetime.now(timezone.utc)
    }

    voice_collection.insert_one(new_voice_log)

    return jsonify({
        "status": "success",
        "message": "Audio processed via PyTorch and saved securely.",
        "metrics": tone_metrics # Send back to frontend to update the UI bars
    }), 201


# 2. GET ROUTE: Fetch past voice reflections for the analytics/history tab
@voice_bp.route('/api/voice/<email>', methods=['GET'])
def get_voice_history(email):
    entries = list(voice_collection.find({"email": email}).sort("time_of_creation", -1))
    
    for entry in entries:
        # Convert MongoDB ObjectId to string for JSON serialization
        entry['_id'] = str(entry['_id'])
        try:
            # Decrypt the text before sending it to the React frontend
            entry['content'] = cipher_suite.decrypt(entry['content'].encode()).decode()
        except Exception:
            # Safety net: skip decryption for legacy or unencrypted records
            pass
            
    return jsonify({"voice_reflections": entries}), 200