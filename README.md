# KliniK / SKIN AI

## Local Setup Instructions

For local development, you must configure the following environment variables to connect to the Firebase project:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/firebase-credentials.json"
export GOOGLE_CLOUD_PROJECT="klinik-ai-499720"
export FIRESTORE_DATABASE_ID="klinikdb"
```

Place the `firebase-credentials.json` file in the root of the project or backend folder, but **do not commit it** to version control. The `.gitignore` has been updated to ignore this file.

## Running Tests Locally (Offline Mode)

To run the local unit and contract tests in complete isolation without connecting to Cloud Firestore:

```bash
KLINIK_OFFLINE_TESTING=1 PYTHONPATH=backend backend/venv/bin/python -m unittest discover -s backend/tests -v
```
