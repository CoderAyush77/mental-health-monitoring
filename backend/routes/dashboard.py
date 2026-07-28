from flask import Blueprint, jsonify, request
from datetime import datetime, timezone, timedelta
# Import all three collections from your database configuration helper
from database import checkins_collection, journals_collection, users_collection

dashboard_bp = Blueprint('dashboard', __name__)

# API 1: STATUS CHECK (Tells Frontend whether to enable or lock the Check-In button)
@dashboard_bp.route('/api/dashboard/checkin/status/<email>', methods=['GET'])
def get_checkin_status(email):
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # 1. Check if they already pressed the confirm check-in button today
    already_checked_in = checkins_collection.find_one({"email": email, "date": today_str})
    if already_checked_in:
        return jsonify({
            "button_action": "COMPLETED",
            "message": "Already checked in for today!",
            "streak_incremented": True
        }), 200

    # 2. Check if they have completed their prerequisite tasks today
    has_journal = journals_collection.find_one({"email": email, "date": today_str}) is not None
    
    # Safety Check: Falls back to False safely since you haven't built chatbot tables yet
    has_chatbot = False 

    # 3. Decision Matrix sent back to your React Wizard
    if has_journal or has_chatbot:
        return jsonify({
            "button_action": "UNLOCKED",
            "message": "Prerequisites met. You can now officially check-in!",
            "streak_incremented": False
        }), 200
    else:
        return jsonify({
            "button_action": "LOCKED",
            "message": "Please submit a journal entry or talk to the chatbot first.",
            "streak_incremented": False
        }), 200


# API 2: CONFIRM CHECK-IN (Increments the daily streak counter on click)
@dashboard_bp.route('/api/dashboard/checkin/confirm', methods=['POST'])
def confirm_daily_checkin():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday_str = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

    # Double check that they didn't bypass the frontend lock button
    has_journal = journals_collection.find_one({"email": email, "date": today_str}) is not None
    if not has_journal:
        return jsonify({"error": "Cannot check in without writing a journal or chatting first."}), 400

    # Look up user profile to manage the streak count numbers
    user_profile = users_collection.find_one({"email": email})
    
    # Dynamic fallback: If user profile record doesn't have a streak setup yet
    if not user_profile:
        current_streak = 0
        last_checkin_date = ""
    else:
        current_streak = user_profile.get('streak', 0)
        last_checkin_date = user_profile.get('last_checkin_date', "")

    # Calculate streak rules
    if last_checkin_date == today_str:
        new_streak = current_streak
    elif last_checkin_date == yesterday_str:
        new_streak = current_streak + 1  # Continuous days! Increment streak!
    else:
        new_streak = 1  # Broken streak or first timer, start at 1

    # Update User Profile with new data
    users_collection.update_one(
        {"email": email},
        {"$set": {"streak": new_streak, "last_checkin_date": today_str}},
        upsert=True
    )

    # Save the formal daily check-in document log so status shows COMPLETED
    checkins_collection.update_one(
        {"email": email, "date": today_str},
        {"$set": {"confirmed_at": datetime.now(timezone.utc)}},
        upsert=True
    )

    return jsonify({
        "message": "Progress confirmed! Daily streak updated successfully.",
        "new_streak": new_streak
    }), 200