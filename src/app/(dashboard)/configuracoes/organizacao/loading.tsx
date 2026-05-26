export default function OrgLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-7 w-56 rounded-lg bg-muted" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-9 rounded-lg bg-muted" />
        </div>
      ))}
      <div className="h-9 w-32 rounded-lg bg-muted mt-4" />
    </div>
  )
}
