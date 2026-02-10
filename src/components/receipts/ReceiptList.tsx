'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Calendar, Store } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

type Category = {
    id: string
    name: string
    color: string
}

type ReceiptFile = {
    id: string
    bucket_id: string
    path: string
    mime_type: string | null
    size_bytes: number | null
}

type Receipt = {
    id: string
    store_name: string | null
    purchase_date: string | null
    total_amount: number | null
    primary_file: ReceiptFile | ReceiptFile[] | null
    thumbnail_file: ReceiptFile | ReceiptFile[] | null
    categories: Category | Category[] | null
}

export default function ReceiptList() {
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([])
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        async function fetchData() {
            const [receiptsRes, categoriesRes] = await Promise.all([
                supabase
                    .from('receipts')
                    .select(`
                        id,
                        store_name,
                        purchase_date,
                        total_amount,
                        categories(*),
                        primary_file:receipt_files!receipts_primary_file_id_fkey(
                            id,
                            bucket_id,
                            path,
                            mime_type,
                            size_bytes
                        ),
                        thumbnail_file:receipt_files!receipts_thumbnail_file_id_fkey(
                            id,
                            bucket_id,
                            path,
                            mime_type,
                            size_bytes
                        )
                    `)
                    .order('purchase_date', { ascending: false }),
                supabase.from('categories').select('id, name').order('name')
            ])

            if (receiptsRes.data) {
                setReceipts(receiptsRes.data as unknown as Receipt[])
            }
            if (categoriesRes.data) setCategories(categoriesRes.data)
            setLoading(false)
        }
        fetchData()
    }, [supabase])

    const getCategory = (cats: Receipt['categories']): Category | null => {
        if (!cats) return null
        return Array.isArray(cats) ? (cats[0] ?? null) : cats
    }

    const getFile = (file: Receipt['primary_file'] | Receipt['thumbnail_file']): ReceiptFile | null => {
        if (!file) return null
        return Array.isArray(file) ? (file[0] ?? null) : file
    }

    const filteredReceipts = selectedCategory
        ? receipts.filter(r => getCategory(r.categories)?.id === selectedCategory)
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
                        Todas
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
                        {selectedCategory ? 'No hay recibos en esta categoría' : 'No hay recibos'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {selectedCategory ? 'Prueba seleccionando otra categoría.' : 'Empieza subiendo tu primer recibo.'}
                    </p>
                    {!selectedCategory && (
                        <div className="mt-6">
                            <Link
                                href="/upload"
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                Subir recibo
                            </Link>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredReceipts.map((receipt) => {
                        const primary = getFile(receipt.primary_file)
                        const thumb = getFile(receipt.thumbnail_file)

                        return (
                        <div key={receipt.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
                            <div className="relative h-48 w-full bg-gray-100">
                                <StorageImage
                                    path={thumb?.path ?? primary?.path ?? null}
                                    alt={receipt.store_name}
                                />
                            </div>
                            <div className="px-4 py-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 truncate flex items-center">
                                            <Store className="w-4 h-4 mr-1 text-gray-400" /> {receipt.store_name || 'Desconocida'}
                                        </h3>
                                        <p className="text-sm text-gray-500 flex items-center mt-1">
                                            <Calendar className="w-3 h-3 mr-1" /> {receipt.purchase_date || 'N/D'}
                                        </p>
                                        {(() => {
                                            const cat = getCategory(receipt.categories)
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
                                        ${receipt.total_amount ?? 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function StorageImage({ path, alt }: { path: string | null, alt: string | null }) {
    const [src, setSrc] = useState<string | null>(null)
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        async function getUrl() {
            setSrc(null)
            if (!path) return
            // Only if it looks like a path (contains /)
            if (!path.includes('/')) return

            const { data } = await supabase.storage
                .from('receipts')
                .createSignedUrl(path, 3600) // 1 hour

            if (data) setSrc(data.signedUrl)
        }
        getUrl()
    }, [path, supabase])

    if (!src) return <div className="h-full w-full flex items-center justify-center text-gray-400 bg-gray-100">Cargando...</div>

    return <Image src={src} alt={alt || 'Recibo'} fill className="object-cover" />
}
