---
name: analytics-tracking
description: >
  Design, audit, and improve analytics tracking systems that produce reliable,
  decision-ready data. Use when the user wants to set up, fix, or evaluate
  analytics tracking (GA4, GTM, product analytics, events, conversions, UTMs).
  This skill focuses on measurement strategy, signal quality, and validation—
  not just firing events.
---

# Analytics Tracking & Measurement Strategy

## Core Principles

1.  **Track for Decisions, Not Curiosity:** Every event should help answer a question (e.g., "Do users abandon the receipt upload form?").
2.  **Naming Conventions (Segment/Rudderstack style):**
    *   `Object Action` (e.g., `Receipt Uploaded`, `Budget Created`).
    *   Properties: `snake_case` (e.g., `total_amount`, `merchant_name`).
3.  **Data Quality Beats Volume:** It's better to track 5 key events perfectly than 100 broken ones.

## Recommended Tracking Plan for Daticket

### Key Events
| Event Name | Trigger | Key Properties |
| :--- | :--- | :--- |
| `User Signed Up` | Successful registration | `method` (email/google), `role` |
| `Receipt Scanned` | User completes scan | `store_name`, `total_amount`, `item_count`, `ocr_confidence` |
| `Receipt Verified` | User confirms/edits OCR | `edits_made` (boolean) |
| `Budget Created` | New budget set | `category`, `amount`, `period` |
| `Alert Triggered` | Spending > Budget | `category`, `percentage_over` |

### Measurement Readiness Checklist

- [ ] **Event Definition:** Are all events clearly defined in a Tracking Plan?
- [ ] **Identity Management:** Are we correctly identifying users across sessions?
- [ ] **Validation:** Have we verified that the tracked data matches the DB data?
- [ ] **Privacy:** Are we PII-compliant? (Avoid tracking passwords, full data in URLs).

## Implementation Tips
- Use a wrapper function for tracking (e.g., `trackEvent(name, props)`) to allow swapping providers (Supabase Analytics, PostHog, GA4) easily.
- Log tracking events to console in Development mode for debugging.
