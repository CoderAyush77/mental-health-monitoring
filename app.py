from flask import Flask ,jsonify
from flask_cors import CORS
from routes.auth import auth_bp #importing the authentication blueprint
from routes.settings import settings_bp
from routes.journal import journal_bp
from routes.dashboard import dashboard_bp
from routes.voice import voice_bp

app=Flask(__name__) #initiaing the flask app
CORS(app) #enabling CORS for the app

app.register_blueprint(auth_bp) #registering the authentication blueprint with the main app
app.register_blueprint(settings_bp)
app.register_blueprint(journal_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(voice_bp)

@app.route('/')
def home():
    return jsonify({'message':'Server is running!'})

if __name__=='__main__': #turns the server ON
  app.run(debug=True , port=5000)#debug=True means the server will auto-restart when you save changes