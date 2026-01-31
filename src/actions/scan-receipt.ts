'use server'

import Groq from 'groq-sdk'

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
})

export type ScanResult = {
    success: boolean
    data?: {
        store_name?: string
        total_amount?: number | string
        purchase_date?: string
    }
    error?: {
        code: 'API_ERROR' | 'PARSE_ERROR' | 'NO_RESPONSE' | 'INVALID_IMAGE' | 'RATE_LIMIT' | 'TIMEOUT' | 'UNKNOWN'
        message: string
        retryable: boolean
    }
    confidence?: 'high' | 'medium' | 'low'
    partial?: boolean
}

const MAX_RETRIES = 2
const RETRY_DELAY = 1000

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function validateParsedData(data: Record<string, unknown>): { 
    isValid: boolean
    confidence: 'high' | 'medium' | 'low'
    partial: boolean
} {
    const hasStoreName = typeof data.store_name === 'string' && data.store_name.trim().length > 0
    const hasAmount = data.total_amount !== undefined && data.total_amount !== null && !isNaN(Number(data.total_amount))
    const hasDate = typeof data.purchase_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.purchase_date)
    
    const fieldsCount = [hasStoreName, hasAmount, hasDate].filter(Boolean).length
    
    if (fieldsCount === 3) {
        return { isValid: true, confidence: 'high', partial: false }
    } else if (fieldsCount >= 1) {
        return { isValid: true, confidence: fieldsCount === 2 ? 'medium' : 'low', partial: true }
    }
    
    return { isValid: false, confidence: 'low', partial: true }
}

export async function scanReceipt(formData: FormData): Promise<ScanResult> {
    const file = formData.get('file') as File

    if (!file) {
        return {
            success: false,
            error: {
                code: 'INVALID_IMAGE',
                message: 'No file provided',
                retryable: false
            }
        }
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        return {
            success: false,
            error: {
                code: 'INVALID_IMAGE',
                message: 'File must be an image',
                retryable: false
            }
        }
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64Image}`

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`Retry attempt ${attempt}/${MAX_RETRIES}...`)
                await delay(RETRY_DELAY * attempt)
            }

            console.log('Sending request to Groq...')
            
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Analyze this receipt image and extract the following fields. If a field cannot be determined, use null.
Return ONLY a JSON object with these exact keys:
- store_name: string (the store or merchant name)
- total_amount: number (the total amount paid, without currency symbol)
- purchase_date: string (date in YYYY-MM-DD format)

Example: {"store_name": "Walmart", "total_amount": 45.99, "purchase_date": "2024-01-15"}`,
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: dataUrl,
                                },
                            },
                        ],
                    },
                ],
                model: 'llama-3.2-11b-vision-preview',
                temperature: 0,
                response_format: { type: 'json_object' }
            })

            const content = chatCompletion.choices[0]?.message?.content
            console.log('Groq Response:', content)

            if (!content) {
                throw new Error('NO_RESPONSE')
            }

            // Clean and parse response
            const cleanedContent = content
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
                .trim()

            let parsed: Record<string, unknown>
            try {
                parsed = JSON.parse(cleanedContent)
            } catch {
                // Try to extract JSON from response if it contains extra text
                const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0])
                } else {
                    throw new Error('PARSE_ERROR')
                }
            }

            const validation = validateParsedData(parsed)
            
            if (!validation.isValid) {
                return {
                    success: false,
                    error: {
                        code: 'PARSE_ERROR',
                        message: 'Could not extract any valid fields from the receipt',
                        retryable: true
                    },
                    partial: true
                }
            }

            // Normalize the data
            const normalizedData = {
                store_name: typeof parsed.store_name === 'string' ? parsed.store_name.trim() : undefined,
                total_amount: parsed.total_amount !== null && parsed.total_amount !== undefined 
                    ? Number(parsed.total_amount) 
                    : undefined,
                purchase_date: typeof parsed.purchase_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.purchase_date)
                    ? parsed.purchase_date
                    : undefined
            }

            return {
                success: true,
                data: normalizedData,
                confidence: validation.confidence,
                partial: validation.partial
            }

        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error))
            console.error(`Scan attempt ${attempt + 1} failed:`, lastError)

            // Check if error is retryable
            const errorMessage = lastError.message.toLowerCase()
            const isRateLimitError = errorMessage.includes('rate') || errorMessage.includes('429')
            const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('timed out')
            
            if (isRateLimitError) {
                return {
                    success: false,
                    error: {
                        code: 'RATE_LIMIT',
                        message: 'Too many requests. Please wait a moment and try again.',
                        retryable: true
                    }
                }
            }

            if (isTimeoutError && attempt === MAX_RETRIES) {
                return {
                    success: false,
                    error: {
                        code: 'TIMEOUT',
                        message: 'Request timed out. Please try again.',
                        retryable: true
                    }
                }
            }

            // Don't retry on parse errors or if it's the last attempt
            if (lastError.message === 'PARSE_ERROR' || lastError.message === 'NO_RESPONSE') {
                break
            }
        }
    }

    // All retries failed
    const errorCode = lastError?.message === 'PARSE_ERROR' ? 'PARSE_ERROR'
        : lastError?.message === 'NO_RESPONSE' ? 'NO_RESPONSE'
        : 'API_ERROR'

    return {
        success: false,
        error: {
            code: errorCode,
            message: errorCode === 'PARSE_ERROR' 
                ? 'Could not parse the receipt. Please enter details manually.'
                : errorCode === 'NO_RESPONSE'
                ? 'No response from AI. Please try again or enter details manually.'
                : `Failed to scan receipt: ${lastError?.message || 'Unknown error'}`,
            retryable: errorCode !== 'PARSE_ERROR'
        }
    }
}
