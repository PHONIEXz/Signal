export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading your dashboard" className="space-y-6">
      <p className="text-sm text-ink-muted">Loading your workspace...</p>
      <div aria-hidden="true" className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="surface-card h-40 animate-pulse bg-surface-soft" />)}
      </div>
    </div>
  );
}
