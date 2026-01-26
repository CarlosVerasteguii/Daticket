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
    Bell
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility for Tailwind class merging (part of clean-code / tailwind-patterns)
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs))
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const pathname = usePathname()

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'My Receipts', href: '/receipts', icon: Receipt },
        { name: 'Upload Receipt', href: '/upload', icon: Upload },
        { name: 'Profile', href: '/profile', icon: User },
        { name: 'Settings', href: '/settings', icon: Settings },
    ]

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-violet-500/30">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-72 transform bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 transition-transform duration-300 ease-in-out lg:translate-x-0",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Logo Section */}
                    <div className="flex h-20 items-center px-8 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <span className="text-xl font-bold text-white">D</span>
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                Daticket
                            </span>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="ml-auto lg:hidden text-slate-400 hover:text-white"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                        <div className="mb-6 px-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Menu</p>
                        </div>
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "group flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                                        "hover:bg-white/5 hover:text-white hover:scale-[1.02] active:scale-95",
                                        isActive
                                            ? "bg-violet-500/10 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.1)] border border-violet-500/20"
                                            : "text-slate-400"
                                    )}
                                >
                                    <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300")} />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User Section (Bottom) */}
                    <div className="p-4 border-t border-white/5 bg-black/20">
                        <button className="flex w-full items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group text-left">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center ring-2 ring-transparent group-hover:ring-violet-500/50 transition-all">
                                <User className="h-5 w-5 text-slate-300" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm font-medium text-white">User Account</p>
                                <p className="truncate text-xs text-slate-500">View Profile</p>
                            </div>
                            <LogOut className="h-5 w-5 text-slate-500 group-hover:text-red-400 transition-colors" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="lg:pl-72">
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-20 items-center justify-between px-8 backdrop-blur-md bg-slate-950/80 border-b border-white/5">
                    <button
                        type="button"
                        className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="hidden lg:block">
                        {/* Breadcrumb or Page Title area could go here */}
                        <h2 className="text-sm font-medium text-slate-400">Overview</h2>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Notification Bell with Ping Animation */}
                        <button className="relative p-2 text-slate-400 hover:text-white transition-colors group">
                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-slate-950 animate-pulse"></span>
                            <Bell className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
