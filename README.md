# E-Commerce Platform for DevOps Practice

A production-oriented e-commerce platform built to demonstrate modern application design and AWS DevOps practices. The project includes a customer-facing storefront, an administrative dashboard, a modular Spring Boot backend, and a phased path to deploy on AWS at `ecommerce.aminuiliyasu.com`.

**Target scale:** 10,000–100,000 daily users  
**Architecture approach:** Modular monolith first, cloud-native deployment on AWS

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Backend Design](#backend-design)
- [Frontend Design](#frontend-design)
- [Data Architecture](#data-architecture)
- [API Overview](#api-overview)
- [Security](#security)
- [Local Development](#local-development)
- [Build Phases](#build-phases)
- [AWS Infrastructure](#aws-infrastructure)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring and Observability](#monitoring-and-observability)
- [Backup and Disaster Recovery](#backup-and-disaster-recovery)
- [Domain and DNS Configuration](#domain-and-dns-configuration)
- [Cost Considerations](#cost-considerations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This platform is designed in two layers:

1. **Application layer** — Customer site, admin site, and Spring Boot API with clear module boundaries.
2. **Infrastructure layer** — AWS resources provisioned with Terraform, deployed to Amazon EKS, and delivered through CloudFront with automated CI/CD.

The application is intentionally built as a **modular monolith**. Each business domain lives in its own Maven module with explicit boundaries, which keeps operational complexity low while still allowing future extraction into microservices if a specific domain requires independent scaling.

---

## Features

### Customer Site

- Product browsing with categories, filters, sorting, and search
- Product detail pages with variants, images, and reviews
- Shopping cart (guest and authenticated users)
- Checkout with address management and order confirmation
- Order history and status tracking
- User registration, login, and profile management
- Product reviews and ratings

### Admin Site

- Dashboard with revenue, order volume, and inventory alerts
- Product and category management (CRUD, bulk operations)
- Order management with status updates
- Customer account management
- Inventory and stock level control
- Coupon and promotion management
- Review moderation queue
- Store configuration settings

### Platform Capabilities

- JWT-based authentication with role-based access control
- Async event processing via RabbitMQ (order confirmations, notifications)
- Redis-backed cart and session caching
- OpenAPI documentation
- Health and readiness endpoints for Kubernetes
- Docker-based local development environment

---

## Technology Stack

### Application

| Layer | Technology |
|-------|------------|
| Backend | Java 21, Spring Boot 3.x, Spring Security, Spring Data JPA |
| Customer Frontend | React 18, TypeScript, Vite, TanStack Query, Tailwind CSS |
| Admin Frontend | React 18, TypeScript, Vite, TanStack Query, Tailwind CSS |
| API Documentation | SpringDoc OpenAPI (Swagger UI) |
| Database Migrations | Flyway |

### Data Stores

| Store | Purpose |
|-------|---------|
| MySQL 8 | Users, orders, payments, inventory, coupons |
| MongoDB | Product catalog, categories, reviews |
| Redis | Cart, session cache, rate limiting, hot product cache |
| RabbitMQ | Async events (orders, notifications, inventory sync) |

### Infrastructure (Target Production Environment)

| Component | Service |
|-----------|---------|
| Container Orchestration | Amazon EKS |
| Container Registry | Amazon ECR |
| Load Balancing | Application Load Balancer (ALB) |
| CDN and Edge Security | Amazon CloudFront, AWS WAF |
| DNS | Amazon Route 53 |
| Relational Database | Amazon RDS for MySQL (Multi-AZ) |
| Cache | Amazon ElastiCache for Redis |
| Message Broker | Amazon MQ (managed RabbitMQ) |
| Document Database | MongoDB Atlas (VPC peering) |
| Object Storage | Amazon S3 |
| Secrets | AWS Secrets Manager + External Secrets Operator |
| Infrastructure as Code | Terraform |
| CI/CD | Jenkins (GitFlow branching strategy) |
| Monitoring | Prometheus, Grafana, Amazon CloudWatch |
| Security Scanning | Trivy, OWASP Dependency-Check, ECR image scanning |

---

## Repository Structure

```
ecommerce-platform/
├── backend/
│   ├── ecommerce-parent/          # Maven parent POM
│   ├── ecommerce-common/          # Shared DTOs, exceptions, utilities
│   ├── ecommerce-security/        # JWT, filters, RBAC
│   ├── ecommerce-user/            # Users, profiles, addresses
│   ├── ecommerce-catalog/         # Products, categories, search
│   ├── ecommerce-cart/            # Cart and wishlist
│   ├── ecommerce-order/           # Orders, checkout, fulfillment
│   ├── ecommerce-payment/         # Payment abstraction layer
│   ├── ecommerce-notification/    # Email and async notification consumers
│   ├── ecommerce-admin/           # Admin-specific APIs
│   └── ecommerce-api/             # Main Spring Boot application entry point
├── frontend/
│   ├── customer-web/              # Public storefront
│   └── admin-web/                 # Administrative dashboard
├── infrastructure/
│   └── terraform/                 # IaC modules and environment configs
│       ├── backend.tf             # S3 state + DynamoDB lock
│       ├── modules/               # Reusable Terraform modules
│       └── environments/          # dev, staging, prod configs
├── docker/                        # Dockerfiles and compose configuration
├── k8s/
│   └── helm/                      # Helm charts for EKS deployments
├── jenkins/                       # Jenkins pipeline definitions
└── docs/                          # Supplementary documentation
```

---

## Backend Design

The backend follows a modular monolith pattern. Each module owns its domain logic, entities, repositories, and service layer. The `ecommerce-api` module assembles all modules into a single deployable JAR.

### Module Responsibilities

| Module | Responsibility | Primary Data Store |
|--------|---------------|-------------------|
| `ecommerce-common` | Shared models, error handling, utilities | — |
| `ecommerce-security` | Authentication, authorization, JWT management | — |
| `ecommerce-user` | Registration, login, profiles, addresses | MySQL |
| `ecommerce-catalog` | Products, variants, categories, images | MongoDB |
| `ecommerce-cart` | Guest and user carts, cart merge on login | Redis, MySQL |
| `ecommerce-order` | Checkout, order lifecycle, shipping status | MySQL |
| `ecommerce-payment` | Payment intents, webhooks, refunds | MySQL |
| `ecommerce-notification` | Async email and notification delivery | RabbitMQ |
| `ecommerce-admin` | Dashboard metrics, bulk operations, moderation | All stores (read) |
| `ecommerce-api` | Application bootstrap, configuration, controllers | — |

### Core Domain Entities

**MySQL (transactional data)**

- `users`, `roles`, `user_addresses`
- `orders`, `order_items`, `order_status_history`
- `payments`, `payment_transactions`
- `inventory`
- `coupons`, `coupon_usages`

**MongoDB (flexible document data)**

- `products` — title, description, attributes, images, tags
- `categories` — hierarchical category tree
- `reviews` — ratings, comments, moderation status

**Redis (ephemeral and cache data)**

- `cart:{userId}` / `cart:{sessionId}`
- `product:cache:{id}`
- `rate_limit:{ip}`
- `session:refresh:{tokenId}`

### Async Event Flow

Order confirmation triggers events through RabbitMQ:

1. `order.events` — consumed by the notification module for email delivery
2. `inventory.events` — consumed for idempotent stock decrement
3. `analytics.events` — reserved for future analytics pipeline integration

The outbox pattern is used to ensure that database writes and event publishing remain consistent.

---

## Frontend Design

### Customer Web (`frontend/customer-web`)

**Pages**

| Page | Description |
|------|-------------|
| Home | Featured products, promotional banners, category navigation |
| Product Listing | Filters, sorting, pagination, search results |
| Product Detail | Image gallery, variant selection, reviews, add to cart |
| Cart | Quantity updates, coupon application, checkout entry |
| Checkout | Address selection, shipping method, order summary |
| Orders | Order history with status tracking |
| Profile | Account details and address management |
| Auth | Login, registration, password recovery |

**Project structure**

```
src/
├── api/           # Domain-specific API clients
├── components/    # Shared UI components
├── features/      # Feature modules (product, cart, checkout, auth)
├── hooks/         # Custom React hooks
├── layouts/       # Page layouts (main, auth)
├── pages/         # Route-level page components
├── store/         # Client-side state management
├── types/         # TypeScript type definitions
└── utils/         # Helper functions
```

### Admin Web (`frontend/admin-web`)

**Sections**

| Section | Description |
|---------|-------------|
| Dashboard | Revenue charts, order funnel, low-stock alerts |
| Products | CRUD operations, image management, bulk upload |
| Categories | Hierarchical category editor |
| Orders | Filtering, status updates, refund initiation |
| Customers | Account listing, activity view, account suspension |
| Inventory | Stock levels and restock management |
| Coupons | Promotion creation and usage tracking |
| Reviews | Moderation queue with approve/reject actions |
| Settings | Store configuration, shipping rules, tax settings |

The admin application is deployed as a separate frontend artifact with its own authentication entry point and stricter access controls.

---

## Data Architecture

| Data Type | Store | Rationale |
|-----------|-------|-----------|
| Orders, payments, users | MySQL | ACID compliance for financial and identity data |
| Product catalog, reviews | MongoDB | Flexible schemas for varied product attributes |
| Cart, sessions, cache | Redis | Low-latency reads/writes for ephemeral state |
| Domain events | RabbitMQ | Decoupled async processing between modules |
| Product images | S3 + CloudFront | Offload static asset delivery from the API |

---

## API Overview

All endpoints are versioned under `/api/v1`. Error responses follow a consistent format:

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "Product not found",
  "timestamp": "2026-07-09T12:00:00Z",
  "path": "/api/v1/products/invalid-slug"
}
```

### Customer Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/products
GET    /api/v1/products/{slug}
GET    /api/v1/categories

GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/{id}
DELETE /api/v1/cart/items/{id}

POST   /api/v1/checkout/preview
POST   /api/v1/checkout/confirm

GET    /api/v1/orders
GET    /api/v1/orders/{id}

GET    /api/v1/profile
PUT    /api/v1/profile
GET    /api/v1/addresses
POST   /api/v1/addresses
PUT    /api/v1/addresses/{id}
DELETE /api/v1/addresses/{id}

POST   /api/v1/products/{id}/reviews
```

### Admin Endpoints

All admin routes require the `ADMIN` or `SUPER_ADMIN` role and are prefixed with `/api/v1/admin`.

```
GET    /api/v1/admin/dashboard/metrics

GET    /api/v1/admin/products
POST   /api/v1/admin/products
PUT    /api/v1/admin/products/{id}
DELETE /api/v1/admin/products/{id}

GET    /api/v1/admin/categories
POST   /api/v1/admin/categories
PUT    /api/v1/admin/categories/{id}
DELETE /api/v1/admin/categories/{id}

GET    /api/v1/admin/orders
PATCH  /api/v1/admin/orders/{id}/status

GET    /api/v1/admin/users
PATCH  /api/v1/admin/users/{id}/status

GET    /api/v1/admin/inventory
PATCH  /api/v1/admin/inventory/{sku}

GET    /api/v1/admin/coupons
POST   /api/v1/admin/coupons
PUT    /api/v1/admin/coupons/{id}
DELETE /api/v1/admin/coupons/{id}

GET    /api/v1/admin/reviews
PATCH  /api/v1/admin/reviews/{id}/moderate
```

Interactive API documentation is available at `/api/docs` when the backend is running.

---

## Security

### Authentication and Authorization

- Passwords hashed with BCrypt
- Short-lived JWT access tokens (15 minutes) with refresh tokens (7 days)
- Role-based access control: `CUSTOMER`, `ADMIN`, `SUPER_ADMIN`
- Admin routes protected with `@PreAuthorize` annotations
- Separate login flows for customer and admin applications

### Application Security

- Input validation on all request DTOs
- CORS restricted to approved origins
- Rate limiting on authentication endpoints via Redis
- Idempotency keys on checkout and payment endpoints
- SQL injection and XSS protection through framework defaults and WAF rules

### Infrastructure Security

- AWS WAF attached to CloudFront (rate limiting, managed rule sets)
- All secrets stored in AWS Secrets Manager, injected via External Secrets Operator
- EKS pods use IAM Roles for Service Accounts (IRSA) — no static credentials
- RDS and ElastiCache in private subnets with security group restrictions
- ECR image scanning enabled on push
- VPC Flow Logs enabled for network audit
- TLS termination at CloudFront and ALB using ACM certificates

---

## Local Development

### Prerequisites

- Java 21
- Node.js 20+
- Docker and Docker Compose
- Maven 3.9+

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd E-Commerce-Platform-For-DevOps-Practice

# Start infrastructure services
docker compose up -d mysql mongo redis rabbitmq

# Start the backend
cd backend/ecommerce-api
mvn spring-boot:run

# Start the customer frontend
cd frontend/customer-web
npm install && npm run dev

# Start the admin frontend
cd frontend/admin-web
npm install && npm run dev
```

### Local Service Ports

| Service | Port |
|---------|------|
| Backend API | 8080 |
| Customer Web | 5173 |
| Admin Web | 5174 |
| MySQL | 3306 |
| MongoDB | 27017 |
| Redis | 6379 |
| RabbitMQ Management | 15672 |

### Environment Variables

Copy the example environment file and adjust values for your local setup:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description |
|----------|-------------|
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `MONGO_URI` | MongoDB connection string |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |
| `RABBITMQ_HOST` | RabbitMQ host |
| `JWT_SECRET` | Signing key for JWT tokens |
| `JWT_EXPIRATION` | Access token TTL in milliseconds |

---

## Build Phases

Development follows a phased approach. Infrastructure work begins after the application is functional locally.

### Phase 1 — Foundation

- Maven multi-module project skeleton
- User registration, login, and JWT authentication
- MySQL schema with Flyway migrations
- React application shells for customer and admin sites

### Phase 2 — Catalog and Cart

- MongoDB product catalog with category hierarchy
- Redis-backed shopping cart
- Customer product browsing and cart UI
- Admin product and category management

### Phase 3 — Orders and Checkout

- Checkout flow with address and payment summary
- Order creation with transactional integrity
- RabbitMQ event publishing with outbox pattern
- Email notifications for order confirmation
- Admin order management interface

### Phase 4 — Polish and Containerization

- Product reviews and coupon support
- Admin dashboard metrics
- Integration and API tests
- Docker images for all three applications
- Docker Compose full-stack local environment

### Phase 5 — Infrastructure (AWS)

- Terraform modules (VPC, security groups, ECR, RDS, ElastiCache, Amazon MQ, EKS, ALB, S3, IAM, ACM, Route 53, CloudFront, WAF)
- MongoDB Atlas cluster with VPC peering
- Helm charts for API and frontend deployments on EKS
- External Secrets Operator with AWS Secrets Manager
- Jenkins CI/CD pipeline with GitFlow
- Monitoring with Prometheus, Grafana, and CloudWatch
- Domain and TLS configuration for `ecommerce.aminuiliyasu.com`

---

## AWS Infrastructure

Infrastructure is provisioned with Terraform using a modular layout and separate environment configurations (`dev`, `staging`, `prod`). Start with the `dev` environment and promote the same modules to staging and production.

### Local to AWS Service Mapping

| Local (Docker Compose) | AWS Production |
|------------------------|----------------|
| `ecommerce-api` | EKS Deployment |
| `customer-web` | EKS Deployment (or S3 + CloudFront) |
| `admin-web` | EKS Deployment (or S3 + CloudFront) |
| `mysql` | Amazon RDS MySQL (Multi-AZ in prod) |
| `mongo` | MongoDB Atlas (VPC peering) |
| `redis` | Amazon ElastiCache for Redis |
| `rabbitmq` | Amazon MQ (RabbitMQ engine) |

### Terraform Layout

```
infrastructure/terraform/
├── backend.tf              # S3 state + DynamoDB lock
├── modules/
│   ├── vpc/
│   ├── security-groups/
│   ├── ecr/
│   ├── rds/
│   ├── elasticache/
│   ├── amazon-mq/
│   ├── eks/
│   ├── alb/
│   ├── s3/
│   ├── iam/
│   ├── route53/
│   ├── acm/
│   ├── cloudfront/
│   └── waf/
└── environments/
    ├── dev/
    ├── staging/
    └── prod/
```

Terraform state is stored in an S3 bucket with DynamoDB for state locking. Each environment directory contains its own `main.tf`, `variables.tf`, `terraform.tfvars`, and `outputs.tf` that compose modules from `modules/`.

### Module Provisioning Order

Build and apply modules in dependency order:

1. **vpc** — VPC, public/private subnets across 2 AZs, Internet Gateway, NAT Gateway
2. **security-groups** — Least-privilege groups for ALB, EKS nodes, RDS, ElastiCache, Amazon MQ
3. **ecr** — Container repositories for `ecommerce-api`, `customer-web`, `admin-web`
4. **rds** — MySQL 8 with automated backups
5. **elasticache** — Redis cluster for cart and session cache
6. **amazon-mq** — Managed RabbitMQ broker for async events
7. **s3** — Asset storage and Terraform state (bootstrap)
8. **iam** — EKS cluster roles, node roles, IRSA for pod-level AWS access
9. **eks** — Cluster and managed node group
10. **alb** — Application Load Balancer via AWS Load Balancer Controller
11. **acm** — TLS certificates (`us-east-1` for CloudFront, app region for ALB)
12. **route53** — DNS records for `ecommerce.aminuiliyasu.com`
13. **cloudfront** + **waf** — CDN, edge caching, and web application firewall

MongoDB Atlas is provisioned outside Terraform with VPC peering into the AWS VPC.

### Network Design

| Subnet type | Resources |
|-------------|-----------|
| Public | ALB, NAT Gateway |
| Private | EKS worker nodes, RDS, ElastiCache, Amazon MQ |

- VPC spans a minimum of two Availability Zones
- No public IPs on database or cache instances
- Security groups managed in a dedicated module with explicit ingress/egress rules
- VPC Flow Logs enabled for network audit

### Secrets and Configuration

Application secrets are stored in AWS Secrets Manager and injected into EKS pods via the External Secrets Operator:

| Variable | Storage |
|----------|---------|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD` | Secrets Manager |
| `MONGO_URI` | Secrets Manager |
| `JWT_SECRET` | Secrets Manager |
| `RABBITMQ_USER`, `RABBITMQ_PASSWORD` | Secrets Manager |
| `REDIS_HOST`, `RABBITMQ_HOST` | ConfigMap |

Secrets must never be committed to Git or stored in Terraform variable files.

### Kubernetes Layout

Helm charts live under `k8s/helm/`:

```
k8s/helm/
├── ecommerce-api/
├── customer-web/
└── admin-web/
```

| Deployment | Replicas | Notes |
|------------|----------|-------|
| `ecommerce-api` | 2–10 (HPA) | CPU target 70%, liveness/readiness via Actuator |
| `customer-web` | 2 | Nginx serving React production build |
| `admin-web` | 2 | Nginx serving React production build |
| `prometheus` | 1 | In-cluster metrics collection |
| `grafana` | 1 | Dashboards and alerting |

Kubernetes namespaces: `ecommerce-dev`, `ecommerce-staging`, `ecommerce-prod`, `monitoring`.

Ingress is managed through the AWS Load Balancer Controller:

| Host / Path | Service |
|-------------|---------|
| `ecommerce.aminuiliyasu.com/` | customer-web |
| `ecommerce.aminuiliyasu.com/api/*` | ecommerce-api |
| `admin.ecommerce.aminuiliyasu.com/` | admin-web |

### Request Flow

1. User requests `https://ecommerce.aminuiliyasu.com`
2. Route 53 resolves to the CloudFront distribution
3. AWS WAF inspects the request at the edge
4. CloudFront serves cached static assets or forwards dynamic requests to the ALB
5. ALB routes traffic to the EKS ingress controller
6. Ingress forwards to the appropriate service (customer-web, admin-web, or ecommerce-api)
7. API pods connect to RDS, ElastiCache, Amazon MQ, and MongoDB Atlas over private networking

### Environment Strategy

| Environment | Purpose | Sizing |
|-------------|---------|--------|
| dev | Development and learning | Single-AZ, smaller instances, 1 EKS node |
| staging | Pre-production validation | Reduced prod footprint |
| prod | Live traffic at `ecommerce.aminuiliyasu.com` | Multi-AZ, HPA, WAF enabled |

Estimated monthly cost: dev $80–150, staging $150–250, prod $300–800.

---

## CI/CD Pipeline

### Branching Strategy (GitFlow)

| Branch | Purpose |
|--------|---------|
| `main` | Production releases |
| `develop` | Integration branch |
| `feature/*` | New feature development |
| `release/*` | Release preparation and stabilization |
| `hotfix/*` | Urgent production fixes |

### Jenkins Pipeline Stages

1. **Checkout** — Clone repository from GitHub
2. **Test** — Run backend unit tests and frontend test suites
3. **Security Scan** — Trivy image scan, OWASP Dependency-Check
4. **Build** — Compile backend, build frontend production bundles
5. **Dockerize** — Build images and push to Amazon ECR
6. **Deploy Staging** — Apply Helm chart to staging namespace
7. **Integration Test** — Run smoke tests against staging environment
8. **Approval Gate** — Manual approval for production deployment
9. **Deploy Production** — Rolling update to production namespace
10. **Health Check** — Verify `/actuator/health` and frontend availability

Pipeline definitions are stored as `Jenkinsfile` in the repository root.

---

## Monitoring and Observability

### Metrics

- Spring Boot Actuator with Micrometer Prometheus registry
- JVM metrics, HTTP request latency, error rates, database connection pool stats
- Custom business metrics: orders per minute, cart abandonment rate, payment failure rate

### Dashboards

| Tool | Scope |
|------|-------|
| Grafana | Application and infrastructure dashboards |
| Amazon CloudWatch | AWS service metrics (RDS, EKS, ALB, ElastiCache) |
| Prometheus | In-cluster metrics collection |

### Alerting Rules

| Condition | Severity |
|-----------|----------|
| API p95 latency > 500ms | Warning |
| HTTP error rate > 1% | Critical |
| RDS CPU utilization > 80% | Warning |
| EKS pod restart count spike | Warning |
| ALB 5xx response count > threshold | Critical |
| Disk usage > 85% on RDS | Warning |

### Logging

- Application logs shipped to CloudWatch Logs via Fluent Bit
- Structured JSON logging with correlation IDs
- ALB access logs stored in S3
- VPC Flow Logs for network-level audit

### Distributed Tracing

OpenTelemetry instrumentation is planned for end-to-end request tracing across CloudFront, ALB, and Spring Boot services.

---

## Backup and Disaster Recovery

| Component | Strategy |
|-----------|----------|
| RDS MySQL | Automated daily snapshots, 7–35 day retention, cross-region copy |
| MongoDB Atlas | Continuous cloud backups with point-in-time recovery |
| S3 assets | Versioning enabled, cross-region replication for production bucket |
| Terraform state | S3 versioning with DynamoDB locking |
| EKS configuration | All manifests in Git (GitOps-ready) |

**Recovery objectives (target):**

- RPO (Recovery Point Objective): 1 hour
- RTO (Recovery Time Objective): 4 hours

DR procedures will be documented in `docs/disaster-recovery.md` as the infrastructure phase progresses.

---

## Domain and DNS Configuration

**Primary domain:** `aminuiliyasu.com`  
**Application subdomain:** `ecommerce.aminuiliyasu.com`

### DNS Records

| Record | Type | Target |
|--------|------|--------|
| `ecommerce.aminuiliyasu.com` | A (Alias) | CloudFront distribution |
| `admin.ecommerce.aminuiliyasu.com` | A (Alias) | CloudFront distribution |

### TLS Certificates

- ACM certificate for `ecommerce.aminuiliyasu.com`, `admin.ecommerce.aminuiliyasu.com`, and `*.aminuiliyasu.com`
- Certificate in `us-east-1` for CloudFront
- Certificate in the application region (e.g. `eu-central-1`) for the ALB

### CloudFront Cache Behavior

| Path pattern | Caching |
|--------------|---------|
| `/api/*` | No cache — forward all headers and cookies |
| `/assets/*`, `*.js`, `*.css` | Cache 1 day or more |
| Default (HTML/SPA) | Short TTL or no cache for `index.html` |

### Deployment Checklist

1. Bootstrap Terraform state (S3 bucket + DynamoDB lock table)
2. Verify domain ownership in Route 53 (or configure NS delegation from registrar)
3. Apply Terraform modules in order: VPC → security groups → ECR → RDS → ElastiCache → Amazon MQ → IAM → EKS → ALB
4. Provision MongoDB Atlas and configure VPC peering
5. Store secrets in AWS Secrets Manager and configure External Secrets Operator
6. Build and push container images to ECR
7. Deploy workloads to EKS via Helm
8. Request and validate ACM certificates
9. Apply CloudFront, WAF, and Route 53 modules
10. Point `ecommerce.aminuiliyasu.com` and `admin.ecommerce.aminuiliyasu.com` to CloudFront
11. Run smoke tests: HTTPS access, API health, authentication, test order placement
12. Enable CloudWatch alarms, backup policies, and WAF managed rules

---

## Cost Considerations

Estimated monthly cost by environment:

| Environment | Estimated cost |
|-------------|----------------|
| dev | $80–150 |
| staging | $150–250 |
| prod (10K–100K daily users) | $300–800 |

| Optimization | Impact |
|-------------|--------|
| Right-size EKS node groups and use HPA | Avoid idle compute |
| Use Amazon MQ instead of self-hosted RabbitMQ on EKS | Reduced operational overhead |
| MongoDB Atlas shared tier for dev/staging | Lower non-production costs |
| CloudFront caching for static assets | Reduced ALB and origin load |
| RDS Reserved Instances after sizing stabilizes | 30–40% savings on database |
| Single-AZ and smaller instances for dev/staging | Significant non-production savings |
| S3 Intelligent-Tiering for product images | Storage cost optimization |
| Shut down dev/staging outside working hours | Lower compute costs during learning |

Start with a minimal production footprint (2 API pods, 2 frontend replicas, `db.t3.medium` RDS Multi-AZ) and scale based on observed CloudWatch and Prometheus metrics.

---

## Roadmap

### Near Term

- [x] Backend multi-module project scaffold
- [x] Customer and admin React application shells
- [x] Docker Compose local development environment
- [x] User authentication and product catalog
- [x] Cart, checkout, and order management

### Medium Term

- [ ] Terraform modules (VPC, security-groups, ECR, RDS, ElastiCache, Amazon MQ, EKS, ALB, S3, IAM, ACM, Route 53, CloudFront, WAF)
- [ ] MongoDB Atlas with VPC peering
- [ ] Helm charts and EKS deployment
- [ ] External Secrets Operator with AWS Secrets Manager
- [ ] Jenkins pipeline with GitFlow
- [ ] Prometheus and Grafana monitoring stack

### Long Term

- [ ] Payment gateway integration (Stripe or Paystack)
- [ ] OpenSearch for advanced product search
- [ ] Admin MFA enforcement
- [ ] ArgoCD for GitOps-based deployments
- [ ] Karpenter for dynamic node provisioning
- [ ] Read replicas for MySQL reporting queries
- [ ] Feature flag system for gradual rollouts

---

## Contributing

1. Create a feature branch from `develop` using the `feature/` prefix
2. Follow existing code conventions and module boundaries
3. Write tests for new functionality
4. Submit a pull request to `develop`
5. Ensure CI pipeline passes before requesting review

### Code Conventions

- Backend: standard Java naming, constructor injection, module-level package isolation
- Frontend: functional React components, TypeScript strict mode, feature-based folder organization
- Commits: conventional commit messages (`feat:`, `fix:`, `docs:`, `chore:`)

---

## License

This project is for educational and DevOps practice purposes. Add your preferred license before public distribution.

---

## Author

**Aminu Iliyasu**  
Domain: [aminuiliyasu.com](https://aminuiliyasu.com)  
Application: [ecommerce.aminuiliyasu.com](https://ecommerce.aminuiliyasu.com) (pending deployment)
