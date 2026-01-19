'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, Calendar, Store, DollarSign, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function ReceiptDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const supabase = createClient()
    const [receipt, setReceipt] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [imageUrl, setImageUrl] = useState<string | null>(null)

    useEffect(() => {
        async function fetchReceipt() {
            const { data, error } = await supabase
                .from('receipts')
                .select('*')
                .eq('id', params.id)
                .single()

            if (data) {
                setReceipt(data)
                // Get Signed URL
                if (data.image_url) {
                    const { data: signed } = await supabase.storage
                        .from('receipts')
                        .createSignedUrl(data.image_url, 3600)
                    if (signed) setImageUrl(signed.signedUrl)
                }
            }
            setLoading(false)
        }
        fetchReceipt()
    }, [params.id])

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this receipt? This cannot be undone.')) return

        setDeleting(true)
        try {
            // 1. Delete DB Record
            const { error: dbError } = await supabase
                .from('receipts')
                .delete()
                .eq('id', params.id)

            if (dbError) throw dbError

            // 2. Delete File (Optional for MVP - requires advanced cleanup or explicit delete)
            // Attempting delete if path is clear
            if (receipt.image_url) {
                await supabase.storage.from('receipts').remove([receipt.image_url])
            }

            router.push('/receipts')
            router.refresh()
        } catch (error: any) {
            alert('Error deleting receipt: ' + error.message)
            setDeleting(false)
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>

    if (!receipt) return <div className="text-center p-12">Receipt not found</div>

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex justify-between items-center">
                    <Link href="/receipts" className="flex items-center text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to List
                    </Link>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                        {deleting ? 'Deleting...' : <><Trash2 className="w-4 h-4 mr-2" /> Delete Receipt</>}
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-lg overflow-hidden grid md:grid-cols-2 gap-0">
                    {/* Image Section */}
                    <div className="bg-gray-100 relative h-96 md:h-auto min-h-[400px]">
                        {imageUrl ? (
                            <Image
                                src={imageUrl}
                                alt={receipt.store_name}
                                fill
                                className="object-contain p-4"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                        )}
                    </div>

                    {/* Details Section */}
                    <div className="p-8 space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{receipt.store_name}</h1>
                            <p className="text-sm text-gray-500 mt-1">Uploaded {new Date(receipt.created_at).toLocaleDateString()}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center text-lg">
                                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                                <span className="font-medium">{receipt.purchase_date}</span>
                            </div>
                            <div className="flex items-center text-3xl font-bold text-indigo-600">
                                <DollarSign className="w-6 h-6 mr-1" />
                                {receipt.total_amount.toFixed(2)}
                            </div>
                        </div>

                        {receipt.notes && (
                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
                                <p className="text-gray-600 whitespace-pre-wrap">{receipt.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
