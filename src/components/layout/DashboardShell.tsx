'use client'

import { useState } from 'react'
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
    Search
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs))
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const pathname = usePathname()

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Receipts', href: '/receipts', icon: Receipt },
        { name: 'Upload', href: '/upload', icon: Upload },
        { name: 'Profile', href: '/profile', icon: User },
        { name: 'Settings', href: '/settings', icon: Settings },
    ]

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Navigation - Swiss Style (Bordered, High Contrast) */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-black transition-transform duration-200 ease-linear lg:translate-x-0",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Logo Section */}
                    <div className="flex h-16 items-center px-6 border-b border-black">
                        <span className="text-2xl font-bold tracking-tighter">Daticket</span>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="ml-auto lg:hidden"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 px-3 py-6 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 text-sm font-bold tracking-tight transition-colors",
                                        isActive
                                            ? "bg-black text-white"
                                            : "text-black hover:bg-neutral-100"
                                    )}
                                >
                                    <item.icon className={cn("h-4 w-4", isActive ? "stroke-2" : "stroke-1")} />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User Section (Bottom) */}
                    <div className="p-4 border-t border-black">
                        <button className="flex w-full items-center gap-3 px-2 py-2 hover:bg-neutral-100 transition-colors text-left">
                            <div className="h-8 w-8 bg-black flex items-center justify-center text-white">
                                <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="truncate text-xs font-bold uppercase tracking-wider">Accountant</p>
                                <p className="truncate text-xs text-neutral-500">Sarah Chen</p>
                            </div>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="lg:pl-64 flex flex-col min-h-screen">
                {/* Header - Minimalist Bordered */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-6 bg-white border-b border-black">
                    <button
                        type="button"
                        className="lg:hidden p-2 -ml-2"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    {/* Breadcrumb / Title Area */}
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border border-black bg-white" />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">
                            {pathname.split('/')[1] || 'Overview'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex border border-swiss-green bg-green-50 px-3 py-1 text-xs font-mono text-swiss-green">
                            System Status: ONLINE
                        </div>
                        <button className="relative p-2 hover:bg-neutral-100">
                            <div className="absolute top-2 right-2 h-2 w-2 bg-swiss-orange" />
                            <Bell className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Page Content - Full Width Canvas */}
                <main className="flex-1 bg-neutral-50">
                    {children}
                </main>
            </div>
        </div>
    )
}
