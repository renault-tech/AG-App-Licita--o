export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      {/* Painel esquerdo: identidade naval */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 flex-col justify-between p-12"
        style={{ backgroundColor: '#1A365D' }}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="text-white font-bold text-sm">LI</span>
            </div>
            <span
              className="text-xl font-bold text-white tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              LicitaIA
            </span>
          </div>
          <p className="text-[11px] font-semibold text-[#B7935E] uppercase tracking-widest mt-2 ml-11">
            Lei 14.133/21
          </p>
        </div>

        <div className="space-y-6">
          <p className="text-white/80 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Plataforma de automacao de processos licitatorios para prefeituras e orgaos publicos. Do DFD ao edital, com auxilio de inteligencia artificial.
          </p>
          <div className="flex flex-col gap-3">
            {[
              'Conformidade com a Lei 14.133/21',
              'Geracao assistida por IA',
              'Fluxo completo de tramitacao',
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#B7935E] shrink-0" />
                <span className="text-white/70 text-[13px]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">
          &copy; {new Date().getFullYear()} LicitaIA
        </p>
      </div>

      {/* Painel direito: formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo para mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-[#1A365D] flex items-center justify-center">
                <span className="text-white font-bold text-sm">LI</span>
              </div>
              <span
                className="text-xl font-bold text-[#1A365D] tracking-tight"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                LicitaIA
              </span>
            </div>
            <p className="text-[11px] font-semibold text-[#B7935E] uppercase tracking-widest">
              Lei 14.133/21
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}