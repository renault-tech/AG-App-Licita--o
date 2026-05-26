export default function UsuariosLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-7 w-48 rounded-lg bg-muted" />
      <div className="h-24 rounded-xl bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}
