'use client'

import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  variant?: "default" | "card" | "text" | "circle" | "metric"
}

export function Skeleton({ className, variant = "default" }: SkeletonProps) {
  const baseStyles = "animate-pulse bg-neutral-200"
  
  const variants = {
    default: "rounded",
    card: "rounded-lg",
    text: "rounded-sm",
    circle: "rounded-full",
    metric: "rounded-none"
  }

  return (
    <div className={cn(baseStyles, variants[variant], className)} />
  )
}

// Pre-built skeleton patterns
export function MetricCardSkeleton() {
  return (
    <div className="bg-white border border-black p-6 h-48 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <Skeleton className="h-3 w-24" variant="text" />
        <Skeleton className="h-3 w-3 rounded-full" variant="circle" />
      </div>
      <div>
        <Skeleton className="h-12 w-32 mb-2" variant="metric" />
        <Skeleton className="h-3 w-40" variant="text" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-black/10">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton className="h-4 w-full max-w-[120px]" variant="text" />
        </td>
      ))}
    </tr>
  )
}

export function ReceiptCardSkeleton() {
  return (
    <div className="border border-black bg-white">
      <Skeleton className="h-32 w-full" variant="metric" />
      <div className="p-4 border-t border-black space-y-2">
        <Skeleton className="h-4 w-3/4" variant="text" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" variant="text" />
          <Skeleton className="h-3 w-16" variant="text" />
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-0">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b border-black">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[600px]">
        {/* Table */}
        <div className="lg:col-span-2 bg-white p-8">
          <Skeleton className="h-6 w-40 mb-6" variant="text" />
          <div className="border border-black overflow-hidden">
            <table className="w-full">
              <thead className="bg-neutral-100 border-b border-black">
                <tr>
                  {['Date', 'Store', 'Amount', 'Category'].map((_, i) => (
                    <th key={i} className="p-3">
                      <Skeleton className="h-3 w-16" variant="text" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-1 bg-neutral-50 border-l border-black p-8">
          <Skeleton className="h-64 w-full mb-4" variant="metric" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" variant="metric" />
            <Skeleton className="h-10 w-full" variant="metric" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReceiptsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ReceiptCardSkeleton key={i} />
      ))}
    </div>
  )
}
