# ThreatGuard: Agentic Threat Modeling & Production Security Studio

A production-grade, full-stack application built to enforce and operationalize the **Production Directives**:
1. **Agentic Threat Modeling**: Structured 5-zone risk-to-countermeasure analysis (Input Surfaces, Planning & Reasoning, Tool Execution, Memory & State, Inter-System Communication).
2. **Secure Coding Standard**: OWASP Top 10 Web & OWASP LLM Top 10 mitigations, indirect prompt injection defense, broken access control prevention, and safe output encoding.
3. **Secure Firestore & Firebase Auth**: Zero insecure defaults, strict owner-bound data isolation (`request.auth.uid == userId`), RBAC, and federated auth integrity.
4. **Secret Management & Zero-Hardcoding**: Secret Manager bindings, zero hardcoded credentials, and runtime environment variable injection.
5. **Security Reviewer Persona**: Data flow inspection, function-boundary authorization validation, and unified diff remediation patches.
6. **Functional Stability & Resilient Gemini Ladder**: Fallback ladder (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`), top-level request deserialization, null-safe payload ingestion, undefined-stripping payload hygiene, and guaranteed input-to-save persistence.
7. **Production Deployment & Campaign Verification**: Automated deployment scripts and mandatory Cloud Run campaign verification labeling.

---

## 1. Prerequisites & Environment Setup

Ensure the Google Cloud SDK (`gcloud`) is installed and authenticated to your target Google Cloud project:

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export REGION="asia-southeast1" # or us-central1
gcloud config set project $PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

---

## 2. Secret Management Setup (Zero-Hardcoding Hygiene)

Do NOT hardcode API keys or secrets in source code or Dockerfiles. Store the Gemini API key in Google Cloud Secret Manager and grant the Cloud Run runtime service account permission to read it.

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Retrieve your project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# 3. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Cloud Firestore)

Deploy secure, owner-bound security rules to ensure user data isolation:

### `firestore.rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Cloud Run Deployment Flow

Build and deploy the application container directly to Google Cloud Run, mounting the `GEMINI_API_KEY` secret as an environment variable:

```bash
# Deploy from source using Cloud Build and Cloud Run
gcloud run deploy threatguard-app \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

---

## 5. Mandatory Campaign Labeling (Challenge Verification)

Apply the required challenge verification resource label to register the deployed Cloud Run service for automated verification:

```bash
gcloud run services update threatguard-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

Verify that the label has been successfully applied:
```bash
gcloud run services describe threatguard-app \
  --region=$REGION \
  --format="value(metadata.labels)"
```

---

## 6. Architecture & Gemini Resilient Fallback Ladder

The server encapsulates all AI interactions using `@google/genai` on the backend, adhering to a 4-tier fallback ladder with automated HTTP error status recovery (`503`, `429`, `404`, `500`):

```
1. Primary:                 gemini-3.6-flash
2. High-Availability:       gemini-3.1-flash-lite
3. Dynamic Alias:           gemini-flash-latest
4. Deep Reasoning Fallback: gemini-3.7-flash
```

All incoming requests pass through top-level deserialization before route registration, payload inputs are sanitized with null-safe destructuring, and all persisted data structures undergo strict undefined-stripping (`stripUndefined`) prior to storage.
