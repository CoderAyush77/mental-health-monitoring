import joblib
import os

import numpy as np
from scipy.sparse import hstack,csr_matrix
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer

model = joblib.load(r"C:\Users\ghimi\OneDrive\Documents\Programming\project\stress_model.pkl")
vectorizer = joblib.load(r"C:\Users\ghimi\OneDrive\Documents\Programming\project\tfidf_vectorizer.pkl")

sia=SentimentIntensityAnalyzer()

def predict_stress(text):
    scores=sia.polarity_scores(text)
    vader_feats = np.array([[
        scores["compound"],
        scores["neg"],
        scores["pos"],
        scores["neu"],
        
            ]])
    text_vec = vectorizer.transform([text])

    X_input = hstack([text_vec, csr_matrix(vader_feats)])
    print("Compound:",scores["compound"]) 

    prediction = model.predict(X_input)
    return prediction[0]


print(predict_stress("I feel happy and relaxed"))
print(predict_stress("The past five days have been very stressful for me. I have been dealing with multiple deadlines and a heavy workload, which has made it difficult to relax. I constantly feel pressured to finish tasks on time, and even when I take breaks, I keep thinking about unfinished work. My sleep has been poor, and I often wake up feeling tired and worried about the day ahead. I have also found it difficult to concentrate, and small problems seem more overwhelming than usual. Overall, I have felt tense, exhausted, and mentally drained throughout the week"))

print(predict_stress(" I want to die. I cannot survive"))
