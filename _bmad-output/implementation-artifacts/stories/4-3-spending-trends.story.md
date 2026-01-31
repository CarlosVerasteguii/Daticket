# Story 4-3: Spending Trends Line Chart

## Status: done

## Story
As a user viewing the dashboard,
I want to see a line chart showing my spending trends over time,
So that I can identify patterns in my spending behavior.

## Acceptance Criteria

- [x] AC1: Line chart showing daily/weekly/monthly spending based on period
- [x] AC2: Chart updates when time period selector changes
- [x] AC3: Trend indicator showing increase/decrease vs previous period
- [x] AC4: Area fill under line for visual clarity
- [x] AC5: Animated line drawing on mount
- [x] AC6: Stats summary (average, highest, data points)
- [x] AC7: Empty state when no data available

## Technical Context

### Implementation Approach
- Created `SpendingTrendsChart` component with SVG line/area chart
- Dynamic grouping: days for week/month, weeks for quarter, months for year
- Calculate trend by comparing first half vs second half of period
- Framer Motion for line path animation

### Key Files
- `src/components/analytics/SpendingTrendsChart.tsx` - Chart component
- `src/app/dashboard/page.tsx` - Integration into dashboard

### Technical Details
- SVG viewBox: 100x50 with padding for labels
- Grid lines at 25%, 50%, 75% of max value
- Path animation using pathLength from 0 to 1
- Color coding: orange for increasing spend, green for decreasing, neutral for stable
- Trend threshold: ±5% considered stable

## Definition of Done

- [x] Line chart component created
- [x] Integrates with period selector
- [x] Shows trend direction indicator
- [x] Stats row with avg, max, count
- [x] Build passes without errors
- [x] Story file documented

## Implementation Notes

### What Was Built
1. **SpendingTrendsChart component**:
   - SVG-based line chart with area fill
   - Animated path drawing with Framer Motion
   - Dynamic point circles with staggered animation
   - Trend badge showing % change

2. **Dashboard integration**:
   - Added full-width section below metric cards
   - Receives currentPeriodReceipts and selectedPeriod props
   - Chart auto-groups data based on period length

### Technical Decisions
- Used SVG for consistent rendering across devices
- getGroupKey() normalizes dates for aggregation
- Filtered x-axis labels to prevent crowding (max 7 visible)
- Trend calculated by comparing period halves for relative change

## Completion Date
2025-01-31
