'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import ReceiptUpload from '@/components/receipts/ReceiptUpload'
import { ArrowLeft, Upload, FileText } from 'lucide-react'
import Link from 'next/link'

export default function UploadPage() {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
            }
        }
        checkAuth()
    }, [router, supabase])

    return (
        <DashboardShell>
            {/* Header */}
            <div className="flex items-center gap-4 p-6 border-b border-black bg-white">
                <Link href="/dashboard" className="p-2 hover:bg-neutral-100 border border-black">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tighter">Upload Receipt</h1>
                    <p className="text-sm text-neutral-500 mt-1">Add a new expense to your records</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-180px)]">
                {/* Left: Upload Area */}
                <div className="bg-white p-8 flex flex-col">
                    <div className="flex-1 border-2 border-dashed border-black bg-neutral-50 flex flex-col items-center justify-center p-8 text-center">
                        <div className="h-20 w-20 bg-black flex items-center justify-center mb-6">
                            <Upload className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Drop your receipt here</h3>
                        <p className="text-neutral-500 mb-6 max-w-sm">
                            Upload an image of your receipt. We'll extract the details automatically.
                        </p>
                        <ReceiptUpload />
                    </div>
                </div>

                {/* Right: Instructions */}
                <div className="bg-neutral-50 border-l border-black p-8">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        How it works
                    </h3>

                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="h-8 w-8 bg-black text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                            <div>
                                <h4 className="font-bold">Upload Image</h4>
                                <p className="text-sm text-neutral-600">Take a photo or select an existing image of your receipt.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="h-8 w-8 bg-black text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                            <div>
                                <h4 className="font-bold">Add Details</h4>
                                <p className="text-sm text-neutral-600">Enter the store name, amount, and select a category.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="h-8 w-8 bg-black text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                            <div>
                                <h4 className="font-bold">Save & Track</h4>
                                <p className="text-sm text-neutral-600">Your receipt is stored securely and added to your expense reports.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 p-4 border border-black bg-white">
                        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Supported Formats</p>
                        <p className="font-mono text-sm">JPG, PNG, PDF (max 10MB)</p>
                    </div>
                </div>
            </div>
        </DashboardShell>
    )
}
