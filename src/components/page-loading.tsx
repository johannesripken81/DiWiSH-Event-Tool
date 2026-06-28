function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`}
    />
  );
}

export function PageLoading({
  cards = 3,
  rows = 5,
}: {
  cards?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-6" role="status" aria-label="Lädt">
      <div className="space-y-3">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-8 w-full max-w-md" />
        <SkeletonBlock className="h-4 w-full max-w-2xl" />
      </div>

      {cards > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: cards }).map((_, index) => (
            <div
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              key={`loading-card-${index}`}
            >
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="mt-4 h-8 w-16" />
              <SkeletonBlock className="mt-4 h-3 w-full" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <SkeletonBlock className="h-5 w-48" />
          <SkeletonBlock className="mt-3 h-3 w-full max-w-lg" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, index) => (
            <div
              className="grid gap-4 px-5 py-4 md:grid-cols-[1.3fr_1fr_0.8fr]"
              key={`loading-row-${index}`}
            >
              <SkeletonBlock className="h-5 w-full" />
              <SkeletonBlock className="h-5 w-3/4" />
              <SkeletonBlock className="h-5 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
