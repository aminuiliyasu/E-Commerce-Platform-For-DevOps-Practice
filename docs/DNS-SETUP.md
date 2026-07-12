# DNS & Domain Setup

Your main site `aminuiliyasu.com` stays on **Hostinger** (static). Two new subdomains point to AWS.

| Subdomain | Purpose | Points to |
|-----------|---------|-----------|
| `e-commerce-practice.aminuiliyasu.com` | E-commerce app (EKS + ALB + CloudFront) | AWS after Terraform + Helm deploy |
| `awsvisualizer.aminuiliyasu.com` | Cloud Atlas visualizer | AWS container (EC2/ECS/App Runner) |

---

## Step 1 — Hostinger DNS records

Log in to **Hostinger → Domains → aminuiliyasu.com → DNS / DNS Zone**.

Add these records **after** you have the AWS target hostnames (from Terraform outputs or your deploy).

### Cloud Atlas visualizer

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `awsvisualizer` | `<your-atlas-alb-or-app-runner-url>` | 300 |

Example: `awsvisualizer` → `atlas-123456.eu-central-1.elb.amazonaws.com`

If using an Elastic IP on EC2 instead of ALB:

| Type | Name | Value |
|------|------|-------|
| A | `awsvisualizer` | `203.0.113.50` |

### E-commerce practice app

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `e-commerce-practice` | `<cloudfront-domain>.cloudfront.net` | 300 |

Optional admin subdomain:

| Type | Name | Value |
|------|------|-------|
| CNAME | `admin.e-commerce-practice` | same CloudFront or separate ALB |

**Note:** CNAME at apex (`aminuiliyasu.com`) is not used — your main site stays as-is on Hostinger.

---

## Step 2 — Terraform domains (e-commerce)

In `infrastructure/terraform/environments/dev/terraform.tfvars`:

```hcl
enable_edge = true   # after ALB ingress is live

domain_name       = "e-commerce-practice.aminuiliyasu.com"
admin_domain_name = "admin.e-commerce-practice.aminuiliyasu.com"
hosted_zone_name  = "aminuiliyasu.com."   # only if using Route53; skip if Hostinger DNS only

origin_domain_name = "<alb-dns-from-eks-ingress>"
```

If DNS stays on **Hostinger only** (not Route53), keep `enable_edge` modules for ACM/CloudFront but add DNS records manually in Hostinger pointing to CloudFront.

---

## Step 3 — Deploy Cloud Atlas to AWS

```bash
cd infrastructure/cloud-atlas
docker build -t cloud-atlas .
```

Run on AWS via one of:

- **App Runner** (simplest) — push image to ECR, create App Runner service, map custom domain `awsvisualizer.aminuiliyasu.com`
- **ECS Fargate + ALB** — production-grade
- **EC2 + Docker** — `docker run -p 80:8090 cloud-atlas` behind ALB

After deploy, copy the public URL into Hostinger CNAME for `awsvisualizer`.

---

## Step 4 — HTTPS

- **Cloud Atlas on ALB/App Runner:** attach ACM certificate for `awsvisualizer.aminuiliyasu.com` in `eu-central-1`
- **E-commerce on CloudFront:** ACM cert in `us-east-1` (already in your Terraform `acm` module when `enable_edge = true`)

---

## Step 5 — Verify

```bash
dig awsvisualizer.aminuiliyasu.com
dig e-commerce-practice.aminuiliyasu.com
curl -I https://awsvisualizer.aminuiliyasu.com/health
```

---

## User flow (Cloud Atlas)

1. User opens `https://awsvisualizer.aminuiliyasu.com`
2. Enters AWS Access Key + Secret (read-only IAM recommended)
3. Optionally adds Terraform state bucket/key
4. Clicks **Connect & Visualize**
5. Sees full AWS map — credentials stay in server memory only (1 hour), never saved
