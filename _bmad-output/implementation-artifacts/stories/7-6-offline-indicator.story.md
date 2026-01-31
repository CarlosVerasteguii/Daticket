# Story 7-6: Offline Indicator

## Status: done

## Story
As a user, I want to see when I'm offline so that I understand why things might not work.

## Acceptance Criteria
- [x] AC1: Detect online/offline status using browser API
- [x] AC2: Green "ONLINE" badge when connected
- [x] AC3: Red "OFFLINE" badge when disconnected
- [x] AC4: WifiOff icon for offline state
- [x] AC5: Smooth animated transition between states
- [x] AC6: Real-time updates on network change

## Technical Implementation
- `navigator.onLine` for initial state
- `window.addEventListener('online'/'offline')` for real-time updates
- AnimatePresence for smooth badge transitions
- WifiOff icon from lucide-react
- State cleanup in useEffect return

## Files Changed
- `src/components/layout/DashboardShell.tsx` - Added network status detection

## DoD Checklist
- [x] All ACs implemented
- [x] Build passes
- [x] Works globally across all pages
- [x] Proper cleanup on unmount

## Completed
- Date: 2025-01-22
- Duration: ~3 minutes
