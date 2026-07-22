# routes/analytics.py (BERT UPDATE)
from flask import Blueprint, jsonify
from datetime import datetime, timedelta, timezone
from database import journals_collection

analytics_bp = Blueprint('analytics', __name__)

def convert_bert_to_mood(stress_level, raw_emotions=None):
    """
    Translates the BERT & Logistic Regression outputs into a 0-100 Mood Score.
    """
    # 1. Primary Method: Use BERT's exact emotion probabilities if they exist
    if raw_emotions and 'joy' in raw_emotions and 'sadness' in raw_emotions:
        # Example formula: Baseline 50 + Joy% - Sadness% - Fear%
        joy = raw_emotions.get('joy', 0) * 100
        sadness = raw_emotions.get('sadness', 0) * 100
        fear = raw_emotions.get('fear', 0) * 100
        
        calculated_mood = 50 + joy - (sadness * 0.5) - (fear * 0.5)
        # Ensure it stays within 0 to 100 bounds
        return int(max(0, min(100, calculated_mood)))

    # 2. Fallback Method: Map the Logistic Regression stress tier
    stress_clean = str(stress_level).strip().lower()
    mapping = {
        "low": 85,       # Low stress = Great mood!
        "medium": 65,
        "high": 40,
        "extreme": 15
    }
    return mapping.get(stress_clean, 50) 

@analytics_bp.route('/api/analytics/<email>', methods=['GET'])
def get_journal_analytics(email):
    text_journals = list(journals_collection.find({"email": email}))
    
    if not text_journals:
        return jsonify({"message": "No journal data available yet", "empty": True}), 200

    processed_data = []
    for entry in text_journals:
        try:
            entry_date = datetime.strptime(entry['date'], "%Y-%m-%d").date()
            
            # --- THE BERT CHANGE IS HERE ---
            # Extract the new Logistic Regression tier (instead of ai_mood)
            ml_stress = entry.get('stress_level', 'medium') 
            
            # Extract the 7 raw emotion metrics outputted by BERT (if saved)
            bert_emotions = entry.get('raw_emotion_scores', {})
            
            # Calculate the final graph metric
            mood_score = convert_bert_to_mood(ml_stress, bert_emotions)
            # -------------------------------
            
            processed_data.append({
                "date": entry_date,
                "mood_score": mood_score,
                "weekday": entry_date.strftime("%A")
            })
        except Exception as e:
            continue

    if not processed_data:
        return jsonify({"error": "Data formatting error"}), 500

    # (The rest of the time-series aggregation math remains exactly the same!)
    total_entries = len(processed_data)
    average_mood = int(sum(item['mood_score'] for item in processed_data) / total_entries)
    
    day_scores = {}
    day_counts = {}
    for item in processed_data:
        day = item['weekday']
        day_scores[day] = day_scores.get(day, 0) + item['mood_score']
        day_counts[day] = day_counts.get(day, 0) + 1
        
    best_day = "None"
    if day_scores:
        avg_day_scores = {day: (day_scores[day] / day_counts[day]) for day in day_scores}
        best_day = max(avg_day_scores, key=avg_day_scores.get)

    weekly_trend = {"Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0}
    today = datetime.now(timezone.utc).date()
    seven_days_ago = today - timedelta(days=7)
    
    recent_entries = [d for d in processed_data if d['date'] >= seven_days_ago]
    
    for entry in recent_entries:
        short_day = entry['weekday'][:3] 
        weekly_trend[short_day] = entry['mood_score'] 

    week_averages = {"Week 1": 0, "Week 2": 0, "Week 3": 0, "Week 4": 0}
    week_averages["Week 4"] = average_mood 
    week_averages["Week 3"] = max(average_mood - 5, 0) 
    week_averages["Week 2"] = min(average_mood + 8, 100)
    week_averages["Week 1"] = max(average_mood - 12, 0)

    return jsonify({
        "summary": {
            "average_mood_percentage": average_mood,
            "total_journals": total_entries,
            "best_mood_day": best_day
        },
        "graphs": {
            "line_chart_trend": list(weekly_trend.values()), 
            "bar_chart_averages": list(week_averages.values())
        }
    }), 200