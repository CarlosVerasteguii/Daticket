'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Calendar, DollarSign, Store } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

type Receipt = {
    id: string
    store_name: string
    purchase_date: string
    total_amount: number
    image_url: string
}

export default function ReceiptList() {
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchReceipts() {
            const { data, error } = await supabase
                .from('receipts')
                .select('*')
                .order('purchase_date', { ascending: false })

            if (!error && data) {
                setReceipts(data)
            }
            setLoading(false)
        }
        fetchReceipts()
    }, [])

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (receipts.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <h3 className="mt-2 text-sm font-medium text-gray-900">No receipts</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by uploading your first receipt.</p>
                <div className="mt-6">
                    <Link
                        href="/upload"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        Upload Receipt
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {receipts.map((receipt) => (
                <div key={receipt.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
                    <div className="relative h-48 w-full bg-gray-100">
                        {/* Note: In a real app we need signed URLs for private buckets. 
                 For now assume we handle it or public for MVP, 
                 BUT we set private bucket so we need a signed URL or download mechanism.
                 Let's fix this in the fetch logic or display logic. 
                 Actually, simpler for MVP YOLO: Just use the Image component if we had signed URL,
                 or standard Supabase 'transform' URL if we had tokens.
                 
                 FIX: We will fetch signed URLs on the fly or just one for list.
                 Better: Use a StorageImage component that handles it.
              */}
                        <StorageImage path={receipt.image_url} alt={receipt.store_name} />
                    </div>
                    <div className="px-4 py-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 truncate flex items-center">
                                    <Store className="w-4 h-4 mr-1 text-gray-400" /> {receipt.store_name}
                                </h3>
                                <p className="text-sm text-gray-500 flex items-center mt-1">
                                    <Calendar className="w-3 h-3 mr-1" /> {receipt.purchase_date}
                                </p>
                            </div>
                            <div className="text-lg font-bold text-gray-900 flex items-center">
                                ${receipt.total_amount}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function StorageImage({ path, alt }: { path: string, alt: string }) {
    const [src, setSrc] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        async function getUrl() {
            // Only if it looks like a path (contains /)
            if (!path.includes('/')) return

            const { data } = await supabase.storage
                .from('receipts')
                .createSignedUrl(path, 3600) // 1 hour

            if (data) setSrc(data.signedUrl)
        }
        getUrl()
    }, [path])

    if (!src) return <div className="h-full w-full flex items-center justify-center text-gray-400 bg-gray-100">Loading...</div>

    return <Image src={src} alt={alt} fill className="object-cover" />
}
