'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, X, Sparkles } from 'lucide-react'
import Image from 'next/image'
import CategoryManager from '@/components/categories/CategoryManager'
import { scanReceipt } from '@/actions/scan-receipt'

export default function ReceiptUpload() {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [storeName, setStoreName] = useState('')
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [categoryId, setCategoryId] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleClear = () => {
        setFile(null)
        setPreview(null)
        setStoreName('')
        setAmount('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleScan = async (fileToScan: File) => {
        setScanning(true)
        try {
            const formData = new FormData()
            formData.append('file', fileToScan)
            const data = await scanReceipt(formData)

            if (data) {
                if (data.store_name) setStoreName(data.store_name)
                if (data.total_amount) setAmount(data.total_amount.toString())
                if (data.purchase_date) setDate(data.purchase_date)
            }
        } catch (error) {
            console.error("Scan failed", error)
            alert("Could not scan receipt. Please enter details manually.")
        } finally {
            setScanning(false)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            if (selectedFile.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB')
                return
            }
            setFile(selectedFile)
            setPreview(URL.createObjectURL(selectedFile))
            handleScan(selectedFile)
        }
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setUploading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const imageUrl = fileName

            const { error: dbError } = await supabase
                .from('receipts')
                .insert({
                    user_id: user.id,
                    store_name: storeName,
                    total_amount: parseFloat(amount),
                    purchase_date: date,
                    image_url: imageUrl,
                    category_id: categoryId
                })

            if (dbError) throw dbError

            router.push('/receipts')
            router.refresh()
        } catch (error: any) {
            alert('Error uploading receipt: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="w-full max-w-lg mx-auto">
            <form onSubmit={handleUpload} className="space-y-6">
                {/* File Input Zone - Swiss Style */}
                {!preview ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-black bg-white p-12 text-center cursor-pointer hover:bg-neutral-50 transition-colors"
                    >
                        <div className="h-16 w-16 bg-black flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-black font-bold text-lg">Click to upload or take photo</p>
                        <p className="text-xs text-neutral-500 font-mono mt-2">JPG, PNG up to 10MB</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </div>
                ) : (
                    <div className="relative border border-black overflow-hidden">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute top-2 right-2 bg-black text-white p-2 hover:bg-neutral-800 z-10"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="relative h-64 w-full bg-neutral-100">
                            <Image
                                src={preview}
                                alt="Receipt preview"
                                fill
                                className={`object-contain ${scanning ? 'opacity-50 blur-sm' : ''}`}
                            />
                            {scanning && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="bg-white border border-black px-4 py-3 flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <Sparkles className="w-5 h-5 animate-spin" />
                                        <span className="font-bold text-sm uppercase tracking-wider">Analyzing via AI...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Metadata Inputs - Swiss Style */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                            Store Name
                        </label>
                        <input
                            type="text"
                            required
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            placeholder="e.g. Walmart"
                            disabled={scanning}
                            className="w-full px-4 py-3 border border-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-100 disabled:text-neutral-400"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                disabled={scanning}
                                className="w-full px-4 py-3 border border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                Total Amount
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-mono">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    disabled={scanning}
                                    className="w-full pl-8 pr-4 py-3 border border-black font-mono text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-100"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Category Section */}
                <div className="border-t border-black pt-6">
                    <CategoryManager
                        selectedId={categoryId || undefined}
                        onSelect={setCategoryId}
                    />
                </div>

                {/* Submit Button - Swiss Style */}
                <button
                    type="submit"
                    disabled={!file || uploading || scanning}
                    className="w-full py-4 bg-black text-white font-bold text-sm uppercase tracking-wider hover:bg-neutral-800 transition-colors border border-black disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="animate-spin h-4 w-4" />
                            Uploading...
                        </>
                    ) : (
                        'Save Receipt'
                    )}
                </button>
            </form>
        </div>
    )
}
