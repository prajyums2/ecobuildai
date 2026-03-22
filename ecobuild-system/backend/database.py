from pymongo import MongoClient
from datetime import datetime
import os

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# MongoDB connection
MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'ecobuild')

class Database:
    def __init__(self):
        self.client = None
        self.db = None
        
    def connect(self):
        try:
            self.client = MongoClient(MONGO_URI)
            self.db = self.client[DB_NAME]
            # Test connection
            self.client.admin.command('ping')
            print(f"[OK] Connected to MongoDB at {MONGO_URI}")
            return True
        except Exception as e:
            print(f"[ERROR] MongoDB connection failed: {e}")
            print("[WARN] Running in fallback mode (data will not persist to database)")
            return False
    
    def get_db(self):
        if self.db is None:
            self.connect()
        return self.db
    
    def close(self):
        if self.client:
            self.client.close()

# Singleton instance
database = Database()

# Collection references
def get_users_collection():
    db = database.get_db()
    if db is None:
        return None
    return db.users

def get_projects_collection():
    db = database.get_db()
    if db is None:
        return None
    return db.projects

def get_cost_tracking_collection():
    db = database.get_db()
    if db is None:
        return None
    return db.cost_tracking

def get_qc_checklists_collection():
    db = database.get_db()
    if db is None:
        return None
    return db.qc_checklists

def get_materials_collection():
    """Get materials collection"""
    db = database.get_db()
    if db is None:
        return None
    return db.materials

def get_suppliers_collection():
    """Get suppliers collection"""
    db = database.get_db()
    if db is None:
        return None
    return db.suppliers