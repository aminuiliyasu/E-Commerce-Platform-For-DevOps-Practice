# Cloud Atlas

Google Maps for AWS infrastructure — live discovery, Terraform correlation, and answer-first awareness.

Terraform creates infrastructure. Cloud Atlas helps you **understand** it: what's public, what breaks if you delete something, what's drifted, and what changed.

## What it answers

- What do I own?
- What is public?
- What could break if I delete this?
- Which resources aren't managed by Terraform?
- Which Terraform module created this?
- Where are my security risks?
- How does traffic flow?

## Architecture

```
Terraform State + AWS APIs
         │
         ▼
   Scanner + Correlator
         │
         ▼
   Graph Engine + Rules
         │
         ▼
   FastAPI  →  React Map UI
```

## Quick start

```bash
# uses your local ~/.aws/credentials or aws sso login — keys never stored in the app
cd infrastructure/cloud-atlas
cp .env.example .env
pip install -r requirements.txt
python -m scanner.run          # discover aws resources
python -m api.main             # start api on :8090
cd web && npm install && npm run dev   # ui on :5190
```

## Security

- Read-only AWS access (`Describe*`, `List*`, `Get*` only)
- Credentials read from local AWS profile — never sent to a server
- Terraform state loaded from your configured S3 backend
