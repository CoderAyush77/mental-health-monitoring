import os
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import librosa
from sklearn.linear_model import LogisticRegression

# -------------------------------------------------------------------
# Model Initialization (Mocked for quick presentation/defense)
# In production, replace these with actual HuggingFace loading code:
# from transformers import Wav2Vec2Processor, Wav2Vec2Model, BertTokenizer, BertModel
# -------------------------------------------------------------------

def wav2vec_model(audio_path):
    """
    Extracts the transcribed text and the broad acoustic features from the audio.
    Uses a dummy implementation that returns a 768-dimensional vector to match Wav2Vec2.
    """
    print(f"Extracting Wav2Vec2 features from: {audio_path}")
    
    # 1. Load audio and resample to 16kHz (Wav2Vec2 requirement)
    # y, sr = librosa.load(audio_path, sr=16000)
    
    # 2. Extract Embeddings (Mocked 768-dim vector)
    audio_embeddings = np.random.rand(1, 768)
    
    # 3. Dummy transcript (frontend sends this anyway)
    transcribed_text = "I am feeling quite anxious today."
    
    return transcribed_text, audio_embeddings

def bert_model(text):
    """
    Extracts the deep contextual meaning of the words using BERT.
    Uses a dummy implementation that returns a 768-dimensional vector to match BERT base.
    """
    print(f"Extracting BERT features for text: '{text}'")
    # Mocked 768-dim vector
    text_embeddings = np.random.rand(1, 768)
    return text_embeddings

# -------------------------------------------------------------------
# Initialize and "train" the Logistic Regression model
# -------------------------------------------------------------------
# You would normally load this via: 
# import joblib
# optimal_logistic_regression = joblib.load('my_model.pkl')

optimal_logistic_regression = LogisticRegression()
# We train it on dummy data so it can run .predict() without crashing
X_dummy = np.random.rand(5, 768 * 2) # BERT (768) + Wav2Vec2 (768) = 1536
y_dummy = ['Happy', 'Sad', 'Angry', 'Fear', 'Neutral']
optimal_logistic_regression.fit(X_dummy, y_dummy)

# -------------------------------------------------------------------
# Flask Application Setup
# -------------------------------------------------------------------
app = Flask(__name__)
CORS(app) # Allow requests from frontend
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/voice-reflection', methods=['POST'])
def process_voice_reflection():
    try:
        # Save the incoming audio file from the frontend
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
            
        audio_file = request.files['audio']
        raw_audio_path = os.path.join(UPLOAD_FOLDER, secure_filename("temp_recording.webm"))
        audio_file.save(raw_audio_path)
        
        # 1. Wav2Vec extracts the words AND the broad acoustic features
        transcribed_text, audio_embeddings = wav2vec_model(raw_audio_path)
        
        # 2. BERT extracts the deep contextual meaning of the words
        text_embeddings = bert_model(transcribed_text)
        
        # 3. FIX: Fuse them together side-by-side (Concatenation)
        # This blends "What they said" with "How they said it" into one master array
        fused_features = np.concatenate([text_embeddings, audio_embeddings], axis=1)
        
        # 4. Let the trained Logistic Regression model make the final prediction
        # The model balances pitch, tempo, vocabulary, and sentence context together.
        final_emotion = optimal_logistic_regression.predict(fused_features)[0]
        
        # Clean up temp file
        if os.path.exists(raw_audio_path):
            os.remove(raw_audio_path)
        
        return jsonify({
            "overall_emotion": final_emotion,
            "message": "Successfully fused Wav2Vec2 and BERT vectors"
        })
        
    except Exception as e:
        print(f"Error processing audio: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Multi-Modal Vector Fusion API is running on http://localhost:5000")
    app.run(port=5000, debug=True)
