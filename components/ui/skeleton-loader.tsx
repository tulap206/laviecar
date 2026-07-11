import React from "react"

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-slate-100 p-6 card-animate">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="skeleton skeleton-text w-32 animate-pulse bg-slate-200 h-4 rounded" />
            <div className="skeleton skeleton-text w-24 h-3 animate-pulse bg-slate-200 rounded mt-1" />
          </div>
          <div className="skeleton skeleton-avatar w-10 h-10 animate-pulse bg-slate-200 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="skeleton skeleton-text w-48 h-8 animate-pulse bg-slate-200 rounded" />
          <div className="skeleton skeleton-text w-32 h-3 animate-pulse bg-slate-200 rounded mt-1" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonMetricCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 flex gap-4">
        <div className="skeleton skeleton-text w-32 animate-pulse bg-slate-200 h-4 rounded" />
        <div className="skeleton skeleton-text w-40 flex-1 animate-pulse bg-slate-200 h-4 rounded" />
        <div className="skeleton skeleton-text w-24 animate-pulse bg-slate-200 h-4 rounded" />
      </div>
      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4 items-center">
            <div className="skeleton skeleton-text w-32 flex-1 animate-pulse bg-slate-200 h-4 rounded" />
            <div className="skeleton skeleton-text w-40 animate-pulse bg-slate-200 h-4 rounded" />
            <div className="skeleton skeleton-text w-24 animate-pulse bg-slate-200 h-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonCharts() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-slate-100 p-6 card-animate">
          <div className="skeleton skeleton-text w-32 mb-4 animate-pulse bg-slate-200 h-4 rounded" />
          <div className="h-64 skeleton rounded-lg animate-pulse bg-slate-200" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <SkeletonMetricCards count={4} />
      <SkeletonTable rows={3} />
      <SkeletonCharts />
    </div>
  )
}
