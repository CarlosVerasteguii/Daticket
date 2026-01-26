'use server'

import Groq from 'groq-sdk'

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
})

export async function scanReceipt(formData: FormData) {
    const file = formData.get('file') as File

    if (!file) {
        throw new Error('No file provided')
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64Image}`

    try {
        console.log('Sending request to Groq...')
        // Use a simplified model or check key.
        // NOTE: 'llama-3.2-90b-vision-preview' is correct.
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Analyze this receipt image and extract: store_name, total_amount, purchase_date (YYYY-MM-DD). Return ONLY JSON.`,
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
            response_format: { type: 'json_object' } // Enforce JSON if supported, or rely on prompt
        })

        const content = chatCompletion.choices[0]?.message?.content
        console.log('Groq Response:', content)

        if (!content) throw new Error('No response from AI')

        const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim()
        return JSON.parse(cleanedContent)

    } catch (error: any) {
        console.error('Error scanning receipt:', error)
        // Extract more details if available
        if (error.error) console.error('Groq API Error:', error.error)
        throw new Error(`Failed to scan receipt: ${error.message}`)
    }
}
