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
    categories: {
        id: string
        name: string
        color: string
    } | null // Supabase returns object for single relation if not array mode, but let's be safe
}

export default function ReceiptList() {
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([])
    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            const [receiptsRes, categoriesRes] = await Promise.all([
                supabase.from('receipts').select('*, categories(*)').order('purchase_date', { ascending: false }),
                supabase.from('categories').select('id, name').order('name')
            ])

            if (receiptsRes.data) {
                // Cast or transform if needed. ensuring categories is treated correctly.
                // If it's an array (which it might be if relationship is ambiguous), take first.
                // But usually with category_id FK it is singular.
                setReceipts(receiptsRes.data as any)
            }
            if (categoriesRes.data) setCategories(categoriesRes.data)
            setLoading(false)
        }
        fetchData()
    }, [])

    const filteredReceipts = selectedCategory
        ? receipts.filter(r => (Array.isArray(r.categories) ? r.categories[0]?.id : r.categories?.id) === selectedCategory)
        : receipts



    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Filter Controls */}
            {receipts.length > 0 && (
                <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${!selectedCategory
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedCategory === cat.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            {filteredReceipts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                        {selectedCategory ? 'No receipts in this category' : 'No receipts'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {selectedCategory ? 'Try selecting a different category.' : 'Get started by uploading your first receipt.'}
                    </p>
                    {!selectedCategory && (
                        <div className="mt-6">
                            <Link
                                href="/upload"
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                Upload Receipt
                            </Link>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredReceipts.map((receipt) => (
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
                                        {/* @ts-ignore - Supabase join inference */}
                                        {/* Handle categories being potentially an array or object */}
                                        {(() => {
                                            // @ts-ignore
                                            const cats = receipt.categories
                                            const cat = Array.isArray(cats) ? cats[0] : cats
                                            if (!cat) return null
                                            return (
                                                <span
                                                    className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                                                    style={{ backgroundColor: cat.color || '#64748b' }}
                                                >
                                                    {cat.name}
                                                </span>
                                            )
                                        })()}
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 flex items-center">
                                        ${receipt.total_amount}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
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
