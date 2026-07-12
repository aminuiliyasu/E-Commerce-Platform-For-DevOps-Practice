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

Ubuntu/Debian blocks system-wide `pip install`. Use the setup script — it creates a venv for you.

```bash
cd infrastructure/cloud-atlas
./scripts/setup.sh        # once: venv + pip + npm
```

Then open **two terminals** from `infrastructure/cloud-atlas`:

```bash
# Terminal 1 — API on http://localhost:8090
./scripts/start-api.sh

# if you see "Address already in use":
./scripts/stop-api.sh && ./scripts/start-api.sh

# Terminal 2 — UI on http://localhost:5190
./scripts/start-web.sh
```

Open http://localhost:5190 in your browser.

### Configure AWS first

```bash
cp .env.example .env
```

Edit `.env`:

```env
AWS_PROFILE=default
AWS_REGION=eu-central-1
TF_STATE_BUCKET=your-terraform-state-bucket
TF_STATE_KEY=ecommerce/dev/terraform.tfstate
```

Verify credentials:

```bash
aws sts get-caller-identity
```

### Manual commands (if you prefer)

```bash
cd infrastructure/cloud-atlas
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=.
python -m api.main
```

**Important:** run API commands from `infrastructure/cloud-atlas`, not from `web/`.

## Security

- Read-only AWS access (`Describe*`, `List*`, `Get*` only)
- Credentials read from local AWS profile — never sent to a server
- Terraform state loaded from your configured S3 backend
