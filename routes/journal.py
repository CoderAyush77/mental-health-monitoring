import os
from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
from database import journals_collection
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# 1. IMPORT THE NEW BERT PREDICTOR
from utils.predictor import evaluate_journal_stress

# Crack open the .env vault
load_dotenv()

journal_bp = Blueprint('journal', __name__)

# Securely grab the key from the vault and convert it to bytes
SECRET_KEY = os.getenv("FERNET_SECRET_KEY").encode()
cipher_suite = Fernet(SECRET_KEY)

@journal_bp.route('/api/journal/create', methods=['POST'])
def create_entry():
    data = request.get_json()

    email = data.get('email')
    title = data.get('title')
    content = data.get('content')

    if not email or not title or not content:
        return jsonify({"error": "Please fill up the fields properly"}), 400
    
    # 2. NEW AI PREDICTION STEP (Runs on plain text BEFORE encryption) 
    # Extracts the 4-tier stress level and the 7 BERT emotion probabilities
    stress_level, raw_emotions = evaluate_journal_stress(content)
    
    try:
        encrypted_title = cipher_suite.encrypt(title.encode()).decode()
        encrypted_content = cipher_suite.encrypt(content.encode()).decode()
    except Exception as e:
        return jsonify({"error": "Security encryption failed. Entry aborted."}), 500
    
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 3. UPDATED DATABASE SCHEMA
    new_entry = {
        "email": email,
        "title": encrypted_title,
        "content": encrypted_content,
        "stress_level": stress_level,        # Used by the graphs (e.g., 'Low', 'High')
        "raw_emotion_scores": raw_emotions,  # Used by the graphs to calculate exact Mood %
        "date": today_str,               
        "time_of_creation": datetime.now(timezone.utc)
    }

    journals_collection.insert_one(new_entry)

    return jsonify({
        "message": "Entry created successfully! Daily task cleared.",
        "stress_prediction": stress_level
    }), 201


@journal_bp.route('/api/journal/<email>', methods=['GET'])
def get_entries(email):
    # Fetch and sort by newest first
    entries = list(journals_collection.find({"email": email}).sort("time_of_creation", -1))

    for entry in entries:
        # Fix the MongoDB ID trap
        entry['_id'] = str(entry['_id'])
        
        try:
            # Unlock the text inside the secure back room (RAM)
            decrypted_title = cipher_suite.decrypt(entry['title'].encode()).decode()
            decrypted_content = cipher_suite.decrypt(entry['content'].encode()).decode()
            
            # Reassign the readable text to send to the React frontend
            entry['title'] = decrypted_title
            entry['content'] = decrypted_content

            # --- THE ML PROOF INTERCEPTOR ---
            print("\n=== 🔒 SECURE ROOM (RAM) 🔒 ===")
            print(f"Feeding this exact text to the ML Model: '{decrypted_content}'")
            print("=================================\n")

        except Exception:
            # Safety net for old/unencrypted data
            pass

    return jsonify({"journals": entries}), 200