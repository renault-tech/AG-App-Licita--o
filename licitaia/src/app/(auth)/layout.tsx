export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 tracking-tight">LicitaIA</h1>
          <p className="text-sm text-blue-600 mt-1">Gestão de Licitações conforme Lei 14.133/21</p>
        </div>
        {children}
      </div>
    </div>
  )
}
