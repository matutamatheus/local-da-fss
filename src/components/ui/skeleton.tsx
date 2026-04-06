export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-[var(--gray-200)] via-[var(--gray-100)] to-[var(--gray-200)] bg-[length:200%_100%] rounded-lg ${className}`}
      style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export function CalendarSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  )
}
