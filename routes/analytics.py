from flask import Blueprint, jsonify
from datetime import datetime, timedelta, timezone
# FIX 1: Added the 's' to journals_collection here!
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

def generate_recommendation(stress_value, is_text=True):
    """Generates standard UI recommendations based on stress level."""
    if stress_value and stress_value >= 3:
        return {
            "icon": "fa-heart",
            "text1": "High stress detected.",
            "text2": "Please prioritize self-care today."
        }
    if is_text:
        return {
            "icon": "fa-sun",
            "text1": "Your tone is balanced.",
            "text2": "Keep observing your thoughts."
        }
    return {
        "icon": "fa-bullhorn",
        "text1": "Your voice shows moderate positivity.",
        "text2": "Keep expressing yourself!"
    }

@analytics_bp.route('/<email>', methods=['GET'])
def get_analytics(email):
    # FIX 2: Added the 's' to journals_collection here!
    text_entries = list(journals_collection.find({"email": email}).sort("time_of_creation", -1))
    voice_entries = list(voice_collection.find({"email": email}).sort("time_of_creation", -1))

    # 2. Process Summary Stats
    highest_stress_text = "Low"
    highest_stress_date = "N/A"
    highest_stress_val = 0
    
    for entry in text_entries:
        val = map_stress(entry.get('stress_level'), is_text=True)
        if val and val > highest_stress_val:
            highest_stress_val = val
            highest_stress_text = entry.get('stress_level', 'Extreme').capitalize()
            # Try to format the date if available
            date_str = entry.get('date', '')
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                highest_stress_date = dt.strftime("%b %d, %Y")
            except:
                highest_stress_date = date_str

    summary = {
        "total_entries": len(text_entries),
        "voice_entries": len(voice_entries),
        "highest_stress_text": highest_stress_text,
        "highest_stress_date": highest_stress_date
    }

    # 3. Calculate 7-Day Trend Arrays
    today = datetime.now(timezone.utc).date()
    trend_labels = []
    text_data = []
    voice_data = []
    
    # Map entries by date string for easy lookup
    text_by_date = {e.get('date'): map_stress(e.get('stress_level'), True) for e in text_entries if e.get('date')}
    voice_by_date = {e.get('date'): map_stress(e.get('overall_emotion_state'), False) for e in voice_entries if e.get('date')}

    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        target_str = target_date.strftime("%Y-%m-%d")
        
        trend_labels.append(target_date.strftime("%b %d"))
        text_data.append(text_by_date.get(target_str, None))
        voice_data.append(voice_by_date.get(target_str, None))

    stress_trend_7_days = {
        "labels": trend_labels,
        "text_data": text_data,
        "voice_data": voice_data
    }

    # 4. Process Detailed Analysis and History Lists
    history_text, history_voice = [], []
    detailed_text, detailed_voice = {}, {}

    # Process Text History
    for entry in text_entries:
        date_str = entry.get('date', '')
        if not date_str: continue
        
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            entry_id = dt.strftime("%b%d").lower()
            label = dt.strftime("%b %d, %Y")
        except:
            entry_id = date_str.replace("-", "")
            label = date_str

        # Only add if we haven't processed this day yet (to avoid duplicate IDs in dropdown)
        if entry_id not in detailed_text:
            history_text.append({"id": entry_id, "label": label})
            
            stress_lvl = entry.get('stress_level', 'Medium').capitalize()
            detailed_text[entry_id] = {
                "metrics": {
                    "stress_level": stress_lvl,
                    "polarity": "Positive" if entry.get('sentiment_score', 0) > 0 else "Negative",
                    "subjectivity": "Highly Personal"
                },
                "donut_chart": [45, 30, 25], # Hardcoded fallback per UI contract
                "recommendation": generate_recommendation(map_stress(stress_lvl, True), True)
            }

    # Process Voice History
    for entry in voice_entries:
        date_str = entry.get('date', '')
        if not date_str: continue
        
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            entry_id = dt.strftime("%b%d").lower()
            label = dt.strftime("%b %d, %Y")
        except:
            entry_id = date_str.replace("-", "")
            label = date_str

        if entry_id not in detailed_voice:
            history_voice.append({"id": entry_id, "label": label})
            
            metrics = entry.get('tone_analyzer_metrics', {})
            stress_lvl = entry.get('overall_emotion_state', 'Moderate').capitalize()
            detailed_voice[entry_id] = {
                "metrics": {
                    "stress_level": stress_lvl,
                    "confidence": f"{metrics.get('confidence', 0)}%",
                    "positivity": f"{metrics.get('positivity', 0)}/100"
                },
                "recommendation": generate_recommendation(map_stress(stress_lvl, False), False)
            }

    # Assemble Final Payload
    payload = {
        "summary": summary,
        "stress_trend_7_days": stress_trend_7_days,
        "history_lists": {
            "text": history_text,
            "voice": history_voice
        },
        "detailed_text_analysis": detailed_text,
        "detailed_voice_analysis": detailed_voice
    }

    return jsonify(payload), 200