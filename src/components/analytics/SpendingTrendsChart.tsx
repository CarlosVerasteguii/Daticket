'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpendingTrendsChartProps {
    receipts: Array<{
        total_amount: number | null
        purchase_date: string | null
    }>
    period: 'week' | 'month' | 'quarter' | 'year'
    className?: string
}

interface DataPoint {
    label: string
    amount: number
    date: Date
}

const CHART_COLOR = '#0066FF' // Swiss blue
const GRID_COLOR = '#e5e5e5'

export default function SpendingTrendsChart({ receipts, period, className }: SpendingTrendsChartProps) {
    const { dataPoints, maxAmount, trend, avgAmount } = useMemo(() => {
        if (receipts.length === 0) {
            return { dataPoints: [], maxAmount: 0, trend: 0, avgAmount: 0 }
        }

        const now = new Date()
        const dataMap = new Map<string, { amount: number; date: Date }>()
        
        // Determine grouping based on period
        let groupBy: 'day' | 'week' | 'month'
        let labelFormat: (date: Date) => string
        let numPoints: number

        switch (period) {
            case 'week':
                groupBy = 'day'
                numPoints = 7
                labelFormat = (d) => d.toLocaleDateString('en-US', { weekday: 'short' })
                break
            case 'month':
                groupBy = 'day'
                numPoints = 30
                labelFormat = (d) => d.getDate().toString()
                break
            case 'quarter':
                groupBy = 'week'
                numPoints = 13
                labelFormat = (d) => `W${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)}`
                break
            case 'year':
                groupBy = 'month'
                numPoints = 12
                labelFormat = (d) => d.toLocaleDateString('en-US', { month: 'short' })
                break
        }

        // Initialize all points to 0
        for (let i = numPoints - 1; i >= 0; i--) {
            const date = new Date(now)
            if (groupBy === 'day') {
                date.setDate(date.getDate() - i)
                date.setHours(0, 0, 0, 0)
            } else if (groupBy === 'week') {
                date.setDate(date.getDate() - (i * 7))
                date.setHours(0, 0, 0, 0)
            } else {
                date.setMonth(date.getMonth() - i)
                date.setDate(1)
                date.setHours(0, 0, 0, 0)
            }
            const key = getGroupKey(date, groupBy)
            dataMap.set(key, { amount: 0, date: new Date(date) })
        }

        // Aggregate receipts
        receipts.forEach(receipt => {
            if (!receipt.purchase_date || !receipt.total_amount) return
            const receiptDate = new Date(receipt.purchase_date)
            const key = getGroupKey(receiptDate, groupBy)
            
            if (dataMap.has(key)) {
                const existing = dataMap.get(key)!
                dataMap.set(key, { 
                    amount: existing.amount + Number(receipt.total_amount),
                    date: existing.date
                })
            }
        })

        // Convert to sorted array
        const points: DataPoint[] = Array.from(dataMap.entries())
            .map(([, value]) => ({
                label: labelFormat(value.date),
                amount: value.amount,
                date: value.date
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime())

        const max = Math.max(...points.map(p => p.amount), 1)
        const total = points.reduce((sum, p) => sum + p.amount, 0)
        const avg = total / points.length

        // Calculate trend (compare first half to second half)
        const halfLength = Math.floor(points.length / 2)
        const firstHalf = points.slice(0, halfLength).reduce((sum, p) => sum + p.amount, 0)
        const secondHalf = points.slice(halfLength).reduce((sum, p) => sum + p.amount, 0)
        const trendValue = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0

        return { dataPoints: points, maxAmount: max, trend: trendValue, avgAmount: avg }
    }, [receipts, period])

    if (dataPoints.length === 0) {
        return (
            <div className={cn("border border-foreground bg-background p-6", className)}>
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-foreground/40" />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-foreground/60">
                        Spending Trends
                    </h3>
                </div>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 bg-black/5 dark:bg-transparent border border-foreground/20 flex items-center justify-center mb-4">
                        <TrendingUp className="h-8 w-8 text-foreground/30" />
                    </div>
                    <p className="text-foreground/60 text-sm">No spending data</p>
                    <p className="text-foreground/40 text-xs mt-1">Upload receipts to see trends</p>
                </div>
            </div>
        )
    }

    // SVG dimensions
    const width = 100
    const height = 50
    const padding = { top: 5, right: 5, bottom: 10, left: 10 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Generate path
    const points = dataPoints.map((point, index) => {
        const x = padding.left + (index / (dataPoints.length - 1)) * chartWidth
        const y = padding.top + chartHeight - (point.amount / maxAmount) * chartHeight
        return { x, y, ...point }
    })

    const pathD = points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`
        return `${path} L ${point.x} ${point.y}`
    }, '')

    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`

    // Grid lines (3 horizontal)
    const gridLines = [0.25, 0.5, 0.75].map(ratio => ({
        y: padding.top + chartHeight * (1 - ratio),
        value: maxAmount * ratio
    }))

    return (
        <div className={cn("border border-foreground bg-background", className)}>
            <div className="flex items-center justify-between p-4 border-b border-foreground/20 bg-foreground/10">
                <div className="flex items-center gap-2 text-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Spending Trends</h3>
                </div>
                <div className={cn(
                    "flex items-center gap-1 text-xs font-bold px-2 py-1",
                    trend > 5 && "text-swiss-orange bg-orange-50 dark:bg-orange-900/30",
                    trend < -5 && "text-swiss-green bg-green-50 dark:bg-green-900/30",
                    trend >= -5 && trend <= 5 && "text-foreground/60 bg-foreground/10"
                )}>
                    {trend > 5 && <TrendingUp className="h-3 w-3" />}
                    {trend < -5 && <TrendingDown className="h-3 w-3" />}
                    {trend >= -5 && trend <= 5 && <Minus className="h-3 w-3" />}
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                </div>
            </div>
            
            <div className="p-6">
                {/* Chart */}
                <div className="relative w-full aspect-[2/1]">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
                        {/* Grid lines */}
                        {gridLines.map((line, i) => (
                            <line
                                key={i}
                                x1={padding.left}
                                y1={line.y}
                                x2={width - padding.right}
                                y2={line.y}
                                stroke={GRID_COLOR}
                                strokeWidth="0.3"
                                strokeDasharray="1 1"
                            />
                        ))}
                        
                        {/* Area fill */}
                        <motion.path
                            d={areaD}
                            fill={`${CHART_COLOR}20`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        />
                        
                        {/* Line */}
                        <motion.path
                            d={pathD}
                            fill="none"
                            stroke={CHART_COLOR}
                            strokeWidth="0.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                        
                        {/* Points */}
                        {points.map((point, index) => (
                            <motion.circle
                                key={index}
                                cx={point.x}
                                cy={point.y}
                                r="1"
                                fill="white"
                                stroke={CHART_COLOR}
                                strokeWidth="0.5"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5 + index * 0.05 }}
                            />
                        ))}
                    </svg>
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between mt-2 px-2">
                    {dataPoints.filter((_, i) => {
                        // Show fewer labels for clarity
                        const step = Math.ceil(dataPoints.length / 7)
                        return i % step === 0 || i === dataPoints.length - 1
                    }).map((point, i) => (
                        <span key={i} className="text-[10px] text-neutral-400 font-mono">
                            {point.label}
                        </span>
                    ))}
                </div>

                {/* Stats */}
                <div className="mt-4 pt-4 border-t border-neutral-200 grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">Avg/Period</p>
                        <p className="font-bold font-mono">${avgAmount.toFixed(0)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">Highest</p>
                        <p className="font-bold font-mono">${maxAmount.toFixed(0)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">Data Points</p>
                        <p className="font-bold font-mono">{dataPoints.length}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function getGroupKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    switch (groupBy) {
        case 'day':
            return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        case 'week':
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            return `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`
        case 'month':
            return `${date.getFullYear()}-${date.getMonth()}`
    }
}
