'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { PieChart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CategoryData {
    name: string
    amount: number
    count: number
}

interface CategoryBreakdownChartProps {
    receipts: Array<{
        total_amount: number | null
        category_name: string | null
    }>
    className?: string
}

// Swiss design color palette for chart
const CHART_COLORS = [
    '#0066FF', // Swiss blue
    '#FF6600', // Swiss orange
    '#00AA55', // Swiss green
    '#FF0000', // Swiss red
    '#FFCC00', // Swiss yellow
    '#9933FF', // Purple
    '#00CCCC', // Teal
    '#FF3399', // Pink
]

export default function CategoryBreakdownChart({ receipts, className }: CategoryBreakdownChartProps) {
    const { categoryData, total } = useMemo(() => {
        const categoryMap = new Map<string, { amount: number; count: number }>()
        
        receipts.forEach(receipt => {
            const category = receipt.category_name || 'Uncategorized'
            const amount = Number(receipt.total_amount) || 0
            
            if (categoryMap.has(category)) {
                const existing = categoryMap.get(category)!
                categoryMap.set(category, {
                    amount: existing.amount + amount,
                    count: existing.count + 1
                })
            } else {
                categoryMap.set(category, { amount, count: 1 })
            }
        })

        const data: CategoryData[] = Array.from(categoryMap.entries())
            .map(([name, { amount, count }]) => ({ name, amount, count }))
            .sort((a, b) => b.amount - a.amount)

        const totalAmount = data.reduce((sum, cat) => sum + cat.amount, 0)

        return { categoryData: data, total: totalAmount }
    }, [receipts])

    if (receipts.length === 0 || total === 0) {
        return (
            <div className={cn("border border-foreground/20 bg-background p-6", className)}>
                <div className="flex items-center gap-2 mb-4">
                    <PieChart className="h-4 w-4 text-foreground/40" />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-foreground/60">
                        Category Breakdown
                    </h3>
                </div>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 bg-black/5 dark:bg-transparent border border-foreground/20 flex items-center justify-center mb-4">
                        <PieChart className="h-8 w-8 text-foreground/30" />
                    </div>
                    <p className="text-foreground/60 text-sm">No spending data</p>
                    <p className="text-foreground/40 text-xs mt-1">Upload receipts to see breakdown</p>
                </div>
            </div>
        )
    }

    // Calculate angles for donut chart
    type Segment = (typeof categoryData)[number] & {
        percentage: number
        startAngle: number
        endAngle: number
        color: string
    }

    const segments = categoryData.reduce<{ cumulativeAngle: number; segments: Segment[] }>(
        (acc, cat, index) => {
            const percentage = (cat.amount / total) * 100
            const angle = (percentage / 100) * 360
            const startAngle = acc.cumulativeAngle
            const endAngle = startAngle + angle

            const segment: Segment = {
                ...cat,
                percentage,
                startAngle,
                endAngle,
                color: CHART_COLORS[index % CHART_COLORS.length],
            }

            return {
                cumulativeAngle: endAngle,
                segments: [...acc.segments, segment],
            }
        },
        { cumulativeAngle: 0, segments: [] }
    ).segments

    // SVG path for donut segment
    const createArcPath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
        const startRad = (startAngle - 90) * (Math.PI / 180)
        const endRad = (endAngle - 90) * (Math.PI / 180)
        
        const x1 = 50 + outerRadius * Math.cos(startRad)
        const y1 = 50 + outerRadius * Math.sin(startRad)
        const x2 = 50 + outerRadius * Math.cos(endRad)
        const y2 = 50 + outerRadius * Math.sin(endRad)
        const x3 = 50 + innerRadius * Math.cos(endRad)
        const y3 = 50 + innerRadius * Math.sin(endRad)
        const x4 = 50 + innerRadius * Math.cos(startRad)
        const y4 = 50 + innerRadius * Math.sin(startRad)
        
        const largeArc = endAngle - startAngle > 180 ? 1 : 0
        
        return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`
    }

    return (
        <div className={cn("border border-foreground/20 bg-background", className)}>
            <div className="flex items-center gap-2 p-4 border-b border-foreground/20 bg-foreground/5">
                <PieChart className="h-4 w-4 text-foreground" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">Category Breakdown</h3>
            </div>
            
            <div className="p-6">
                <div className="flex flex-col lg:flex-row items-center gap-6">
                    {/* Donut Chart */}
                    <div className="relative w-48 h-48 flex-shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-0">
                            {segments.map((segment, index) => (
                                <motion.path
                                    key={segment.name}
                                    d={createArcPath(segment.startAngle, segment.endAngle - 0.5, 25, 42)}
                                    fill={segment.color}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1, duration: 0.4 }}
                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                    style={{ transformOrigin: '50% 50%' }}
                                />
                            ))}
                        </svg>
                        {/* Center text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-foreground">${total.toFixed(0)}</span>
                            <span className="text-xs text-foreground/60 uppercase tracking-wider">Total</span>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto">
                        {segments.map((segment, index) => (
                            <motion.div
                                key={segment.name}
                                className="flex items-center justify-between gap-3 py-1.5 px-2 hover:bg-foreground/5 transition-colors"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div 
                                        className="h-3 w-3 flex-shrink-0 border border-foreground/20" 
                                        style={{ backgroundColor: segment.color }}
                                    />
                                    <span className="text-sm font-medium truncate text-foreground">{segment.name}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-sm font-mono font-bold text-foreground">
                                        ${segment.amount.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-foreground/40 w-10 text-right">
                                        {segment.percentage.toFixed(0)}%
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Category count summary */}
                <div className="mt-4 pt-4 border-t border-foreground/20 flex justify-between text-sm">
                    <span className="text-foreground/60">{segments.length} categories</span>
                    <span className="text-foreground/60">{receipts.length} receipts</span>
                </div>
            </div>
        </div>
    )
}
