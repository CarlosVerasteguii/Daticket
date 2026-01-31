# AI-3: OCR Error Handling & Fallbacks

## Status: Done

## Story

As a **user scanning a receipt**,
I want to **see clear error messages and have manual override options when AI scanning fails**,
so that **I can still complete my receipt upload even if the AI cannot extract the data**.

## Context

**Feature:** AI-Powered Receipt Scanning
**Priority:** High
**Epic:** AI OCR with Groq

## Acceptance Criteria

### AC1: Typed Result Structure ✅
- [x] `scanReceipt` returns typed `ScanResult` object
- [x] Contains success flag, data, error, confidence level, partial flag
- [x] Error codes: API_ERROR, PARSE_ERROR, NO_RESPONSE, INVALID_IMAGE, RATE_LIMIT, TIMEOUT, UNKNOWN

### AC2: Automatic Retry with Backoff ✅
- [x] Failed requests automatically retry up to 2 times
- [x] Exponential backoff delay between retries
- [x] Rate limit errors are not retried (exit early)

### AC3: Partial Match Handling ✅
- [x] If only some fields are extracted, returns `partial: true`
- [x] Confidence levels: high (3 fields), medium (2 fields), low (1 field)
- [x] UI shows yellow warning for partial matches
- [x] Fields that couldn't be extracted are highlighted

### AC4: Error State UI ✅
- [x] Error overlay with clear error message
- [x] Retry button (if error is retryable)
- [x] "Enter Manually" button to skip AI
- [x] Swiss design aesthetic maintained

### AC5: Manual Override Mode ✅
- [x] User can bypass AI completely
- [x] Form fields become available immediately
- [x] "Manual Entry" indicator badge shown
- [x] All fields still required for save

### AC6: Scan State Machine ✅
- [x] States: idle, scanning, success, partial, error
- [x] Clean transitions between states
- [x] UI updates appropriately for each state

## Technical Implementation

### Files Modified:
- `src/actions/scan-receipt.ts` - Complete rewrite with error handling
- `src/components/receipts/ReceiptUpload.tsx` - State machine + error UI

### Key Changes:

**Server Action (`scan-receipt.ts`):**
- Added `ScanResult` type with structured error codes
- `validateParsedData()` function for confidence scoring
- Retry loop with exponential backoff
- Graceful handling of parse failures
- JSON extraction from malformed responses

**Component (`ReceiptUpload.tsx`):**
- `ScanState` type: 'idle' | 'scanning' | 'success' | 'partial' | 'error'
- `scanError` state for error details
- `manualMode` state for bypass
- Error overlay with retry/manual buttons
- Partial match warning banner
- Field highlighting for missing data
- Confidence-based badge colors

### Error Codes:
| Code | Description | Retryable |
|------|-------------|-----------|
| API_ERROR | Groq API failure | Yes |
| PARSE_ERROR | JSON parsing failed | No |
| NO_RESPONSE | Empty AI response | Yes |
| INVALID_IMAGE | Not an image file | No |
| RATE_LIMIT | Too many requests | Yes |
| TIMEOUT | Request timed out | Yes |
| UNKNOWN | Unexpected error | Yes |

## Definition of Done

- [x] Typed ScanResult returned from server action
- [x] Automatic retry with backoff (2 retries max)
- [x] Partial match handling with confidence levels
- [x] Error overlay with retry and manual options
- [x] Manual entry mode works correctly
- [x] Form still validates all required fields
- [x] Build passes
- [x] No TypeScript errors

## Notes

- Rate limit errors exit early without retry (would just hit limit again)
- Parse errors also skip retry (same malformed response expected)
- Confidence is determined by number of successfully extracted fields
- UI preserves Swiss design aesthetic with error states
