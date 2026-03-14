<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Gemini_AI-API-4285F4?style=for-the-badge&logo=google" />
</p>

# 🤖 ResolveAI

**ResolveAI** is a modern, AI-powered customer support platform built with React, TypeScript, and the Gemini AI API. It provides businesses with an intelligent dashboard to manage conversations, automate workflows, train AI agents, and engage customers across multiple channels — all from a single, beautifully designed interface.

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Application Flow](#-application-flow)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [Dashboard Modules](#-dashboard-modules)
- [UI Components](#-ui-components)
- [Theming](#-theming)
- [Deployment](#-deployment)
- [License](#-license)

---

## ✨ Features

- 🧠 **AI-Powered Conversations** — Gemini AI integration for intelligent, context-aware customer support
- 📬 **Unified Inbox** — Manage all conversations, assignments, and SLA-critical tickets in one place
- 🌐 **Omnichannel Support** — Website Chat, Email, WhatsApp, Telegram, Slack, and Voice AI channels
- 🤖 **AI Agent Training** — Knowledge base management, document uploads, website scraping, and prompt editing
- ⚡ **Workflow Automation** — AI automations, macros, snippets, escalation rules, and custom workflows
- 📊 **Analytics & Insights** — Performance dashboards, CSAT & sentiment tracking, and conversation analytics
- 🎯 **Outbound Campaigns** — Campaign management, product tours, and news/updates broadcasting
- 👥 **CRM & People Management** — Customer profiles, contact management, and interaction history
- 🎨 **Premium UI/UX** — Spline 3D animations, Framer Motion transitions, glassmorphism design, dark/light themes
- ⌨️ **Command Palette** — Quick navigation with `Ctrl+K` / `⌘+K` keyboard shortcut
- 💳 **Billing & API Keys** — Subscription management and developer API key provisioning

---

## 🛠 Tech Stack

| Category         | Technology                                                              |
| ---------------- | ----------------------------------------------------------------------- |
| **Framework**    | [React 19](https://react.dev) + [TypeScript 5.8](https://typescriptlang.org) |
| **Build Tool**   | [Vite 6](https://vitejs.dev)                                           |
| **Styling**      | [Tailwind CSS 4](https://tailwindcss.com) + Vanilla CSS                |
| **Animations**   | [Framer Motion](https://www.framer.com/motion/) + [Spline 3D](https://spline.design) |
| **AI Engine**    | [Google Gemini AI](https://ai.google.dev/)                             |
| **Routing**      | [React Router DOM v7](https://reactrouter.com)                         |
| **Charts**       | [Recharts](https://recharts.org)                                       |
| **UI Primitives**| [Radix UI](https://www.radix-ui.com/) (Dialog, Tooltip, Slot)          |
| **Icons**        | [Lucide React](https://lucide.dev)                                     |
| **Theming**      | [next-themes](https://github.com/pacocoursey/next-themes)              |
| **Particles**    | [tsParticles](https://particles.js.org/)                               |
| **Markdown**     | [react-markdown](https://github.com/remarkjs/react-markdown)           |

---

## 📁 Project Structure

```
ResolveAI/
├── index.html                    # HTML entry point
├── vite.config.ts                # Vite configuration with Tailwind CSS plugin
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── .env.example                  # Environment variables template
│
└── src/
    ├── main.tsx                  # App bootstrap (React root, ThemeProvider, Router)
    ├── App.tsx                   # Route definitions
    ├── index.css                 # Global styles, CSS variables, animations
    ├── types.d.ts                # Global type declarations
    │
    ├── lib/
    │   └── utils.ts              # Utility functions (cn helper)
    │
    └── components/
        ├── LandingPage.tsx       # Public landing page (assembles all sections)
        ├── SplineSceneBasic.tsx  # 3D Spline hero section
        ├── SparklesDemo.tsx      # Sparkles / particles CTA section
        ├── BentoSection.tsx      # Bento grid feature showcase
        ├── FeaturesSection.tsx   # Detailed features section
        ├── HowItWorks.tsx        # "How it works" timeline section
        ├── PricingSection.tsx    # Pricing plans overview
        ├── Dashboard.tsx         # Main dashboard layout (Sidebar + view router)
        ├── demo.tsx              # Demo component
        │
        ├── auth/
        │   ├── SignUp.tsx        # Sign up / login page
        │   └── PricingPage.tsx   # Standalone pricing page
        │
        ├── onboarding/
        │   └── OnboardingFlow.tsx # Multi-step onboarding wizard
        │
        ├── dashboard/
        │   ├── Sidebar.tsx       # Collapsible sidebar navigation
        │   ├── CommandPalette.tsx # Ctrl+K command palette
        │   ├── ui/
        │   │   └── CallOverlay.tsx # Voice/video call overlay
        │   └── pages/
        │       ├── AllConversations.tsx    # Inbox: all conversations
        │       ├── AssignedToMe.tsx        # Inbox: my assignments
        │       ├── Unassigned.tsx          # Inbox: unassigned tickets
        │       ├── UrgentSLA.tsx           # Inbox: SLA-critical tickets
        │       ├── People.tsx             # CRM: contacts & profiles
        │       ├── CSAT.tsx               # Customer satisfaction tracking
        │       ├── Outbound.tsx           # Campaign management
        │       ├── News.tsx               # News & updates
        │       ├── HelpCenter.tsx         # Public help center builder
        │       ├── Analyze.tsx            # AI analytics hub
        │       ├── Train.tsx              # AI agent training hub
        │       ├── KnowledgeBase.tsx       # Knowledge base management
        │       ├── Documents.tsx           # Document management
        │       ├── WebsiteSources.tsx      # Website scraping sources
        │       ├── PromptEditor.tsx        # AI prompt configuration
        │       ├── Playbook.tsx            # Agent playbooks
        │       ├── Protocols.tsx           # Response protocols
        │       ├── ResponseTesting.tsx     # AI response testing
        │       ├── AISettings.tsx          # AI model settings
        │       ├── AIAutomations.tsx       # Automation rules
        │       ├── AICalls.tsx             # AI call management
        │       ├── AIPerformance.tsx       # AI performance metrics
        │       ├── AgentPerformance.tsx    # Agent performance metrics
        │       ├── AnalyticsOverview.tsx   # Analytics overview
        │       ├── ConversationsAnalytics.tsx # Conversation analytics
        │       ├── Macros.tsx             # Macros & snippets
        │       ├── Workflows.tsx          # Workflow builder
        │       ├── Escalations.tsx        # Escalation rules
        │       ├── TeamMembers.tsx        # Team management
        │       ├── BusinessHours.tsx      # Business hours & SLA config
        │       ├── Integrations.tsx       # Third-party integrations
        │       ├── ChatWidget.tsx         # Chat widget customization
        │       ├── Billing.tsx            # Billing & subscriptions
        │       ├── APIKeys.tsx            # API key management
        │       ├── ComingSoon.tsx          # Placeholder for upcoming features
        │       └── channels/
        │           ├── ChannelPage.tsx         # Shared channel page template
        │           ├── WebsiteChatChannel.tsx  # Website chat channel
        │           ├── EmailChannel.tsx        # Email channel
        │           ├── WhatsAppChannel.tsx     # WhatsApp channel
        │           ├── TelegramChannel.tsx     # Telegram channel
        │           ├── SlackChannel.tsx        # Slack channel
        │           └── VoiceAIChannel.tsx      # Voice AI channel
        │
        └── ui/                   # Reusable UI components
            ├── button.tsx
            ├── card.tsx
            ├── badge.tsx
            ├── Toast.tsx
            ├── dropdown-menu.tsx
            ├── ios-spinner.tsx
            ├── sparkles.tsx
            ├── spotlight.tsx
            ├── spotlight-hover.tsx
            ├── splite.tsx
            ├── ai-prompt-box.tsx
            ├── animated-glassy-pricing.tsx
            ├── interactive-3d-robot.tsx
            ├── multi-type-ripple-buttons.tsx
            ├── radial-orbital-timeline.tsx
            ├── tube-light-navbar.tsx
            ├── 3d-adaptive-navigation-bar.tsx
            ├── unique-testimonial.tsx
            └── footer-section.tsx
```

---

## 🔄 Application Flow

### 1. Landing Page (`/`)

The public-facing homepage that introduces ResolveAI to visitors.

```
┌─────────────────────────────────────────────────┐
│  Header: Brand Logo  |  Login  |  Sign Up       │
├─────────────────────────────────────────────────┤
│  🎮 3D Spline Hero Scene                        │
│  Interactive 3D robot animation with CTA        │
├─────────────────────────────────────────────────┤
│  📦 Bento Grid Feature Showcase                 │
│  Highlights key platform capabilities           │
├─────────────────────────────────────────────────┤
│  ✨ Sparkles CTA Section                        │
│  Particle-animated call to action               │
├─────────────────────────────────────────────────┤
│  📋 How It Works Timeline                       │
│  Step-by-step onboarding explanation            │
├─────────────────────────────────────────────────┤
│  💬 Testimonials Carousel                       │
│  Customer reviews and social proof              │
├─────────────────────────────────────────────────┤
│  💰 Pricing Plans                               │
│  Tier comparison with animated cards            │
├─────────────────────────────────────────────────┤
│  🦶 Footer                                      │
│  Links, contact info, social media              │
└─────────────────────────────────────────────────┘
```

### 2. Authentication (`/signup`)

A sign-up and login page that collects user credentials. The form supports toggling between sign up and login modes.

### 3. Pricing (`/pricing`)

A standalone pricing page with animated, glassy pricing cards for comparing subscription tiers and features.

### 4. Onboarding (`/onboarding`)

A multi-step onboarding wizard that guides new users through:
- Account setup and profile configuration
- Business information
- Channel preferences
- AI agent initial configuration

### 5. Dashboard (`/dashboard`)

The main application interface after authentication. Features a collapsible sidebar with 7 major module sections:

```
┌──────────┬──────────────────────────────────────┐
│          │                                      │
│  Sidebar │       Active View (Content)          │
│          │                                      │
│  • Inbox │   Renders one of 30+ pages based     │
│  • CRM   │   on sidebar selection               │
│  • Out-  │                                      │
│    bound │                                      │
│  • AI    │                                      │
│  • Chan- │                                      │
│    nels  │                                      │
│  • Auto  │                                      │
│  • Sett- │                                      │
│    ings  │                                      │
│          │                                      │
│  [Theme] │                                      │
└──────────┴──────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/ResolveAI.git
cd ResolveAI

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 4. Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**.

---

## 🔑 Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable         | Required | Description                                  |
| ---------------- | -------- | -------------------------------------------- |
| `GEMINI_API_KEY`  | ✅       | Your Google Gemini AI API key                |
| `APP_URL`         | ❌       | The URL where the app is hosted (for OAuth)  |

---

## 📜 Available Scripts

| Command            | Description                                    |
| ------------------ | ---------------------------------------------- |
| `npm run dev`      | Start the Vite dev server on port 3000         |
| `npm run build`    | Build the production bundle                    |
| `npm run preview`  | Preview the production build locally           |
| `npm run clean`    | Remove the `dist/` directory                   |
| `npm run lint`     | Run TypeScript type checking                   |

---

## 📊 Dashboard Modules

### 📬 Inbox
| Page               | Description                                          |
| ------------------ | ---------------------------------------------------- |
| All Conversations  | View and manage all customer conversations with AI chat |
| Assigned to Me     | Tickets assigned to the current agent                |
| Unassigned         | Tickets awaiting assignment                          |
| Urgent / SLA       | SLA-critical and high-priority tickets               |

### 👥 Customers
| Page               | Description                                          |
| ------------------ | ---------------------------------------------------- |
| People & CRM       | Customer profiles, contact details, interaction history |
| CSAT & Sentiment   | Customer satisfaction scores and sentiment analysis   |

### 📣 Outbound
| Page               | Description                                          |
| ------------------ | ---------------------------------------------------- |
| Campaigns          | Create and manage outbound campaigns                 |
| Product Tours      | Design guided product tours for users                |
| News & Updates     | Publish announcements and updates                    |

### 🤖 AI Agent
| Page               | Description                                          |
| ------------------ | ---------------------------------------------------- |
| Analyze            | AI performance analytics and insights hub            |
| Train Agent        | Training hub — knowledge base, documents, prompts    |
| Public Help Center | Build and manage a public-facing help center         |
| Test               | Test AI responses with simulated conversations       |
| Deploy             | Deploy the AI agent (coming soon)                    |

### 🌐 Channels
| Page               | Description                                          |
| ------------------ | ---------------------------------------------------- |
| Website Chat       | Configure the embedded website chat widget           |
| Email              | Email channel setup and management                   |
| WhatsApp           | WhatsApp Business integration                        |
| Telegram           | Telegram bot configuration                           |
| Slack              | Slack workspace integration                          |
| Voice AI           | Voice AI channel with call overlays                  |

### ⚡ Automation
| Page               | Description                                          |
| ------------------ | ---------------------------------------------------- |
| AI Automations     | Create rule-based AI automation workflows            |
| Macros & Snippets  | Reusable response templates and macros               |
| Escalations        | Configure escalation rules and routing               |
| Workflows          | Visual workflow builder for complex processes        |

### ⚙️ Settings
| Page               | Description                                          |
| ------------------ | ---------------------------------------------------- |
| Team Members       | Manage team members and roles                        |
| Business Hours     | Configure business hours and SLA policies            |
| Integrations       | Connect third-party services                         |
| Chat Widget        | Customize the chat widget appearance                 |
| Billing            | Subscription and payment management                  |
| API Keys           | Generate and manage API keys                         |

---

## 🎨 UI Components

ResolveAI includes a rich library of reusable UI components:

| Component                    | Description                                     |
| ---------------------------- | ----------------------------------------------- |
| `Button`                     | Variant-based button with ripple effects         |
| `Card`                       | Flexible card container                          |
| `Badge`                      | Status and label badges                          |
| `Toast`                      | Toast notification system                        |
| `DropdownMenu`               | Radix-based dropdown menus                       |
| `CommandPalette`             | `Ctrl+K` quick navigation                       |
| `AI Prompt Box`              | AI-powered input with suggestions                |
| `Animated Glassy Pricing`    | Glassmorphism pricing cards                      |
| `Interactive 3D Robot`       | Spline 3D embedded component                    |
| `Radial Orbital Timeline`    | Animated orbital timeline visualization          |
| `Tube Light Navbar`          | Animated navigation bar with glow effects        |
| `Sparkles`                   | Particle sparkle effects                         |
| `Spotlight` / `SpotlightHover` | Spotlight and hover spotlight effects          |
| `Unique Testimonial`         | Testimonial card carousel                        |
| `Footer Section`             | Full-featured footer component                   |
| `iOS Spinner`                | Native iOS-style loading spinner                 |
| `Multi-Type Ripple Buttons`  | Buttons with various ripple animations           |

---

## 🌗 Theming

ResolveAI supports **dark** and **light** modes via `next-themes` with CSS custom properties.

- Theme is toggled from the sidebar's sun/moon button
- Default theme is **dark**
- CSS variables are defined in `src/index.css` under `:root` (light) and `.dark` (dark)
- All components use semantic color variables (`bg-background`, `text-foreground`, etc.) for automatic theme adaptation

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Manual Build

```bash
# Build for production
npm run build

# The output will be in the dist/ directory
# Serve with any static file server
npm run preview
```

---

## 📄 License

This project is licensed under the [Apache-2.0 License](LICENSE).

---

<p align="center">
  Built with ❤️ by the ResolveAI Team
</p>
