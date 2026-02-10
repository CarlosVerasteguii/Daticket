'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
    Crown, 
    ShoppingBag, 
    Zap,
    Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickStatsCardsProps {
    receipts: Array<{
        total_amount: number | null
        store_name: string | null
        category_name: string | null
        purchase_date: string | null
    }>
    className?: string
}

interface StatCard {
    label: string
    value: string
    subtext: string
    icon: React.ElementType
    color: 'blue' | 'green' | 'orange' | 'red'
}

const colorClasses = {
    blue: 'bg-swiss-blue text-white',
    green: 'bg-swiss-green text-white',
    orange: 'bg-swiss-orange text-white',
    red: 'bg-swiss-red text-white'
}

export default function QuickStatsCards({ receipts, className }: QuickStatsCardsProps) {
    const stats = useMemo((): StatCard[] => {
        if (receipts.length === 0) {
            return [
                { label: 'Categoría principal', value: '—', subtext: 'Aún no hay datos', icon: Crown, color: 'blue' },
                { label: 'Compra más grande', value: '$0', subtext: 'Sin compras', icon: Zap, color: 'orange' },
                { label: 'Tienda favorita', value: '—', subtext: 'Sin visitas', icon: ShoppingBag, color: 'green' },
                { label: 'Día con más compras', value: '—', subtext: 'Sin datos', icon: Calendar, color: 'red' }
            ]
        }

        // Top Category by spending
        const categorySpend = new Map<string, number>()
        receipts.forEach(r => {
            const cat = r.category_name || 'Sin categoría'
            const amount = Number(r.total_amount) || 0
            categorySpend.set(cat, (categorySpend.get(cat) || 0) + amount)
        })
        const topCategory = Array.from(categorySpend.entries())
            .sort((a, b) => b[1] - a[1])[0]

        // Biggest single purchase
        const biggestPurchase = receipts.reduce((max, r) => {
            const amount = Number(r.total_amount) || 0
            return amount > (Number(max.total_amount) || 0) ? r : max
        }, receipts[0])

        // Most visited store
        const storeVisits = new Map<string, number>()
        receipts.forEach(r => {
            const store = r.store_name || 'Desconocida'
            storeVisits.set(store, (storeVisits.get(store) || 0) + 1)
        })
        const favoriteStore = Array.from(storeVisits.entries())
            .sort((a, b) => b[1] - a[1])[0]

        // Busiest day of week
        const dayCount = new Map<number, number>()
        receipts.forEach(r => {
            if (r.purchase_date) {
                const day = new Date(r.purchase_date).getDay()
                dayCount.set(day, (dayCount.get(day) || 0) + 1)
            }
        })
        const busiestDay = Array.from(dayCount.entries())
            .sort((a, b) => b[1] - a[1])[0]
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

        return [
            { 
                label: 'Categoría principal', 
                value: topCategory ? topCategory[0] : '—',
                subtext: topCategory ? `$${topCategory[1].toFixed(0)} gastados` : 'Sin datos',
                icon: Crown,
                color: 'blue'
            },
            { 
                label: 'Compra más grande', 
                value: biggestPurchase?.total_amount ? `$${Number(biggestPurchase.total_amount).toFixed(2)}` : '$0',
                subtext: biggestPurchase?.store_name || 'Tienda desconocida',
                icon: Zap,
                color: 'orange'
            },
            { 
                label: 'Tienda favorita', 
                value: favoriteStore ? favoriteStore[0] : '—',
                subtext: favoriteStore ? `${favoriteStore[1]} visita${favoriteStore[1] !== 1 ? 's' : ''}` : 'Sin visitas',
                icon: ShoppingBag,
                color: 'green'
            },
            { 
                label: 'Día con más compras', 
                value: busiestDay ? dayNames[busiestDay[0]] : '—',
                subtext: busiestDay ? `${busiestDay[1]} recibo${busiestDay[1] !== 1 ? 's' : ''}` : 'Sin datos',
                icon: Calendar,
                color: 'red'
            }
        ]
    }, [receipts])

    return (
        <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    className="border border-foreground/20 bg-background p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ 
                        y: -2,
                        boxShadow: "5px 5px 0px 0px rgba(0,0,0,1)"
                    }}
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className={cn(
                            "h-8 w-8 flex items-center justify-center",
                            colorClasses[stat.color]
                        )}>
                            <stat.icon className="h-4 w-4" />
                        </div>
                    </div>
                    
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
                        {stat.label}
                    </p>
                    <p className="font-bold text-lg truncate text-foreground" title={stat.value}>
                        {stat.value}
                    </p>
                    <p className="text-xs text-foreground/60 truncate mt-1" title={stat.subtext}>
                        {stat.subtext}
                    </p>
                </motion.div>
            ))}
        </div>
    )
}
