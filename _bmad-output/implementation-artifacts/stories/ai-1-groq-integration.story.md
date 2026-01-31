# AI-1: Groq API Integration & OCR Logic

## Status: Done

## Story

As a **user uploading a receipt**,
I want the **system to automatically extract store name, total amount, and purchase date from my receipt image using AI**,
so that **I don't have to manually enter this information and can save time**.

## Context

**Feature:** AI-Powered Receipt Scanning with Groq Vision API
**Priority:** High
**Epic:** AI-Powered OCR (Groq Integration)

## Acceptance Criteria

### AC1: Groq Client Configuration ✅
- [x] Groq SDK is installed and configured (`groq-sdk` in package.json)
- [x] API key is configured via environment variable (`GROQ_API_KEY`)
- [x] Client is initialized with proper error handling

### AC2: Vision API Integration ✅
- [x] System can send image to Groq Vision API (`llama-3.2-11b-vision-preview` model)
- [x] Images are converted to base64 format before sending
- [x] Request includes structured prompt for data extraction
- [x] Response format is JSON for reliable parsing

### AC3: Receipt Data Extraction ✅
- [x] System extracts `store_name` from receipt
- [x] System extracts `total_amount` as a number
- [x] System extracts `purchase_date` in YYYY-MM-DD format
- [x] Extracted data is returned in structured format

### AC4: Error Handling ✅
- [x] API errors are caught and logged
- [x] Meaningful error messages are returned to the client
- [x] Failed scans don't crash the application

### AC5: UI Integration ✅
- [x] Scan is triggered automatically when image is selected
- [x] Progress indicator shows during AI analysis
- [x] Extracted fields are auto-populated in the form
- [x] User can edit extracted values before saving

## Technical Implementation

### Files Modified/Created:
- `src/actions/scan-receipt.ts` - Server action for Groq API calls
- `src/components/receipts/ReceiptUpload.tsx` - UI integration with scanning

### Dependencies Added:
- `groq-sdk: ^0.37.0`

### API Details:
- **Model:** `llama-3.2-11b-vision-preview`
- **Temperature:** 0 (deterministic output)
- **Response Format:** JSON object

### Code Architecture:
```
User selects image
    ↓
ReceiptUpload.handleFileSelect()
    ↓
handleScan() → scanReceipt() server action
    ↓
Groq Vision API call
    ↓
Parse JSON response
    ↓
Auto-populate form fields
```

## Definition of Done

- [x] Groq SDK properly configured
- [x] Vision API calls working
- [x] Data extraction returns structured JSON
- [x] Error handling in place
- [x] UI shows scanning progress
- [x] Form auto-populated with AI results
- [x] Build passes
- [x] No TypeScript errors

## Notes

- Implementation uses `llama-3.2-11b-vision-preview` for cost efficiency
- Response format set to JSON for reliable parsing
- Base64 encoding handles images up to 10MB
- Progress simulation improves UX during API call
