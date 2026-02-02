'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Store, TrendingUp, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StoreAnalysisProps {
    receipts: Array<{
        total_amount: number | null
        store_name: string | null
    }>
    className?: string
}

interface StoreData {
    name: string
    totalAmount: number
    receiptCount: number
    avgPerVisit: number
}

const BAR_COLORS = [
    '#0066FF', // Swiss blue
    '#3385FF',
    '#66A3FF',
    '#99C2FF',
    '#CCE0FF',
]

export default function StoreAnalysisChart({ receipts, className }: StoreAnalysisProps) {
    const { storeData, maxAmount, totalSpend } = useMemo(() => {
        if (receipts.length === 0) {
            return { storeData: [], maxAmount: 0, totalSpend: 0 }
        }

        const storeMap = new Map<string, { amount: number; count: number }>()

        receipts.forEach(receipt => {
            const store = receipt.store_name || 'Unknown Store'
            const amount = Number(receipt.total_amount) || 0
            
            if (storeMap.has(store)) {
                const existing = storeMap.get(store)!
                storeMap.set(store, {
                    amount: existing.amount + amount,
                    count: existing.count + 1
                })
            } else {
                storeMap.set(store, { amount, count: 1 })
            }
        })

        const data: StoreData[] = Array.from(storeMap.entries())
            .map(([name, { amount, count }]) => ({
                name,
                totalAmount: amount,
                receiptCount: count,
                avgPerVisit: amount / count
            }))
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5) // Top 5 stores

        const max = Math.max(...data.map(d => d.totalAmount), 1)
        const total = data.reduce((sum, d) => sum + d.totalAmount, 0)

        return { storeData: data, maxAmount: max, totalSpend: total }
    }, [receipts])

    if (receipts.length === 0) {
        return (
            <div className={cn("border border-foreground bg-background p-6", className)}>
                <div className="flex items-center gap-2 mb-4">
                    <Store className="h-4 w-4 text-foreground/40" />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-foreground/60">
                        Top Stores
                    </h3>
                </div>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 bg-black/5 dark:bg-transparent border border-foreground/20 flex items-center justify-center mb-4">
                        <MapPin className="h-8 w-8 text-foreground/30" />
                    </div>
                    <p className="text-foreground/60 text-sm">No store data</p>
                    <p className="text-foreground/40 text-xs mt-1">Upload receipts to see analysis</p>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("border border-foreground bg-background", className)}>
            <div className="flex items-center justify-between p-4 border-b border-foreground/20 bg-foreground/10">
                <div className="flex items-center gap-2 text-foreground">
                    <Store className="h-4 w-4" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Top Stores</h3>
                </div>
                <span className="text-xs text-foreground/60 font-mono">
                    {storeData.length} stores
                </span>
            </div>
            
            <div className="p-6">
                {/* Bar Chart */}
                <div className="space-y-4">
                    {storeData.map((store, index) => {
                        const widthPercent = (store.totalAmount / maxAmount) * 100
                        const sharePercent = (store.totalAmount / totalSpend) * 100
                        
                        return (
                            <motion.div
                                key={store.name}
                                className="space-y-2"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="font-bold text-sm w-5 text-foreground/40 flex-shrink-0">
                                            #{index + 1}
                                        </span>
                                        <span className="font-medium text-sm truncate text-foreground">
                                            {store.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <span className="text-xs text-foreground/60">
                                            {store.receiptCount} visit{store.receiptCount !== 1 ? 's' : ''}
                                        </span>
                                        <span className="font-bold font-mono text-sm min-w-[80px] text-right text-foreground">
                                            ${store.totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="relative h-6 bg-foreground/10 border border-foreground/10">
                                    <motion.div
                                        className="absolute inset-y-0 left-0 flex items-center"
                                        style={{ backgroundColor: BAR_COLORS[index] || BAR_COLORS[4] }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${widthPercent}%` }}
                                        transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
                                    >
                                        <span className="px-2 text-xs font-bold text-white whitespace-nowrap">
                                            {sharePercent.toFixed(0)}%
                                        </span>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                {/* Summary Table */}
                <div className="mt-6 pt-6 border-t border-foreground/20">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-foreground/20">
                                <th className="text-left py-2 font-bold text-xs uppercase tracking-wider text-foreground/60">Store</th>
                                <th className="text-right py-2 font-bold text-xs uppercase tracking-wider text-foreground/60">Avg/Visit</th>
                                <th className="text-right py-2 font-bold text-xs uppercase tracking-wider text-foreground/60">% Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            {storeData.map((store, index) => (
                                <motion.tr 
                                    key={store.name}
                                    className="border-b border-foreground/10 last:border-0"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 + index * 0.05 }}
                                >
                                    <td className="py-2 flex items-center gap-2 text-foreground">
                                        <div 
                                            className="h-2 w-2 flex-shrink-0"
                                            style={{ backgroundColor: BAR_COLORS[index] || BAR_COLORS[4] }}
                                        />
                                        <span className="truncate font-medium">{store.name}</span>
                                    </td>
                                    <td className="py-2 text-right font-mono text-foreground">
                                        ${store.avgPerVisit.toFixed(2)}
                                    </td>
                                    <td className="py-2 text-right font-mono text-foreground/60">
                                        {((store.totalAmount / totalSpend) * 100).toFixed(1)}%
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t border-foreground flex justify-between items-center">
                    <span className="font-bold uppercase text-xs tracking-wider text-foreground">Total (Top 5)</span>
                    <span className="font-bold font-mono text-lg text-foreground">${totalSpend.toFixed(2)}</span>
                </div>
            </div>
        </div>
    )
}
