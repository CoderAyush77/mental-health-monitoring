import os
import shutil

base_dir = r"c:\Users\ADMIN\Desktop\Minor Project"
features_dir = os.path.join(base_dir, "features")

# Ensure features directory exists
os.makedirs(features_dir, exist_ok=True)

mappings = {
    "dashboard": [
        "assets/css/index.css",
        "assets/js/index.js"
    ],
    "auth": [
        "pages/login.html",
        "assets/css/login.css",
        "assets/js/login.js",
        "pages/signup.html",
        "assets/js/signup.js"
    ],
    "journal": [
        "pages/journal.html",
        "assets/css/journal.css",
        "assets/js/journal.js",
        "assets/css/JournalVoice.css"
    ],
    "voice-reflection": [
        "pages/voice-reflection.html",
        "assets/css/voice-reflection.css",
        "assets/js/voice-reflection.js",
        "assets/js/VoiceRecorder.js",
        "assets/js/AudioAnalyzer.js",
        "assets/js/ToneAnalyzer.js",
        "assets/js/WaveformVisualizer.js",
        "assets/css/emotion-analysis.css"
    ],
    "chatbot": [
        "pages/chatbot.html",
        "assets/css/chatbot.css",
        "assets/js/chatbot.js"
    ],
    "analytics": [
        "pages/analytics.html",
        "assets/css/analytics.css"
    ],
    "settings": [
        "pages/settings.html",
        "assets/css/settings.css",
        "assets/js/settings.js"
    ],
    "help": [
        "pages/help.html",
        "assets/css/help.css",
        "assets/js/help.js"
    ],
    "breathing": [
        "pages/breathing.html",
        "assets/css/breathing.css",
        "assets/js/breathing.js"
    ],
    "meditation": [
        "pages/meditation.html",
        "assets/css/meditation.css",
        "assets/js/meditation.js"
    ]
}

# 1. Create directories and move files
for feature, files in mappings.items():
    feature_path = os.path.join(features_dir, feature)
    os.makedirs(feature_path, exist_ok=True)
    for file in files:
        src = os.path.join(base_dir, file.replace('/', '\\'))
        dst = os.path.join(feature_path, os.path.basename(file))
        if os.path.exists(src):
            shutil.move(src, dst)

# 2. String Replacements in HTML and JS
replacements = {
    "assets/css/index.css": "features/dashboard/index.css",
    "pages/login.html": "features/auth/login.html",
    "pages/journal.html": "features/journal/journal.html",
    "pages/voice-reflection.html": "features/voice-reflection/voice-reflection.html",
    "pages/chatbot.html": "features/chatbot/chatbot.html",
    "pages/analytics.html": "features/analytics/analytics.html",
    "pages/settings.html": "features/settings/settings.html",
    "pages/help.html": "features/help/help.html",
    "pages/breathing.html": "features/breathing/breathing.html",
    "pages/meditation.html": "features/meditation/meditation.html",
    "pages/signup.html": "features/auth/signup.html",
    "assets/js/index.js": "features/dashboard/index.js",

    "../assets/css/index.css": "../../features/dashboard/index.css",
    "../assets/css/login.css": "../auth/login.css",
    "../assets/css/signup.css": "../auth/signup.css",
    "../assets/css/journal.css": "../journal/journal.css",
    "../assets/css/JournalVoice.css": "../journal/JournalVoice.css",
    "../assets/css/voice-reflection.css": "../voice-reflection/voice-reflection.css",
    "../assets/css/emotion-analysis.css": "../voice-reflection/emotion-analysis.css",
    "../assets/css/chatbot.css": "../chatbot/chatbot.css",
    "../assets/css/analytics.css": "../analytics/analytics.css",
    "../assets/css/settings.css": "../settings/settings.css",
    "../assets/css/help.css": "../help/help.css",
    "../assets/css/breathing.css": "../breathing/breathing.css",
    "../assets/css/meditation.css": "../meditation/meditation.css",
    
    "../assets/js/index.js": "../../features/dashboard/index.js",
    "../assets/js/login.js": "../auth/login.js",
    "../assets/js/signup.js": "../auth/signup.js",
    "../assets/js/journal.js": "../journal/journal.js",
    "../assets/js/voice-reflection.js": "../voice-reflection/voice-reflection.js",
    "../assets/js/VoiceRecorder.js": "../voice-reflection/VoiceRecorder.js",
    "../assets/js/AudioAnalyzer.js": "../voice-reflection/AudioAnalyzer.js",
    "../assets/js/ToneAnalyzer.js": "../voice-reflection/ToneAnalyzer.js",
    "../assets/js/WaveformVisualizer.js": "../voice-reflection/WaveformVisualizer.js",
    "../assets/js/chatbot.js": "../chatbot/chatbot.js",
    "../assets/js/settings.js": "../settings/settings.js",
    "../assets/js/help.js": "../help/help.js",
    "../assets/js/breathing.js": "../breathing/breathing.js",
    "../assets/js/meditation.js": "../meditation/meditation.js",

    "../index.html": "../../index.html",
    "../assets/images/": "../../assets/images/",
    
    "journal.html": "../journal/journal.html",
    "voice-reflection.html": "../voice-reflection/voice-reflection.html",
    "chatbot.html": "../chatbot/chatbot.html",
    "analytics.html": "../analytics/analytics.html",
    "settings.html": "../settings/settings.html",
    "help.html": "../help/help.html",
    "login.html": "../auth/login.html",
    "signup.html": "../auth/signup.html",
    "breathing.html": "../breathing/breathing.html",
    "meditation.html": "../meditation/meditation.html",
}

# Special JS redirect replacements
js_replacements = {
    "window.location.href = '../index.html';": "window.location.href = '../../index.html';",
    "window.location.href = 'journal.html';": "window.location.href = '../journal/journal.html';",
    "window.location.href = 'login.html';": "window.location.href = '../auth/login.html';",
    "window.location.href = '../pages/login.html';": "window.location.href = '../auth/login.html';",
}

def process_file(filepath, is_js=False):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        if os.path.basename(filepath) == "index.html" and (old.startswith("../") or (old.endswith(".html") and not "/" in old)):
            # Skip depth 2 replacements and bare html file links for root index.html
            continue
        # Also, do not do bare .html replacements in JS files to avoid double replacement, 
        # except for what js_replacements handles.
        if is_js and old.endswith(".html") and not "/" in old:
            continue
        new_content = new_content.replace(old, new)
        
    if is_js:
        for old, new in js_replacements.items():
            new_content = new_content.replace(old, new)
            
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

# Apply to all files in features/
for root, _, files in os.walk(features_dir):
    for file in files:
        if file.endswith('.html') or file.endswith('.js'):
            process_file(os.path.join(root, file), is_js=file.endswith('.js'))

# Apply to index.html
if os.path.exists(os.path.join(base_dir, "index.html")):
    process_file(os.path.join(base_dir, "index.html"), is_js=False)

print("Done")
