export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

// Profile card skeleton
export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg border border-[#F4F4F5] overflow-hidden">
        <Skeleton className="w-full h-24 rounded-none" />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12 mb-4">
            <Skeleton className="w-24 h-24 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="mt-6 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Yearbook grid skeleton
export function YearbookSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <Skeleton className="w-full aspect-square rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Admin table skeleton
export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, r) => (
        <Skeleton key={r} className="h-12 w-full" />
      ))}
    </div>
  );
}

// Dashboard stat cards skeleton
export function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-[#F4F4F5] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="w-10 h-10 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

// Generic inline skeleton for simple loading text
export function TextSkeleton({ width = "w-32" }: { width?: string }) {
  return <Skeleton className={`h-4 ${width}`} />;
}

// Form skeleton — simple card with skeleton lines mimicking a form layout
export function FormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg border border-[#F4F4F5] p-6 space-y-6">
        <Skeleton className="h-7 w-40" />
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
