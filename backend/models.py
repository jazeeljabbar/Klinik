import os
from google.cloud import firestore

# Local development uses GOOGLE_APPLICATION_CREDENTIALS if present.
# Cloud Run uses Application Default Credentials implicitly.
class _SafeDummyCollection:
    def document(self, *args, **kwargs):
        return self
    def where(self, *args, **kwargs):
        return self
    def order_by(self, *args, **kwargs):
        return self
    def limit(self, *args, **kwargs):
        return self
    def get(self, *args, **kwargs):
        return []
    @property
    def exists(self):
        return False
    def to_dict(self):
        return {}

class _SafeDummyDB:
    def collection(self, name):
        return _SafeDummyCollection()
    def transaction(self, *args, **kwargs):
        pass


def is_loopback_host(host_str):
    if not host_str:
        return False
    host = host_str.split(":")[0].strip().lower()
    return host in ("127.0.0.1", "localhost", "::1")

def init_firestore_client(environ=None):
    env = environ if environ is not None else os.environ
    emulator_host = env.get("FIRESTORE_EMULATOR_HOST")
    offline_testing = env.get("KLINIK_OFFLINE_TESTING") == "1"

    # 1. Emulator mode: Enforce strict loopback, demo project, and anonymous credentials
    if emulator_host:
        if not is_loopback_host(emulator_host):
            raise ValueError(f"Security violation: FIRESTORE_EMULATOR_HOST must be a loopback address (127.0.0.1, localhost, ::1), got '{emulator_host}'")
        project_id = env.get("GOOGLE_CLOUD_PROJECT", "demo-klinik-review")
        if not project_id.startswith("demo-"):
            raise ValueError(f"Security violation: Emulator mode requires a 'demo-*' project ID (e.g. 'demo-klinik-review'), got '{project_id}'")
        database_id = env.get("FIRESTORE_DATABASE_ID", "klinikdb")
        
        import google.auth.credentials
        client = firestore.Client(
            project=project_id,
            database=database_id,
            credentials=google.auth.credentials.AnonymousCredentials()
        )
        print(f"[+] Firestore emulator initialized (Project: {project_id}, Database: {database_id}, Host: {emulator_host}).")
        return client

    # 2. Explicit offline test mode: Only activated when explicitly opted into via KLINIK_OFFLINE_TESTING=1
    if offline_testing:
        print("[!] KLINIK_OFFLINE_TESTING=1: Using isolated test double.")
        return _SafeDummyDB()

    # 3. Production / default mode: Must raise clear error on failure and stop startup
    project_id = env.get("GOOGLE_CLOUD_PROJECT", "klinik-ai-499720")
    database_id = env.get("FIRESTORE_DATABASE_ID", "klinikdb")
    try:
        client = firestore.Client(project=project_id, database=database_id)
        print(f"[+] Firestore initialized successfully (Project: {project_id}, Database: {database_id}).")
        return client
    except Exception as e:
        print(f"[-] Fatal: Firestore initialization failed: {e}")
        raise RuntimeError(f"Firestore initialization failed: {e}") from e

db = init_firestore_client()
users_collection = db.collection('users')
histories_collection = db.collection('histories')
pending_scans_collection = db.collection('pending_scans')

def serialize_doc(doc):
    if not doc or not doc.exists:
        return None
        
    serialized = doc.to_dict()
    serialized['id'] = doc.id
    
    if '_id' in serialized:
        del serialized['_id']
        
    return serialized
