from pymongo import MongoClient

#let's connect to the MongoDB server
client=MongoClient('mongodb://localhost:27017/') 
db=client['serenemind_db'] #created a database named as serenemind_db
users_collection=db['users'] #created a collection named as users

journals_collection=db['journals'] #created a collection to stores journals
checkins_collection=db['checkins'] #created a collection to stores checkins
voice_collection = db['voice_reflections'] # Collection specifically for voice logs
