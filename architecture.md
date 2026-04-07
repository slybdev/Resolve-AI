# XentralDesk — Backend Architecture & Engineering Workstream Plan

> **Purpose**: This document defines the full-stack architecture for two Python backend engineers (**Engineer A** and **Engineer B**) to build the XentralDesk backend simultaneously with zero merge conflicts. Work is organized by milestones. Each milestone has clearly separated ownership boundaries.

---

## Table of Contents

- [Current State Analysis](#current-state-analysis)
- [Target Architecture](#target-architecture)
- [Shared Foundations (Milestone 0)](#milestone-0-shared-foundations--pair)
- [Milestone 1 — Auth, Users & Core Data Layer](#milestone-1--auth-users--core-data-layer)
- [Milestone 2 — Conversations, AI Engine & Channels](#milestone-2--conversations-ai-engine--channels)
- [Milestone 3 — Knowledge Base, Training & Automation](#milestone-3--knowledge-base-training--automation)
- [Milestone 4 — Analytics, Billing & Deployment](#milestone-4--analytics-billing--deployment)
- [Conflict Avoidance Rules](#conflict-avoidance-rules)
- [API Contract Reference](#api-contract-reference)

---

## Current State Analysis

The frontend is a **Vite + React 19 + TypeScript** SPA. All data is currently **hardcoded/mock** — no backend exists yet.

### Frontend Route Map

| Route           | Component           | Data Needed from Backend                          |
| --------------- | ------------------- | ------------------------------------------------- |
| `/`             | `LandingPage`       | None (static marketing)                           |
| `/signup`       | `SignUp`            | Auth: register, login, OAuth (Google, Microsoft)  |
| `/pricing`      | `PricingPage`       | Plans, features, Stripe checkout                  |
| `/onboarding`   | `OnboardingFlow`    | Workspace CRUD, AI agent config, team invites     |
| `/dashboard`    | `Dashboard`         | Everything below ↓                                |

### Dashboard Views → Backend Domain Mapping

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD DOMAINS                            │
├──────────────────┬──────────────────────────────────────────────────┤
│ INBOX            │ All Conversations, Assigned to Me, Unassigned,  │
│                  │ Urgent/SLA — needs: conversations, messages,    │
│                  │ assignments, SLA tracking, AI copilot           │
├──────────────────┼──────────────────────────────────────────────────┤
│ CUSTOMERS        │ People & CRM, CSAT & Sentiment                  │
│                  │ — needs: contacts, companies, tags, sentiment   │
├──────────────────┼──────────────────────────────────────────────────┤
│ OUTBOUND         │ Campaigns, Product Tours, News                   │
│                  │ — needs: campaign CRUD, audience targeting       │
├──────────────────┼──────────────────────────────────────────────────┤
│ AI AGENT         │ Analyze, Train, Help Center, Test, Deploy       │
│                  │ — needs: knowledge base, documents, prompts,    │
│                  │ website scraping, AI model config, test runner   │
├──────────────────┼──────────────────────────────────────────────────┤
│ CHANNELS         │ Website Chat, Email, WhatsApp, Telegram,        │
│                  │ Slack, Voice AI                                  │
│                  │ — needs: channel config, webhook ingestion,     │
│                  │ message routing, widget embed config             │
├──────────────────┼──────────────────────────────────────────────────┤
│ AUTOMATION       │ AI Automations, Macros, Escalations, Workflows  │
│                  │ — needs: rule engine, trigger/action system,     │
│                  │ workflow execution, macro templates              │
├──────────────────┼──────────────────────────────────────────────────┤
│ SETTINGS         │ Team Members, Business Hours, Integrations,     │
│                  │ Chat Widget, Billing, API Keys                   │
│                  │ — needs: user management, billing/Stripe,       │
│                  │ API key provisioning, integration OAuth          │
└──────────────────┴──────────────────────────────────────────────────┘
```

### State Management (Frontend)

- All state is **local React `useState`** — no global store exists
- The frontend expects a REST or GraphQL API; there is no backend yet
- The AI chat currently mocks Gemini API calls client-side via `process.env.GEMINI_API_KEY`

---

## Target Architecture

```
                    ┌──────────────────────┐
                    │   React Frontend     │
                    │   (Vite SPA)         │
                    └──────────┬───────────┘
                               │ REST API (JSON)
                    ┌──────────▼───────────┐
                    │   Python Backend     │
                    │   (FastAPI)          │
                    ├──────────────────────┤
                    │ ┌──────┐ ┌────────┐  │
                    │ │ Auth │ │  API   │  │
                    │ │ JWT  │ │ Routes │  │
                    │ └──────┘ └────────┘  │
                    │ ┌──────────────────┐  │
                    │ │  Service Layer   │  │
                    │ │ (Business Logic) │  │
                    │ └──────────────────┘  │
                    │ ┌──────────────────┐  │
                    │ │  Data Layer      │  │
                    │ │ (SQLAlchemy ORM) │  │
                    │ └──────────────────┘  │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──┐   ┌────────▼───┐   ┌────────▼───┐
    │  MySQL 8   │   │   Redis    │   │  Gemini AI │
    │ (Primary)  │   │ (Cache +   │   │  API       │
    │            │   │  Queues)   │   │            │
    └────────────┘   └────────────┘   └────────────┘
```

### Tech Stack (Backend)

| Layer            | Technology                                |
| ---------------- | ----------------------------------------- |
| Framework        | **FastAPI** (async, type-safe)             |
| ORM              | **SQLAlchemy 2.0** + Alembic migrations   |
| Database         | **MySQL 8.0**                             |
| Cache / Queues   | **Redis** (caching, pub/sub, task queue)  |
| Auth             | **JWT** + OAuth2 (Google, Microsoft)      |
| AI               | **Google Gemini API** (via `google-genai`) |
| Task Queue       | **Celery** or **ARQ** (async tasks)       |
| File Storage     | **S3-compatible** (MinIO for local dev)   |
| Payments         | **Stripe API**                            |
| WebSockets       | **FastAPI WebSockets** (real-time chat)   |
| Testing          | **pytest** + **httpx** (async test client)|

---

## Milestone 0 — Shared Foundations (🤝 Pair)

> **Both engineers pair** on this for 1–2 days to establish the project scaffold and conventions.

### Tasks

- [ ] Initialize project: `backend/` directory with `pyproject.toml`, `Dockerfile`, `docker-compose.yml`
- [ ] Set up FastAPI app factory pattern in `backend/app/main.py`
- [ ] Configure SQLAlchemy 2.0 async engine in `backend/app/db/session.py`
- [ ] Create Alembic migration setup in `backend/alembic/`
- [ ] Define shared base model in `backend/app/db/base.py`
- [ ] Set up `.env` config with Pydantic Settings in `backend/app/core/config.py`
- [ ] Create shared utilities: `backend/app/core/security.py` (password hashing, JWT encode/decode)
- [ ] Create shared response schemas in `backend/app/schemas/common.py`
- [ ] Set up pytest fixtures and test database in `backend/tests/conftest.py`
- [ ] Agree on file naming, import conventions, and PR workflow

### Directory Structure (after Milestone 0)

```
backend/
├── alembic/
│   ├── versions/
│   └── env.py
├── app/
│   ├── main.py                    # FastAPI app factory
│   ├── core/
│   │   ├── config.py              # Pydantic Settings
│   │   ├── security.py            # JWT + hashing
│   │   └── dependencies.py        # Shared DI (get_db, get_current_user)
│   ├── db/
│   │   ├── base.py                # SQLAlchemy declarative base
│   │   └── session.py             # Async engine + session factory
│   ├── models/                    # SQLAlchemy models (one file per domain)
│   ├── schemas/                   # Pydantic request/response schemas
│   ├── api/                       # Route files (one per domain)
│   │   └── deps.py                # Route-level dependencies
│   ├── services/                  # Business logic (one per domain)
│   └── tasks/                     # Celery/ARQ background tasks
├── tests/
│   ├── conftest.py
│   └── ...
├── pyproject.toml
├── Dockerfile
└── docker-compose.yml
```

---

## Milestone 1 — Auth, Users & Core Data Layer

> **Duration**: ~1 week

### Engineer A — Auth & Workspace

**Owns**: `auth`, `users`, `workspaces`, `onboarding`

| # | Task | Files |
|---|------|-------|
| 1 | User model + migration | `models/user.py`, `alembic/versions/001_users.py` |
| 2 | Workspace model + migration | `models/workspace.py`, `alembic/versions/002_workspaces.py` |
| 3 | Auth schemas (register, login, token) | `schemas/auth.py` |
| 4 | Auth service (register, login, OAuth, JWT refresh) | `services/auth_service.py` |
| 5 | Auth API routes (`/api/auth/*`) | `api/auth.py` |
| 6 | Workspace CRUD API (`/api/workspaces/*`) | `api/workspaces.py` |
| 7 | Onboarding API (workspace setup + AI config) | `api/onboarding.py`, `services/onboarding_service.py` |
| 8 | Team invite system (email invite + accept) | `services/invite_service.py`, `models/invite.py` |
| 9 | Auth middleware + `get_current_user` dependency | `core/dependencies.py` |
| 10 | Tests for auth + workspace | `tests/test_auth.py`, `tests/test_workspaces.py` |

### Engineer B — Contacts, CRM & Settings

**Owns**: `contacts`, `companies`, `tags`, `team_members`, `settings`

| # | Task | Files |
|---|------|-------|
| 1 | Contact model (People/CRM) + migration | `models/contact.py`, `alembic/versions/003_contacts.py` |
| 2 | Company model + migration | `models/company.py`, `alembic/versions/004_companies.py` |
| 3 | Tag system (polymorphic tags) | `models/tag.py`, `services/tag_service.py` |
| 4 | Contact CRUD API (`/api/contacts/*`) | `api/contacts.py`, `schemas/contact.py` |
| 5 | Company CRUD API (`/api/companies/*`) | `api/companies.py`, `schemas/company.py` |
| 6 | Team member management API (`/api/team/*`) | `api/team.py`, `services/team_service.py` |
| 7 | Business hours & SLA configuration | `models/business_hours.py`, `api/settings.py` |
| 8 | API key provisioning (`/api/api-keys/*`) | `models/api_key.py`, `api/api_keys.py` |
| 9 | Customer segments + filtering | `services/segment_service.py` |
| 10 | Tests for contacts, team, settings | `tests/test_contacts.py`, `tests/test_settings.py` |

### Interface Contract (M1)

Engineer B will import `User` and `Workspace` models from Engineer A's files. **Convention**: Engineer A publishes model exports in `models/__init__.py` and Engineer B imports from there.

---

## Milestone 2 — Conversations, AI Engine & Channels

> **Duration**: ~1.5 weeks

### Engineer A — Conversations & Real-Time Chat

**Owns**: `conversations`, `messages`, `assignments`, `copilot`, `websockets`

| # | Task | Files |
|---|------|-------|
| 1 | Conversation model + migration | `models/conversation.py`, `alembic/versions/005_conversations.py` |
| 2 | Message model (supports AI, human, internal notes) | `models/message.py`, `alembic/versions/006_messages.py` |
| 3 | Conversation CRUD + filtering API | `api/conversations.py`, `schemas/conversation.py` |
| 4 | Message send/receive API | `api/messages.py`, `schemas/message.py` |
| 5 | WebSocket endpoint for real-time chat | `api/ws.py` |
| 6 | Assignment system (assign, unassign, auto-assign) | `services/assignment_service.py` |
| 7 | SLA tracking + urgent ticket detection | `services/sla_service.py` |
| 8 | AI Copilot service (conversation summary, suggestions) | `services/copilot_service.py` |
| 9 | Gemini AI integration for generating responses | `services/ai_service.py` |
| 10 | Tests | `tests/test_conversations.py`, `tests/test_ai.py` |

### Engineer B — Channels & Message Routing

**Owns**: `channels`, `webhooks`, `routing`, `widget`, `voice`

| # | Task | Files |
|---|------|-------|
| 1 | Channel model + configuration | `models/channel.py`, `alembic/versions/007_channels.py` |
| 2 | Channel API (`/api/channels/*`) | `api/channels.py`, `schemas/channel.py` |
| 3 | Webhook ingestion endpoints per channel | `api/webhooks.py` |
| 4 | WhatsApp integration (send/receive via API) | `services/channels/whatsapp.py` |
| 5 | Email integration (SMTP send, IMAP receive) | `services/channels/email.py` |
| 6 | Telegram bot integration | `services/channels/telegram.py` |
| 7 | Slack integration (events API) | `services/channels/slack.py` |
| 8 | Website chat widget embed config API | `api/widget.py`, `services/widget_service.py` |
| 9 | Message routing service (channel → conversation) | `services/routing_service.py` |
| 10 | Tests | `tests/test_channels.py`, `tests/test_routing.py` |

### Interface Contract (M2)

- Engineer B's routing service creates `Conversation` and `Message` records using Engineer A's models
- Engineer B calls `services/ai_service.py` (Engineer A) to get AI replies for incoming channel messages
- **Shared interface**: `services/ai_service.py::generate_reply(conversation_id, message_text) -> str`

---

## Milestone 3 — Knowledge Base, Training & Automation

> **Duration**: ~1.5 weeks

### Engineer A — Knowledge Base & AI Training

**Owns**: `knowledge`, `documents`, `training`, `help_center`, `scraping`

| # | Task | Files |
|---|------|-------|
| 1 | Knowledge item model (folders, articles, snippets, PDFs) | `models/knowledge.py`, `alembic/versions/008_knowledge.py` |
| 2 | Document upload + S3 storage | `services/storage_service.py`, `api/documents.py` |
| 3 | Website scraping service (URL → knowledge) | `services/scraper_service.py`, `tasks/scrape_task.py` |
| 4 | Knowledge base CRUD API | `api/knowledge.py`, `schemas/knowledge.py` |
| 5 | AI training pipeline (embed docs → vector store) | `services/training_service.py` |
| 6 | Prompt editor API (save/load system prompts) | `api/prompts.py`, `models/prompt.py` |
| 7 | Help center API (public article publishing) | `api/help_center.py` |
| 8 | AI response testing sandbox | `api/testing.py`, `services/test_runner.py` |
| 9 | Knowledge source connectors (Notion, Zendesk, Confluence) | `services/connectors/` |
| 10 | Tests | `tests/test_knowledge.py`, `tests/test_training.py` |

### Engineer B — Automation & Workflows

**Owns**: `automations`, `macros`, `workflows`, `escalations`, `campaigns`

| # | Task | Files |
|---|------|-------|
| 1 | Automation rule model (trigger + action) | `models/automation.py`, `alembic/versions/009_automations.py` |
| 2 | Automation CRUD API | `api/automations.py`, `schemas/automation.py` |
| 3 | Rule engine (evaluate triggers, execute actions) | `services/rule_engine.py` |
| 4 | Macro / snippet CRUD | `models/macro.py`, `api/macros.py` |
| 5 | Workflow builder model (multi-step sequences) | `models/workflow.py`, `api/workflows.py` |
| 6 | Escalation rules service | `services/escalation_service.py` |
| 7 | Campaign CRUD + audience targeting | `models/campaign.py`, `api/campaigns.py` |
| 8 | Outbound messaging (bulk send via channels) | `services/outbound_service.py`, `tasks/campaign_task.py` |
| 9 | Automation simulation / testing endpoint | `api/automation_test.py` |
| 10 | Tests | `tests/test_automations.py`, `tests/test_workflows.py` |

### Interface Contract (M3)

- Engineer B's rule engine hooks into Engineer A's message pipeline: when a new message arrives, the rule engine is called
- **Shared hook**: Engineer A exposes `services/message_hooks.py::on_message_received(message)` that Engineer B registers automation handlers on
- Engineer B's campaigns use Engineer B's own channel services from M2

---

## Milestone 4 — Analytics, Billing & Deployment

> **Duration**: ~1 week

### Engineer A — Analytics & Reporting

**Owns**: `analytics`, `csat`, `performance`, `reporting`

| # | Task | Files |
|---|------|-------|
| 1 | Analytics aggregation service | `services/analytics_service.py` |
| 2 | Conversation analytics API | `api/analytics.py`, `schemas/analytics.py` |
| 3 | CSAT survey model + collection | `models/csat.py`, `api/csat.py` |
| 4 | Sentiment analysis integration (Gemini) | `services/sentiment_service.py` |
| 5 | AI agent performance metrics | `api/ai_performance.py` |
| 6 | Export reports (CSV/PDF generation) | `services/export_service.py`, `tasks/export_task.py` |
| 7 | Tests | `tests/test_analytics.py` |

### Engineer B — Billing, Integrations & Deployment

**Owns**: `billing`, `integrations`, `deployment`

| # | Task | Files |
|---|------|-------|
| 1 | Stripe integration (subscriptions, plans) | `services/billing_service.py`, `api/billing.py` |
| 2 | Billing models (plans, subscriptions, invoices) | `models/billing.py`, `alembic/versions/010_billing.py` |
| 3 | Stripe webhook handler | `api/stripe_webhooks.py` |
| 4 | Third-party integration OAuth framework | `services/integration_service.py`, `api/integrations.py` |
| 5 | Rate limiting middleware | `core/rate_limit.py` |
| 6 | Production Dockerfile + CI/CD pipeline | `Dockerfile`, `.github/workflows/` |
| 7 | Tests | `tests/test_billing.py`, `tests/test_integrations.py` |

---

## Conflict Avoidance Rules

### 1. File Ownership

Each engineer **owns specific files**. Only the owner creates/modifies that file.

| File Pattern | Owner |
|---|---|
| `models/user.py`, `models/workspace.py`, `models/conversation.py`, `models/message.py`, `models/knowledge.py`, `models/prompt.py`, `models/csat.py` | **Engineer A** |
| `models/contact.py`, `models/company.py`, `models/tag.py`, `models/channel.py`, `models/automation.py`, `models/macro.py`, `models/workflow.py`, `models/campaign.py`, `models/billing.py`, `models/api_key.py`, `models/business_hours.py` | **Engineer B** |
| `services/ai_service.py`, `services/copilot_service.py`, `services/training_service.py`, `services/analytics_service.py` | **Engineer A** |
| `services/routing_service.py`, `services/rule_engine.py`, `services/billing_service.py`, `services/channels/*` | **Engineer B** |

### 2. Shared Files Protocol

These files are touched by both engineers — use the following rules:

| File | Rule |
|---|---|
| `app/main.py` | Each engineer adds their router via `app.include_router()`. Use **append-only** — never modify the other's line. |
| `models/__init__.py` | Each engineer exports only their models. Alphabetical order. |
| `alembic/versions/` | Use **sequential numbering** (A gets odd: 001, 003, 005… B gets even: 002, 004, 006…) to prevent migration conflicts. |
| `core/dependencies.py` | Append-only. Add new dependencies with clear comments. |
| `docker-compose.yml` | Discuss changes before committing. |
| `pyproject.toml` | Engineer who needs the dependency adds it. Notify the other. |

### 3. Communication Protocol

- **Daily 15-min sync** reviewing what was committed
- **Shared interface contracts** defined before each milestone starts
- When you need to call the other engineer's service, import from the `services/` module — never reach into their private functions
- Use **feature branches**: `feat/a-auth`, `feat/b-contacts`, etc.
- **Never rebase the other's branch** — always merge main

---

## API Contract Reference

### Base URL: `/api/v1`

### Authentication
```
POST   /api/v1/auth/register          → Engineer A
POST   /api/v1/auth/login             → Engineer A
POST   /api/v1/auth/refresh           → Engineer A
POST   /api/v1/auth/oauth/{provider}  → Engineer A
```

### Workspaces & Onboarding
```
POST   /api/v1/workspaces             → Engineer A
GET    /api/v1/workspaces/:id         → Engineer A
PUT    /api/v1/workspaces/:id         → Engineer A
POST   /api/v1/onboarding/setup       → Engineer A
```

### Conversations & Messages
```
GET    /api/v1/conversations          → Engineer A
GET    /api/v1/conversations/:id      → Engineer A
POST   /api/v1/conversations/:id/messages  → Engineer A
WS     /api/v1/ws/chat/:conversation_id    → Engineer A
GET    /api/v1/conversations/:id/copilot   → Engineer A
```

### Contacts & CRM
```
GET    /api/v1/contacts               → Engineer B
POST   /api/v1/contacts               → Engineer B
GET    /api/v1/contacts/:id           → Engineer B
PUT    /api/v1/contacts/:id           → Engineer B
GET    /api/v1/companies              → Engineer B
```

### Channels
```
GET    /api/v1/channels               → Engineer B
POST   /api/v1/channels/:type/config  → Engineer B
POST   /api/v1/webhooks/:channel      → Engineer B
GET    /api/v1/widget/config          → Engineer B
```

### Knowledge Base
```
GET    /api/v1/knowledge              → Engineer A
POST   /api/v1/knowledge              → Engineer A
POST   /api/v1/knowledge/upload       → Engineer A
POST   /api/v1/knowledge/scrape       → Engineer A
GET    /api/v1/help-center/articles   → Engineer A
```

### Automations & Workflows
```
GET    /api/v1/automations            → Engineer B
POST   /api/v1/automations            → Engineer B
POST   /api/v1/automations/test       → Engineer B
GET    /api/v1/macros                 → Engineer B
GET    /api/v1/workflows              → Engineer B
POST   /api/v1/campaigns              → Engineer B
```

### Settings
```
GET    /api/v1/team                   → Engineer B
POST   /api/v1/team/invite            → Engineer A
GET    /api/v1/settings/hours         → Engineer B
GET    /api/v1/api-keys               → Engineer B
```

### Analytics & Billing
```
GET    /api/v1/analytics/overview      → Engineer A
GET    /api/v1/analytics/conversations → Engineer A
GET    /api/v1/analytics/csat          → Engineer A
GET    /api/v1/analytics/ai-performance → Engineer A
GET    /api/v1/billing/plans           → Engineer B
POST   /api/v1/billing/subscribe       → Engineer B
POST   /api/v1/billing/webhooks/stripe → Engineer B
```

---

## Summary Timeline

| Week | Engineer A | Engineer B |
|------|-----------|-----------|
| **0** | 🤝 Pair: project scaffold, DB, shared config | 🤝 Pair: project scaffold, DB, shared config |
| **1** | Auth, Users, Workspaces, Onboarding | Contacts, CRM, Team, Settings, API Keys |
| **2** | Conversations, Messages, WebSockets, AI Chat | Channels, Webhooks, Message Routing, Widget |
| **3** | Knowledge Base, Documents, Training, Help Center | Automations, Macros, Workflows, Campaigns |
| **4** | Analytics, CSAT, Reporting | Billing, Integrations, Deployment |
| **5** | 🤝 Integration testing, bug fixes, launch prep | 🤝 Integration testing, bug fixes, launch prep |

---

*Last updated: March 14, 2026*
