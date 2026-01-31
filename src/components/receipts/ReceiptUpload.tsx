'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, X, Sparkles, Camera, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import CategoryManager from '@/components/categories/CategoryManager'
import { scanReceipt } from '@/actions/scan-receipt'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function ReceiptUpload() {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [storeName, setStoreName] = useState('')
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [categoryId, setCategoryId] = useState<string | null>(null)
    const [scanProgress, setScanProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleClear = () => {
        setFile(null)
        setPreview(null)
        setStoreName('')
        setAmount('')
        setScanProgress(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleScan = async (fileToScan: File) => {
        setScanning(true)
        setScanProgress(0)
        
        // Simulate progress
        const progressInterval = setInterval(() => {
            setScanProgress(prev => Math.min(prev + 10, 80))
        }, 200)
        
        try {
            const formData = new FormData()
            formData.append('file', fileToScan)
            const data = await scanReceipt(formData)

            clearInterval(progressInterval)
            setScanProgress(100)

            if (data) {
                if (data.store_name) setStoreName(data.store_name)
                if (data.total_amount) setAmount(data.total_amount.toString())
                if (data.purchase_date) setDate(data.purchase_date)
            }
        } catch (error) {
            console.error("Scan failed", error)
            clearInterval(progressInterval)
        } finally {
            setTimeout(() => {
                setScanning(false)
                setScanProgress(0)
            }, 500)
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

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && droppedFile.type.startsWith('image/')) {
            if (droppedFile.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB')
                return
            }
            setFile(droppedFile)
            setPreview(URL.createObjectURL(droppedFile))
            handleScan(droppedFile)
        }
    }

    return (
        <div className="w-full max-w-lg mx-auto">
            <form onSubmit={handleUpload} className="space-y-6">
                {/* File Input Zone - Swiss Style */}
                <AnimatePresence mode="wait">
                    {!preview ? (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="group border-2 border-dashed border-black bg-white p-12 text-center cursor-pointer hover:bg-neutral-50 hover:border-swiss-blue transition-all duration-300 relative overflow-hidden"
                        >
                            <motion.div 
                                className="h-16 w-16 bg-black flex items-center justify-center mx-auto mb-4 group-hover:bg-swiss-blue transition-colors"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                                <Upload className="w-8 h-8 text-white" />
                            </motion.div>
                            <p className="text-black font-bold text-lg mb-2">Drop your receipt here</p>
                            <p className="text-sm text-neutral-500 font-mono">or click to browse files</p>
                            <p className="text-xs text-neutral-400 mt-4">JPG, PNG up to 10MB</p>
                            
                            {/* Hover effect */}
                            <motion.div 
                                className="absolute inset-0 bg-swiss-blue/5 opacity-0 group-hover:opacity-100 transition-opacity"
                                initial={false}
                            />
                            
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="preview"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative border border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <motion.button
                                type="button"
                                onClick={handleClear}
                                className="absolute top-3 right-3 bg-black text-white p-2 hover:bg-swiss-orange transition-colors z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X className="w-4 h-4" />
                            </motion.button>
                            
                            <div className="relative h-64 w-full bg-neutral-100">
                                <Image
                                    src={preview}
                                    alt="Receipt preview"
                                    fill
                                    className={cn(
                                        "object-contain transition-all duration-500",
                                        scanning && "opacity-50 blur-sm scale-105"
                                    )}
                                />
                                
                                {/* Scanning Overlay */}
                                <AnimatePresence>
                                    {scanning && (
                                        <motion.div 
                                            className="absolute inset-0 flex flex-col items-center justify-center"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <motion.div 
                                                className="bg-white border-2 border-black px-6 py-4 flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                                                initial={{ y: 20 }}
                                                animate={{ y: 0 }}
                                            >
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                >
                                                    <Sparkles className="w-5 h-5 text-swiss-blue" />
                                                </motion.div>
                                                <div>
                                                    <span className="font-bold text-sm uppercase tracking-wider block">Analyzing via AI...</span>
                                                    <div className="w-full h-1 bg-neutral-200 mt-2 overflow-hidden">
                                                        <motion.div 
                                                            className="h-full bg-swiss-blue"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${scanProgress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Success Indicator */}
                                <AnimatePresence>
                                    {!scanning && scanProgress === 100 && (
                                        <motion.div 
                                            className="absolute top-3 left-3 bg-swiss-green text-white px-3 py-1.5 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase">Scanned</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Metadata Inputs - Swiss Style */}
                <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: preview ? 1 : 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <AnimatePresence>
                        {preview && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
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
                                        className="w-full px-4 py-3 border border-black font-medium focus:outline-none focus:ring-2 focus:ring-swiss-blue disabled:bg-neutral-100 disabled:text-neutral-400 transition-all hover:border-neutral-400"
                                    />
                                </motion.div>

                                <motion.div 
                                    className="grid grid-cols-2 gap-4"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
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
                                            className="w-full px-4 py-3 border border-black font-mono focus:outline-none focus:ring-2 focus:ring-swiss-blue disabled:bg-neutral-100 transition-all hover:border-neutral-400"
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
                                                className="w-full pl-8 pr-4 py-3 border border-black font-mono text-xl focus:outline-none focus:ring-2 focus:ring-swiss-blue disabled:bg-neutral-100 transition-all hover:border-neutral-400"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Category Section */}
                <AnimatePresence>
                    {preview && (
                        <motion.div 
                            className="border-t border-black pt-6"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <CategoryManager
                                selectedId={categoryId || undefined}
                                onSelect={setCategoryId}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Submit Button - Swiss Style */}
                <AnimatePresence>
                    {preview && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                        >
                            <motion.button
                                type="submit"
                                disabled={!file || uploading || scanning}
                                className="w-full py-4 bg-black text-white font-bold text-sm uppercase tracking-wider hover:bg-neutral-800 transition-all border border-black disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] hover:-translate-x-0.5 hover:-translate-y-0.5"
                                whileHover={!uploading && !scanning ? { scale: 1.01 } : {}}
                                whileTap={!uploading && !scanning ? { scale: 0.99 } : {}}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="animate-spin h-4 w-4" />
                                        Uploading...
                                    </>
                                ) : scanning ? (
                                    <>
                                        <Sparkles className="animate-spin h-4 w-4" />
                                        Scanning...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        Save Receipt
                                    </>
                                )}
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>
        </div>
    )
}
