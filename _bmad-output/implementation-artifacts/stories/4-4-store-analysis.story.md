# Story 4-4: Store-Wise Analysis

## Status: done

## Story
As a user viewing the dashboard,
I want to see a breakdown of my spending by store,
So that I can identify where I spend the most money.

## Acceptance Criteria

- [x] AC1: Horizontal bar chart showing top 5 stores by spending
- [x] AC2: Display total amount, visit count, and percentage share per store
- [x] AC3: Summary table with average per visit calculation
- [x] AC4: Animated bar growth on component mount
- [x] AC5: Empty state when no store data available
- [x] AC6: Responsive layout in dashboard grid

## Technical Context

### Implementation Approach
- Created `StoreAnalysisChart` component with horizontal bars + summary table
- Aggregates spending by store name, sorts by total amount
- Limits to top 5 stores for focused analysis
- Calculates avg/visit and percentage share

### Key Files
- `src/components/analytics/StoreAnalysisChart.tsx` - Chart component
- `src/app/dashboard/page.tsx` - Grid integration alongside trends chart

### Technical Details
- Bar width calculated as percentage of max store amount
- Swiss blue gradient (lighter for lower-ranked stores)
- Table shows avg/visit and % share
- Total row sums top 5 stores

## Definition of Done

- [x] Bar chart component created
- [x] Summary table with metrics
- [x] Integrated into dashboard 2-column grid
- [x] Build passes without errors
- [x] Story file documented

## Implementation Notes

### What Was Built
1. **StoreAnalysisChart component**:
   - Horizontal bars with percentage labels
   - Store ranking with visit counts
   - Summary table showing avg/visit and % share
   - Total footer for top 5 stores

2. **Dashboard integration**:
   - Added to 2-column analytics row alongside SpendingTrendsChart
   - Both charts receive currentPeriodReceipts
   - Responsive: stacks on mobile, side-by-side on desktop

### Technical Decisions
- Limited to top 5 stores for clarity and performance
- Used gradient blues for visual hierarchy
- Bar grows from 0 with Framer Motion for engagement
- Table provides detailed metrics below bars

## Completion Date
2025-01-31
