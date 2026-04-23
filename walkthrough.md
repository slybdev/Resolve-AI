# Walkthrough: Testing Smart Identity Collection

I have implemented a sophisticated "Lazy Identity" system that naturally gathers user information through AI conversation while maintaining strict GDPR compliance. Follow this guide to test the new features.

## 🧪 Phase 1: AI-Driven Identification

The AI is now configured with **Earned Identity guidelines**. It will only ask for contact info when it makes sense.

### Test Case: Natural Identification
1.  **Open the chat widget** on your test site.
2.  **Start a conversation** anonymously (e.g., "Hi, tell me about your services").
3.  **Provide a high-intent prompt**: "This looks great! Can you send a detailed quotation to my email?"
4.  **Wait for AI response**: The AI should ask for your email and name.
5.  **Provide your info**: "Sure, I'm John Doe and my email is john@example.com".
6.  **Verify Tool Call**: In the backend logs (`docker compose logs api`), you should see:
    ```
    INFO:app.services.ai_service:AI identified user: john@example.com
    ```
7.  **Check Identity State**: The conversation in the Dashboard should immediately promote from "Visitor" to "John Doe".

---

## 🔒 Phase 2: Privacy & GDPR (IP Anonymization)

Verification that data is stored in a privacy-preserving way.

### Test Case: Anonymized IP
1.  Start a conversation **without** giving cookie consent in the banner.
2.  In the dashboard, hover over the visitor identification.
3.  **Verify IP format**: You should see your IP with the last part zeroed out (e.g., `192.168.1.0` instead of `192.168.1.45`).
    > [!NOTE]
    > This is handled by the `ComplianceLayer` to ensure GDPR compliance for anonymous traffic.

---

## 🔗 Phase 3: Session Persistence & Merging

Verification that users are tracked correctly across context shifts.

### Test Case: Cross-Session Recognition
1.  Start a chat as an anonymous visitor.
2.  **Close the browser tab** and wait a few minutes.
3.  **Re-open the widget**: You should see your previous chat history intact.
4.  **Metadata Check**: The system captures `visitor_id` in `localStorage`. Verify this via DevTools -> Application -> Local Storage (key: `xd_vid_[workspace_key]`).

---

## 🖥️ Phase 4: Dashboard Intelligence

The agent dashboard now provides deep context into who they are talking to.

### Test Case: Metadata Visibility
1.  Start a chat from a page with UTM parameters (e.g., `?utm_source=test_campaign`).
2.  Open the **All Conversations** list in the Dashboard.
3.  **Verify Badges**: You should see a purple/blue badge for the UTM source and a gray badge showing the current page (e.g., `/index`).
4.  **Visitor Tag**: Unidentified users will have a "Visitor" tag next to their name.

---

## 🛠️ Technical Verification (CLI)

If you have access to the database, you can run these queries to verify the background logic:

```sql
-- Verify Visitor Sessions
SELECT * FROM visitor_sessions ORDER BY first_seen_at DESC LIMIT 5;

-- Verify Identity Linking
SELECT visitor_id, identified, claimed_email FROM conversations WHERE visitor_id = '[Your Visitor ID]';
```

---

> [!IMPORTANT]
> **Identity Merging**: When a user identifies themselves (Progressive Disclosure), the system automatically links their **entire anonymous history** to their new contact record. You can verify this by looking at the Contact Activity in the dashboard after identification.
