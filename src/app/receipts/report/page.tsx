'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Receipt {
    id: string
    store_name: string | null
    purchase_date: string | null
    total_amount: number | null
    category_name: string | null
}

function ReportContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [loading, setLoading] = useState(true)
    const [reportPeriod, setReportPeriod] = useState('')

    useEffect(() => {
        const fetchReceipts = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            // Get date range from URL params or default to last 30 days
            const startParam = searchParams.get('start')
            const endParam = searchParams.get('end')
            
            const end = endParam ? new Date(endParam) : new Date()
            const start = startParam ? new Date(startParam) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
            
            setReportPeriod(`${start.toLocaleDateString()} - ${end.toLocaleDateString()}`)

            const { data } = await supabase
                .from('receipts')
                .select(`
                    id,
                    store_name,
                    purchase_date,
                    total_amount,
                    categories(name)
                `)
                .gte('purchase_date', start.toISOString().split('T')[0])
                .lte('purchase_date', end.toISOString().split('T')[0])
                .order('purchase_date', { ascending: false })

            if (data) {
                const formattedData = data.map((r: any) => ({
                    ...r,
                    category_name: r.categories?.name || null
                }))
                setReceipts(formattedData)
            }
            setLoading(false)
        }
        fetchReceipts()
    }, [router, supabase, searchParams])

    const totalAmount = useMemo(() => 
        receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0)
    , [receipts])

    const categoryBreakdown = useMemo(() => {
        const breakdown: Record<string, { count: number; total: number }> = {}
        receipts.forEach(r => {
            const cat = r.category_name || 'Uncategorized'
            if (!breakdown[cat]) breakdown[cat] = { count: 0, total: 0 }
            breakdown[cat].count++
            breakdown[cat].total += r.total_amount || 0
        })
        return Object.entries(breakdown)
            .sort((a, b) => b[1].total - a[1].total)
    }, [receipts])

    const storeBreakdown = useMemo(() => {
        const breakdown: Record<string, { count: number; total: number }> = {}
        receipts.forEach(r => {
            const store = r.store_name || 'Unknown'
            if (!breakdown[store]) breakdown[store] = { count: 0, total: 0 }
            breakdown[store].count++
            breakdown[store].total += r.total_amount || 0
        })
        return Object.entries(breakdown)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 10) // Top 10 stores
    }, [receipts])

    const handlePrint = () => {
        window.print()
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg font-mono">Loading report...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Print-hidden header with navigation */}
            <div className="print:hidden border-b-2 border-black p-4 flex items-center justify-between">
                <Link href="/receipts" className="inline-flex items-center font-bold hover:underline">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Receipts
                </Link>
                <button
                    onClick={handlePrint}
                    className="inline-flex items-center px-6 py-3 bg-black text-white font-bold hover:bg-neutral-800 transition-all border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                    <Printer className="w-5 h-5 mr-2" />
                    Print / Save as PDF
                </button>
            </div>

            {/* Report Content - Print-optimized */}
            <div className="max-w-4xl mx-auto p-8 print:p-4">
                {/* Header */}
                <div className="text-center mb-8 pb-6 border-b-2 border-black">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <FileText className="w-8 h-8" />
                        <h1 className="text-3xl font-bold tracking-tighter">Expense Report</h1>
                    </div>
                    <p className="text-lg font-mono text-neutral-600">{reportPeriod}</p>
                    <p className="text-sm text-neutral-500 mt-1">Generated: {new Date().toLocaleDateString()}</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="border-2 border-black p-4 text-center">
                        <p className="text-sm font-bold uppercase tracking-wider text-neutral-500">Total Spent</p>
                        <p className="text-3xl font-bold tracking-tighter">${totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="border-2 border-black p-4 text-center">
                        <p className="text-sm font-bold uppercase tracking-wider text-neutral-500">Receipts</p>
                        <p className="text-3xl font-bold tracking-tighter">{receipts.length}</p>
                    </div>
                    <div className="border-2 border-black p-4 text-center">
                        <p className="text-sm font-bold uppercase tracking-wider text-neutral-500">Average</p>
                        <p className="text-3xl font-bold tracking-tighter">
                            ${receipts.length > 0 ? (totalAmount / receipts.length).toFixed(2) : '0.00'}
                        </p>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold tracking-tighter mb-4 border-b border-black pb-2">
                        Spending by Category
                    </h2>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-neutral-200">
                                <th className="py-2 font-bold">Category</th>
                                <th className="py-2 font-bold text-center">Receipts</th>
                                <th className="py-2 font-bold text-right">Amount</th>
                                <th className="py-2 font-bold text-right">% of Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categoryBreakdown.map(([cat, data]) => (
                                <tr key={cat} className="border-b border-neutral-100">
                                    <td className="py-2 font-medium">{cat}</td>
                                    <td className="py-2 text-center font-mono">{data.count}</td>
                                    <td className="py-2 text-right font-mono">${data.total.toFixed(2)}</td>
                                    <td className="py-2 text-right font-mono">
                                        {totalAmount > 0 ? ((data.total / totalAmount) * 100).toFixed(1) : 0}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Top Stores */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold tracking-tighter mb-4 border-b border-black pb-2">
                        Top 10 Stores
                    </h2>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-neutral-200">
                                <th className="py-2 font-bold">Store</th>
                                <th className="py-2 font-bold text-center">Visits</th>
                                <th className="py-2 font-bold text-right">Total Spent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {storeBreakdown.map(([store, data]) => (
                                <tr key={store} className="border-b border-neutral-100">
                                    <td className="py-2 font-medium">{store}</td>
                                    <td className="py-2 text-center font-mono">{data.count}</td>
                                    <td className="py-2 text-right font-mono">${data.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* All Transactions */}
                <div className="print:break-before-page">
                    <h2 className="text-xl font-bold tracking-tighter mb-4 border-b border-black pb-2">
                        All Transactions
                    </h2>
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-neutral-200">
                                <th className="py-2 font-bold">Date</th>
                                <th className="py-2 font-bold">Store</th>
                                <th className="py-2 font-bold">Category</th>
                                <th className="py-2 font-bold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipts.map(r => (
                                <tr key={r.id} className="border-b border-neutral-100">
                                    <td className="py-1.5 font-mono">
                                        {r.purchase_date ? new Date(r.purchase_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="py-1.5">{r.store_name || 'Unknown'}</td>
                                    <td className="py-1.5 text-neutral-600">{r.category_name || 'Uncategorized'}</td>
                                    <td className="py-1.5 text-right font-mono">${(r.total_amount || 0).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-black font-bold">
                                <td colSpan={3} className="py-2">TOTAL</td>
                                <td className="py-2 text-right font-mono">${totalAmount.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-neutral-200 text-center text-sm text-neutral-500 print:mt-4">
                    <p>Generated by Daticket • {new Date().toLocaleString()}</p>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 1cm;
                    }
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    )
}

export default function ReportPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg font-mono">Loading report...</div>
            </div>
        }>
            <ReportContent />
        </Suspense>
    )
}
