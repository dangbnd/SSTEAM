import json
import os
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables if available
load_dotenv()

# MongoDB Configuration
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'stem_steam_education')
EXPORT_DIR = 'exports'

class MongoEncoder(json.JSONEncoder):
    """ Custom encoder to handle MongoDB specific types like ObjectId and datetime """
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(MongoEncoder, self).default(obj)

def export_mongodb_to_json():
    try:
        # Create export directory if it doesn't exist
        if not os.path.exists(EXPORT_DIR):
            os.makedirs(EXPORT_DIR)
            print(f"Created directory: {EXPORT_DIR}")

        # Connect to MongoDB
        print(f"Connecting to MongoDB at: {MONGO_URI}")
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]

        # Get list of all collections
        collections = db.list_collection_names()
        
        if not collections:
            print(f"No collections found in database: {DB_NAME}")
            return

        print(f"Found {len(collections)} collections: {', '.join(collections)}")

        for collection_name in collections:
            print(f"Exporting collection: {collection_name}...", end=" ", flush=True)
            
            collection = db[collection_name]
            cursor = collection.find({})
            data = list(cursor)

            file_path = os.path.join(EXPORT_DIR, f"{collection_name}.json")
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, cls=MongoEncoder, ensure_ascii=False, indent=4)
            
            print(f"Done! ({len(data)} documents)")

        print("-" * 30)
        print(f"All data has been exported to the '{EXPORT_DIR}' folder.")

    except Exception as e:
        print(f"\nError: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    export_mongodb_to_json()
