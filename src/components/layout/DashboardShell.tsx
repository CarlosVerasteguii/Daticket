'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Receipt,
    Upload,
    User,
    Settings,
    LogOut,
    Menu,
    X,
    Bell,
    Search,
    ChevronRight,
    WifiOff,
    Wallet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isOnline, setIsOnline] = useState(true)
    const pathname = usePathname()

    // Network status detection
    useEffect(() => {
        setIsOnline(navigator.onLine)
        
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Receipts', href: '/receipts', icon: Receipt },
        { name: 'Upload', href: '/upload', icon: Upload },
        { name: 'Budget', href: '/budget', icon: Wallet },
        { name: 'Profile', href: '/profile', icon: User },
        { name: 'Settings', href: '/settings', icon: Settings },
    ]

    const handleLogout = async () => {
        // Import dynamically to avoid SSR issues
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <div className="min-h-screen bg-white dark:bg-neutral-950 text-black dark:text-white font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Navigation - Swiss Style (Bordered, High Contrast) */}
            <motion.aside
                initial={false}
                animate={{
                    x: isSidebarOpen ? 0 : "-100%",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-900 border-r border-black dark:border-neutral-700 lg:translate-x-0 lg:static lg:block"
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Logo Section */}
                    <div className="flex h-16 items-center px-6 border-b border-black dark:border-neutral-700">
                        <Link href="/dashboard" className="text-2xl font-bold tracking-tighter hover:opacity-80 transition-opacity">
                            Daticket
                        </Link>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="ml-auto lg:hidden p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 px-3 py-6 space-y-1">
                        {navigation.map((item, index) => {
                            const isActive = pathname === item.href
                            return (
                                <motion.div
                                    key={item.name}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "group flex items-center gap-3 px-3 py-2.5 text-sm font-bold tracking-tight transition-all duration-200",
                                            isActive
                                                ? "bg-black dark:bg-white text-white dark:text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]"
                                                : "text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:translate-x-1"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "h-4 w-4 transition-transform",
                                            isActive ? "stroke-2" : "stroke-1 group-hover:scale-110"
                                        )} />
                                        {item.name}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeIndicator"
                                                className="ml-auto"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </motion.div>
                                        )}
                                    </Link>
                                </motion.div>
                            )
                        })}
                    </nav>

                    {/* User Section (Bottom) */}
                    <div className="p-4 border-t border-black dark:border-neutral-700">
                        <motion.button 
                            onClick={handleLogout}
                            className="group flex w-full items-center gap-3 px-2 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-left"
                            whileHover={{ x: 2 }}
                        >
                            <div className="h-8 w-8 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black group-hover:bg-swiss-orange transition-colors">
                                <LogOut className="h-4 w-4" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="truncate text-xs font-bold uppercase tracking-wider">Sign Out</p>
                                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">End session</p>
                            </div>
                        </motion.button>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <div className="lg:ml-0 min-h-screen flex flex-col">
                {/* Header - Minimalist Bordered */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-6 bg-white dark:bg-neutral-900 border-b border-black dark:border-neutral-700">
                    <div className="flex items-center gap-4">
                        <motion.button
                            type="button"
                            className="lg:hidden p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Menu className="h-6 w-6" />
                        </motion.button>

                        {/* Breadcrumb / Title Area */}
                        <motion.div 
                            className="flex items-center gap-2"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={pathname}
                        >
                            <div className="h-4 w-4 border border-black dark:border-white bg-white dark:bg-neutral-900" />
                            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                {pathname.split('/')[1] || 'Overview'}
                            </h2>
                        </motion.div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Search Button */}
                        <motion.button 
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-black/20 dark:border-neutral-600 hover:border-black dark:hover:border-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Search className="h-4 w-4 text-neutral-400" />
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">Search...</span>
                            <kbd className="ml-2 text-xs text-neutral-400 border border-black/20 dark:border-neutral-600 px-1.5 py-0.5">⌘K</kbd>
                        </motion.button>

                        {/* Status Badge - Dynamic Online/Offline */}
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={isOnline ? 'online' : 'offline'}
                                className={cn(
                                    "hidden md:flex items-center gap-2 px-3 py-1.5 border transition-colors",
                                    isOnline 
                                        ? "border-swiss-green bg-green-50 dark:bg-green-950" 
                                        : "border-red-500 bg-red-50 dark:bg-red-950"
                                )}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                            >
                                {isOnline ? (
                                    <>
                                        <span className="h-2 w-2 bg-swiss-green rounded-full animate-pulse" />
                                        <span className="text-xs font-mono text-swiss-green font-bold">ONLINE</span>
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="h-3 w-3 text-red-600 dark:text-red-400" />
                                        <span className="text-xs font-mono text-red-600 dark:text-red-400 font-bold">OFFLINE</span>
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Notifications */}
                        <motion.button 
                            className="relative p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <motion.div 
                                className="absolute top-2 right-2 h-2 w-2 bg-swiss-orange rounded-full"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            <Bell className="h-5 w-5" />
                        </motion.button>
                    </div>
                </header>

                {/* Page Content - Full Width Canvas */}
                <main className="flex-1 bg-neutral-50 dark:bg-neutral-950">
                    {children}
                </main>
            </div>
        </div>
    )
}
