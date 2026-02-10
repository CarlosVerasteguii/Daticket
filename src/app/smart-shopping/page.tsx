'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import { ShoppingCart, Bell, TrendingDown, Package, Eye, EyeOff, RefreshCw, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface TrackedProduct {
    id: string
    normalized_name: string
    display_name: string
    avg_purchase_price: number
    purchase_count: number
    last_purchase_date: string | null
    heb_product_id: string | null
    heb_product_name: string | null
    match_status: string
    is_active: boolean
    last_scraped_at: string | null
}

interface PriceAlert {
    id: string
    tracked_product_id: string
    snapshot_id: string
    alert_type: string
    heb_price: number
    user_avg_price: number
    savings_percent: number
    savings_amount: number
    is_read: boolean
    is_dismissed: boolean
    created_at: string
    tracked_products: {
        display_name: string
        heb_product_name: string | null
    } | null
}

type AlertQueryRow = Omit<PriceAlert, 'tracked_products'> & {
    tracked_products: { display_name: string; heb_product_name: string | null } | { display_name: string; heb_product_name: string | null }[] | null
}

export default function SmartShoppingPage() {
    const router = useRouter()
    const supabase = createClient()

    const [products, setProducts] = useState<TrackedProduct[]>([])
    const [alerts, setAlerts] = useState<PriceAlert[]>([])
    const [loading, setLoading] = useState(true)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const [productsRes, alertsRes] = await Promise.all([
                supabase
                    .from('tracked_products')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('last_purchase_date', { ascending: false, nullsFirst: false }),
                supabase
                    .from('price_alerts')
                    .select('*, tracked_products(display_name, heb_product_name)')
                    .eq('user_id', session.user.id)
                    .eq('is_dismissed', false)
                    .order('created_at', { ascending: false })
                    .limit(20),
            ])

            if (productsRes.data) {
                setProducts(productsRes.data as TrackedProduct[])
            }

            if (alertsRes.data) {
                const rows = alertsRes.data as unknown as AlertQueryRow[]
                const formatted: PriceAlert[] = rows.map((a) => ({
                    ...a,
                    tracked_products: Array.isArray(a.tracked_products)
                        ? a.tracked_products[0] ?? null
                        : a.tracked_products ?? null,
                }))
                setAlerts(formatted)
            }

            setLoading(false)
        }
        fetchData()
    }, [router, supabase])

    const toggleActive = async (productId: string, currentActive: boolean) => {
        setTogglingId(productId)
        const { error } = await supabase
            .from('tracked_products')
            .update({ is_active: !currentActive })
            .eq('id', productId)

        if (!error) {
            setProducts((prev) =>
                prev.map((p) => (p.id === productId ? { ...p, is_active: !currentActive } : p))
            )
        }
        setTogglingId(null)
    }

    const dismissAlert = async (alertId: string) => {
        const { error } = await supabase
            .from('price_alerts')
            .update({ is_dismissed: true })
            .eq('id', alertId)

        if (!error) {
            setAlerts((prev) => prev.filter((a) => a.id !== alertId))
        }
    }

    const markAlertRead = async (alertId: string) => {
        const { error } = await supabase
            .from('price_alerts')
            .update({ is_read: true })
            .eq('id', alertId)

        if (!error) {
            setAlerts((prev) =>
                prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
            )
        }
    }

    const activeAlerts = alerts.filter((a) => !a.is_read)
    const totalSavings = alerts.reduce((sum, a) => sum + a.savings_amount, 0)
    const trackedCount = products.filter((p) => p.is_active).length
    const matchedCount = products.filter((p) => p.match_status === 'matched').length

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Nunca'
        return new Date(dateStr).toLocaleDateString('es-MX', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'matched':
                return { label: 'Encontrado', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' }
            case 'pending':
                return { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' }
            case 'not_found':
                return { label: 'No encontrado', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' }
            case 'ambiguous':
                return { label: 'Ambiguo', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' }
            default:
                return { label: status, className: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400' }
        }
    }

    const getAlertTypeBadge = (type: string) => {
        switch (type) {
            case 'price_drop':
                return { label: 'Baja de precio', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' }
            case 'promotion':
                return { label: 'Promocion', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' }
            case 'new_low':
                return { label: 'Nuevo minimo', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' }
            default:
                return { label: type, className: 'bg-neutral-100 text-neutral-800' }
        }
    }

    if (loading) {
        return (
            <DashboardShell>
                <div className="p-6 max-w-5xl mx-auto space-y-6">
                    <div className="h-12 w-64 bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-28 bg-neutral-200 dark:bg-neutral-800 animate-pulse border border-neutral-300 dark:border-neutral-700" />
                        ))}
                    </div>
                    <div className="h-64 bg-neutral-200 dark:bg-neutral-800 animate-pulse border border-neutral-300 dark:border-neutral-700" />
                </div>
            </DashboardShell>
        )
    }

    return (
        <DashboardShell>
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-black dark:bg-white flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-white dark:text-black" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Smart Shopping</h1>
                        <p className="text-neutral-500 dark:text-neutral-400">
                            Monitoreo de precios en HEB vs tus compras
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div
                        className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5"
                        whileHover={{ y: -2, boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Bell className="h-4 w-4 text-neutral-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                                Alertas activas
                            </span>
                        </div>
                        <p className="text-4xl font-bold font-mono">{activeAlerts.length}</p>
                        <p className="text-sm text-neutral-500 mt-1">
                            {alerts.length} total
                        </p>
                    </motion.div>

                    <motion.div
                        className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5"
                        whileHover={{ y: -2, boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingDown className="h-4 w-4 text-green-600" />
                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                                Ahorro potencial
                            </span>
                        </div>
                        <p className="text-4xl font-bold font-mono text-green-600">
                            ${totalSavings.toFixed(2)}
                        </p>
                        <p className="text-sm text-neutral-500 mt-1">
                            En productos con mejor precio
                        </p>
                    </motion.div>

                    <motion.div
                        className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5"
                        whileHover={{ y: -2, boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Package className="h-4 w-4 text-neutral-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                                Productos trackeados
                            </span>
                        </div>
                        <p className="text-4xl font-bold font-mono">{trackedCount}</p>
                        <p className="text-sm text-neutral-500 mt-1">
                            {matchedCount} encontrados en HEB
                        </p>
                    </motion.div>
                </div>

                {/* Price Alerts */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
                        <TrendingDown className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">
                            Alertas de precio
                        </h2>
                        {activeAlerts.length > 0 && (
                            <span className="ml-auto px-2 py-0.5 bg-green-600 text-white text-xs font-bold">
                                {activeAlerts.length} nuevas
                            </span>
                        )}
                    </div>

                    <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        <AnimatePresence>
                            {alerts.length === 0 ? (
                                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                                    <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p className="font-medium">Sin alertas por ahora</p>
                                    <p className="text-sm mt-1">
                                        Las alertas aparecen cuando el precio en HEB es menor al 85% de tu promedio de compra
                                    </p>
                                </div>
                            ) : (
                                alerts.map((alert) => {
                                    const typeBadge = getAlertTypeBadge(alert.alert_type)
                                    return (
                                        <motion.div
                                            key={alert.id}
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className={cn(
                                                'p-4 flex items-center gap-4',
                                                !alert.is_read && 'bg-green-50/50 dark:bg-green-900/10'
                                            )}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-bold truncate">
                                                        {alert.tracked_products?.display_name || 'Producto'}
                                                    </p>
                                                    <span
                                                        className={cn(
                                                            'px-2 py-0.5 text-xs font-bold uppercase',
                                                            typeBadge.className
                                                        )}
                                                    >
                                                        {typeBadge.label}
                                                    </span>
                                                    {!alert.is_read && (
                                                        <span className="h-2 w-2 bg-green-500 rounded-full flex-shrink-0" />
                                                    )}
                                                </div>
                                                {alert.tracked_products?.heb_product_name && (
                                                    <p className="text-xs text-neutral-500 truncate mb-1">
                                                        HEB: {alert.tracked_products.heb_product_name}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="font-mono">
                                                        HEB: <strong className="text-green-600">${alert.heb_price.toFixed(2)}</strong>
                                                    </span>
                                                    <span className="font-mono text-neutral-500">
                                                        Tu promedio: ${alert.user_avg_price.toFixed(2)}
                                                    </span>
                                                    <span className="font-bold text-green-600">
                                                        -{alert.savings_percent}% (${alert.savings_amount.toFixed(2)})
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {!alert.is_read && (
                                                    <button
                                                        onClick={() => markAlertRead(alert.id)}
                                                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                        title="Marcar como leida"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => dismissAlert(alert.id)}
                                                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-red-500"
                                                    title="Descartar"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )
                                })
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Tracked Products Table */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
                        <Package className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">
                            Productos monitoreados
                        </h2>
                        <span className="ml-auto text-xs text-neutral-500 font-mono">
                            {products.length} productos
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                                <tr>
                                    <th className="p-3 font-bold uppercase text-xs tracking-wider">Producto</th>
                                    <th className="p-3 font-bold uppercase text-xs tracking-wider">Tu promedio</th>
                                    <th className="p-3 font-bold uppercase text-xs tracking-wider">Compras</th>
                                    <th className="p-3 font-bold uppercase text-xs tracking-wider">Estado HEB</th>
                                    <th className="p-3 font-bold uppercase text-xs tracking-wider">Ultimo scrape</th>
                                    <th className="p-3 font-bold uppercase text-xs tracking-wider text-center">Activo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-neutral-500">
                                            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p className="font-medium">Sin productos por monitorear</p>
                                            <p className="text-sm mt-1">Los productos se agregan automaticamente cuando subes recibos</p>
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((product) => {
                                        const statusBadge = getStatusBadge(product.match_status)
                                        return (
                                            <tr
                                                key={product.id}
                                                className={cn(
                                                    'transition-colors',
                                                    !product.is_active && 'opacity-50'
                                                )}
                                            >
                                                <td className="p-3">
                                                    <p className="font-medium">{product.display_name}</p>
                                                    {product.heb_product_name && (
                                                        <p className="text-xs text-neutral-500 truncate max-w-[200px]">
                                                            HEB: {product.heb_product_name}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="p-3 font-mono font-bold">
                                                    ${Number(product.avg_purchase_price).toFixed(2)}
                                                </td>
                                                <td className="p-3 font-mono">{product.purchase_count}</td>
                                                <td className="p-3">
                                                    <span
                                                        className={cn(
                                                            'px-2 py-0.5 text-xs font-bold uppercase',
                                                            statusBadge.className
                                                        )}
                                                    >
                                                        {statusBadge.label}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-xs text-neutral-500 font-mono">
                                                    {formatDate(product.last_scraped_at)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => toggleActive(product.id, product.is_active)}
                                                        disabled={togglingId === product.id}
                                                        className={cn(
                                                            'p-1.5 transition-colors',
                                                            product.is_active
                                                                ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                                : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                                        )}
                                                    >
                                                        {togglingId === product.id ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : product.is_active ? (
                                                            <Eye className="h-4 w-4" />
                                                        ) : (
                                                            <EyeOff className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info */}
                <div className="p-4 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-500 dark:text-neutral-400">
                    <p>
                        <strong>Como funciona:</strong> Los productos de tus recibos se monitorean automaticamente en HEB Mexico.
                        Cada dia se consultan los precios y se generan alertas cuando el precio en HEB es al menos 15% menor a tu promedio de compra.
                    </p>
                </div>
            </div>
        </DashboardShell>
    )
}
