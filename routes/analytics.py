from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta, timezone
from bson.objectid import ObjectId
from database import journals_collection, voice_collection

analytics_bp = Blueprint('analytics', __name__)

def map_stress(level, is_text=True):
    """Converts string stress levels to the UI's required integer map."""
    if not level: return None
    level = str(level).lower()
    if 'extreme' in level: return 4 if is_text else 3
    if 'high' in level: return 3
    if 'medium' in level or 'moderate' in level: return 2
    if 'low' in level: return 1
    return None

def format_date(date_str):
    """Formats standard dates to 'Jul 25, 2026'."""
    if not date_str: return "Unknown Date"
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%b %d, %Y")
    except:
        return date_str

# ==========================================
# API 1: Load Analytics Dashboard
# ==========================================
@analytics_bp.route('/<email>', methods=['GET'])
def get_dashboard(email):
    # Fetch all records for this user, sorted newest first
    text_entries = list(journals_collection.find({"email": email}).sort("time_of_creation", -1))
    voice_entries = list(voice_collection.find({"email": email}).sort("time_of_creation", -1))

    # 1. Process Summary Stats
    highest_stress_text = "Low"
    highest_stress_date = "N/A"
    highest_stress_val = 0
    
    text_history = []
    text_by_date = {}
    
    for entry in text_entries:
        date_str = entry.get('date', '')
        formatted_date = format_date(date_str)
        
        # Populate history dropdown lists
        text_history.append({
            "id": str(entry['_id']),
            "date": formatted_date
        })
        
        # For trend map
        text_by_date[date_str] = map_stress(entry.get('stress_level'), True)
        
        # Calculate highest stress
        val = map_stress(entry.get('stress_level'), True)
        if val and val > highest_stress_val:
            highest_stress_val = val
            highest_stress_text = entry.get('stress_level', 'Extreme').capitalize()
            highest_stress_date = formatted_date

    voice_history = []
    voice_by_date = {}
    
    for entry in voice_entries:
        date_str = entry.get('date', '')
        formatted_date = format_date(date_str)
        
        voice_history.append({
            "id": str(entry['_id']),
            "date": formatted_date
        })
        voice_by_date[date_str] = map_stress(entry.get('overall_emotion_state'), False)

    summary = {
        "total_entries": len(text_entries),
        "voice_entries": len(voice_entries),
        "highest_stress": {
            "level": highest_stress_text,
            "date": highest_stress_date
        }
    }

    # 2. Calculate 7-Day Trend Arrays
    today = datetime.now(timezone.utc).date()
    trend_labels = []
    text_data = []
    voice_data = []

    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        target_str = target_date.strftime("%Y-%m-%d")
        
        trend_labels.append(target_date.strftime("%b %d"))
        text_data.append(text_by_date.get(target_str, None))
        voice_data.append(voice_by_date.get(target_str, None))

    stress_trend = {
        "days": trend_labels,
        "text": text_data,
        "voice": voice_data
    }

    # Assemble Final Dashboard Payload
    payload = {
        "summary": summary,
        "text_history": text_history,
        "voice_history": voice_history,
        "stress_trend": stress_trend
    }

    return jsonify(payload), 200

# ==========================================
# API 2: Load Analysis of Selected Entry
# ==========================================
@analytics_bp.route('/<email>/analysis', methods=['GET'])
def get_analysis(email):
    doc_type = request.args.get('type')
    doc_id = request.args.get('id')

    if not doc_type or not doc_id:
        return jsonify({"error": "Missing type or id parameters"}), 400

    try:
        obj_id = ObjectId(doc_id)
    except:
        return jsonify({"error": "Invalid ID format"}), 400

    if doc_type == 'text':
        entry = journals_collection.find_one({"_id": obj_id, "email": email})
        if not entry:
            return jsonify({"error": "Journal not found"}), 404
            
        payload = {
            "type": "text",
            "stress": entry.get('stress_level', 'Medium').capitalize(),
            "confidence": round(float(entry.get('sentiment_score', 0) * 100), 2) if entry.get('sentiment_score') else 0,
            "sentiment": entry.get('sentiment_score', 0),
            "emotions": entry.get('emotions', {
                "anger": 0, "disgust": 0, "fear": 0, "joy": 0, "neutral": 0, "sadness": 0, "surprise": 0
            })
        }
        return jsonify(payload), 200

    elif doc_type == 'voice':
        entry = voice_collection.find_one({"_id": obj_id, "email": email})
        if not entry:
            return jsonify({"error": "Voice entry not found"}), 404
            
        metrics = entry.get('tone_analyzer_metrics', {})
        payload = {
            "type": "voice",
            "stress": entry.get('overall_emotion_state', 'Moderate').capitalize(),
            "confidence": metrics.get('confidence', 0),
            "positivity": metrics.get('positivity', 0),
            "recommendation": {
                "line1": "Your voice shows moderate positivity.",
                "line2": "Keep expressing yourself!"
            }
        }
        return jsonify(payload), 200

    return jsonify({"error": "Invalid type parameter"}), 400