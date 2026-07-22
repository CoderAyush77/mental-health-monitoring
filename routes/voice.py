# routes/voice.py
import os
from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
from database import voice_collection # Using the dedicated voice collection
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# 1. Initialize the isolated Voice Blueprint
voice_bp = Blueprint('voice', __name__)

# Secure Cryptography Setup
SECRET_KEY = os.getenv("FERNET_SECRET_KEY", Fernet.generate_key().decode()).encode()
cipher_suite = Fernet(SECRET_KEY)

# 2. CREATE ROUTE: Triggered when user clicks "Stop/Save" on the Voice tab
@voice_bp.route('/api/voice/create', methods=['POST'])
def save_voice_reflection():
    data = request.get_json()

    # Extract UI payloads
    email = data.get('email')
    content = data.get('content') # The live subtitle text
    tone_metrics = data.get('tone_metrics') # Confidence, energy, stress, pace, positivity
    overall_emotion = data.get('overall_emotion', 'Calm')

    if not email or not content or not tone_metrics:
        return jsonify({"error": "Voice reflection payload is incomplete."}), 400
    
    # Encrypt the transcribed text for privacy
    try:
        encrypted_content = cipher_suite.encrypt(content.encode()).decode()
    except Exception:
        return jsonify({"error": "Encryption failed. Data not saved."}), 500
        
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Construct the Voice-Specific Document
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
        "message": "Voice reflection saved to the dedicated voice database."
    }), 201

# 3. GET ROUTE: Fetch past voice reflections for the analytics/history tab
@voice_bp.route('/api/voice/<email>', methods=['GET'])
def get_voice_history(email):
    entries = list(voice_collection.find({"email": email}).sort("time_of_creation", -1))
    
    for entry in entries:
        entry['_id'] = str(entry['_id'])
        try:
            entry['content'] = cipher_suite.decrypt(entry['content'].encode()).decode()
        except Exception:
            pass
            
    return jsonify({"voice_reflections": entries}), 200