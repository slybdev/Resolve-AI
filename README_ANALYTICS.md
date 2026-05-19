# Analytics Page Implementation Guide

This document is for your teammate to get up to speed on the Analytics page and continue its development.

## 📌 Current State

The Analytics feature is partially implemented. The UI structure is solid and some real data integration exists, but several tabs still rely on hardcoded dummy data.

### Frontend Components
Location: `src/components/dashboard/pages/`
- `Analyze.tsx`: The main wrapper component that manages the 4 tabs (Overview, Conversations, Agent Performance, AI Performance).
- `AgentPerformance.tsx`: **Fully integrated.** Fetches real data via `api.analytics.getAgentPerformance` and renders the stats and agent table.
- `AnalyticsOverview.tsx`: **Hardcoded.** Needs backend integration.
- `ConversationsAnalytics.tsx`: **Hardcoded.** Needs backend integration.
- `AIPerformance.tsx`: **Hardcoded.** Needs backend integration.

### Backend APIs
Location: `backend/app/api/analytics.py`
- `GET /api/v1/analytics/{workspace_id}/agents`: **Implemented.** Returns agent stats, resolved counts, average response times (FRT), and CSAT scores.
- `GET /api/v1/analytics/{workspace_id}/csat`: **Implemented.** Returns CSAT trends and score distributions.

---

## 🚀 Tasks for the Teammate

Your primary goal is to replace the hardcoded data in the Overview, Conversations, and AI Performance tabs with real data from the database.

### 1. Build Backend Endpoints

In `backend/app/api/analytics.py`, you need to implement three new endpoints:

#### A. Overview Endpoint (`GET /{workspace_id}/overview`)
- **Required Metrics:**
  - Total Conversations
  - AI Resolved Rate (%)
  - Human Escalations (Count)
  - Avg Response Time
  - Customer Satisfaction (CSAT - you can reuse logic from the existing CSAT endpoint)
  - Daily Conversation Volume (grouped by AI vs. Human responses over the requested time period)
  - Resolution Distribution (AI vs. Human percentages)
- **Database Models:** You will query `Ticket`, `Message`, and `Rating`.

#### B. Conversations Endpoint (`GET /{workspace_id}/conversations`)
- **Required Metrics:**
  - Total Chats
  - Avg Duration of chats
  - Resolution Rate (%)
  - Escalation Rate (%)
  - Conversation Volume Trend (grouped by day)
  - Sentiment Distribution (Positive, Neutral, Negative percentages)
- **Database Models:** `Ticket`, `Message`, `Rating`.

#### C. AI Performance Endpoint (`GET /{workspace_id}/ai-performance`)
- **Required Metrics:**
  - Overall AI Accuracy (%)
  - Avg Latency (seconds)
  - Total Tokens Used
  - Escalation Rate (%)
  - Trend lines for Accuracy and Latency
  - Model Breakdown (e.g., Gemini 3.1 Pro vs Flash usage, accuracy, and latency)
- **Database Models:** You'll likely need to query `Message` (if token usage and model info are stored there) or an AI log table if one exists.

> Tip: Look at the existing `get_agent_performance` function in `analytics.py` for examples of how to write efficient SQLAlchemy subqueries and groupings for time-series data.

### 2. Update the Frontend API Client

In `src/lib/api.ts`, add the corresponding API fetch functions:
```typescript
getAnalyticsOverview: async (workspaceId: string, days: number) => { ... },
getConversationsAnalytics: async (workspaceId: string, days: number) => { ... },
getAIPerformance: async (workspaceId: string, days: number) => { ... },
```

### 3. Integrate Frontend Components

For `AnalyticsOverview.tsx`, `ConversationsAnalytics.tsx`, and `AIPerformance.tsx`:
1. Add `useState` for loading state and data.
2. Add a `useEffect` hook to fetch data when `workspaceId` or the `days` filter changes.
3. Replace the hardcoded `data` and `pieData` arrays with the fetched data.
4. Add a loading spinner (`<Loader2 className="animate-spin" />`) while the data is fetching.
5. *(Optional)* Look at `AgentPerformance.tsx` to see exactly how the loading state and data fetching were implemented there.

---

## 📂 Key Files to Modify

#### Backend
- `backend/app/api/analytics.py`

#### Frontend
- `src/lib/api.ts`
- `src/components/dashboard/pages/AnalyticsOverview.tsx`
- `src/components/dashboard/pages/ConversationsAnalytics.tsx`
- `src/components/dashboard/pages/AIPerformance.tsx`
