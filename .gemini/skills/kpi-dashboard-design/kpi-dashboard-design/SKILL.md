---
name: kpi-dashboard-design
description: Design effective KPI dashboards with metrics selection, visualization best practices, and real-time monitoring patterns. Use when building business dashboards, selecting metrics, or designing data visualization layouts.
---

# KPI Dashboard Design: The Art of Actionable Metrics

## Core Concepts

### 1. KPI Framework
Effective dashboards answer specific business questions. Avoid "vanity metrics" (numbers that look good but don't drive action).

- **Input Metrics:** Actions you can control (e.g., "Number of receipts scanned").
- **Output Metrics:** Results of those actions (e.g., "Total spending tracked").
- **Lagging Indicators:** Report past performance (e.g., "Last month's budget").
- **Leading Indicators:** Predict future performance (e.g., "Spending pace this week").

### 2. SMART KPIs
- **S**pecific
- **M**easurable
- **A**achievable
- **R**elevant
- **T**ime-bound

### 3. Dashboard Hierarchy
1.  **Level 1: Operational (Real-time).** For monitoring active processes. (e.g., "Receipt processing status").
2.  **Level 2: Analytical (Trends).** For understanding "why" things happen. (e.g., "Spending by category over 6 months").
3.  **Level 3: Strategic (Executive).** For high-level health checks. (e.g., "Monthly burn rate vs Budget").

## Visualization Rules (The "Daticket" Standard)

1.  **Comparisons are Key:** A number without context is meaningless. Always show:
    *   vs. Last Period (MoM, YoY)
    *   vs. Target/Budget
    *   vs. Average
2.  **Chart Selection:**
    *   **Trend:** Line Area chart.
    *   **Comparison:** Bar chart.
    *   **Composition:** Stacked Bar (Avoid Pie charts if > 3 categories).
    *   **Distribution:** Histogram.
3.  **Color Usage:**
    *   Use color *only* to highlight (e.g., Red for over-budget, Green for savings).
    *   Use neutral greys for context data.

## Implementation Checklist

- [ ] Define the primary audience (User vs Admin).
- [ ] Select 3-5 "North Star" metrics.
- [ ] Establish comparison baselines (Last month vs Current month).
- [ ] Design the layout: Critical numbers top-left, trends in the middle, details at the bottom.
- [ ] Add "Action" buttons (e.g., "Adjust Budget" next to an over-budget alert).
