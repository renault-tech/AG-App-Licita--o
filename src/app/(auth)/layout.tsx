/* eslint-disable @next/next/no-img-element */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  /* Cor base alinhada ao tema Cataguases — tom levemente mais claro que o fundo da logo para o mix-blend-mode funcionar perfeitamente */
  const navyDeep = '#112239'
  const gold     = '#D4A020'
  const goldSoft = '#E8C060'
  const cream    = '#F5F0E0'

  return (
    <div className="min-h-screen flex" style={{ background: '#EDE8D8' }}>
      {/* Painel esquerdo: identidade institucional */}
      <div
        className="hidden lg:flex lg:w-[440px] xl:w-[500px] shrink-0 flex-col"
        style={{ background: navyDeep, position: 'relative', overflow: 'hidden' }}
      >


        {/* Linha dourada decorativa no topo */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${gold}, ${goldSoft}, ${gold})` }} />

        <div className="flex-1 flex flex-col justify-between p-10 xl:p-12 relative z-10">
          {/* Topo: logo + nome plataforma */}
          <div className="flex items-center gap-3">
            <div
              className="rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(255,255,255,0.12)`, width: 38, height: 38 }}
            >
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'var(--font-inter)' }}>LI</span>
            </div>
            <div>
              <span
                className="text-lg font-bold tracking-tight"
                style={{ color: cream, fontFamily: 'var(--font-newsreader)' }}
              >
                LicitaIA
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mt-0.5" style={{ color: gold }}>
                Lei 14.133/21
              </p>
            </div>
          </div>

          {/* Centro: apenas a logo da prefeitura */}
          <div className="flex-1 w-full relative min-h-0 my-8">
            <img
              src="https://jqzkfuablvszpmhrzfwq.supabase.co/storage/v1/object/public/Logo%20Cataguases/LOGO%20TRANSP.png"
              alt="Logo da Prefeitura de Cataguases"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ transform: 'scale(1.8)' }}
            />
          </div>

          {/* Rodape e texto */}
          <div className="shrink-0 flex flex-col items-start space-y-8">
            <p
              className="text-[13.5px] leading-relaxed max-w-[300px]"
              style={{ color: 'rgba(245,240,224,0.65)', fontFamily: 'var(--font-inter)' }}
            >
              Plataforma de automacao de processos licitatorios. Do DFD ao edital, com auxilio de inteligencia artificial.
            </p>

            <div className="space-y-2.5">
            {[
              'Conformidade com a Lei 14.133/21',
              'Geracao assistida por IA',
              'Fluxo completo de tramitacao',
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5">
                <div
                  className="rounded-full shrink-0"
                  style={{ width: 5, height: 5, background: gold }}
                />
                <span className="text-sm" style={{ color: 'rgba(245,240,224,0.60)' }}>{item}</span>
              </div>
            ))}
            <p className="text-[11px] mt-4 pt-4" style={{ color: 'rgba(245,240,224,0.25)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              &copy; {new Date().getFullYear()} LicitaIA
            </p>
          </div>
        </div>
      </div>

        {/* Linha dourada decorativa no rodape */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${gold}, ${goldSoft}, ${gold})` }} />
      </div>

      {/* Painel direito: formulario com suporte a zoom isolado */}
      <div 
        className="flex-1 flex items-center justify-center px-6 py-12"
        style={{ zoom: 'var(--zoom-level, 1)' }}
      >
        <div className="w-full max-w-md">
          {/* Logo mobile: logo + nome */}
          <div className="lg:hidden flex flex-col items-center mb-10 gap-6">
            <div className="w-full h-[240px] relative">
              <img
                src="https://jqzkfuablvszpmhrzfwq.supabase.co/storage/v1/object/public/Logo%20Cataguases/LOGO%20TRANSP.png"
                alt="Logo da Prefeitura de Cataguases"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{ transform: 'scale(1.8)' }}
              />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2.5">
                <div
                  className="rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: navyDeep, width: 32, height: 32 }}
                >
                  <span className="text-white font-bold text-xs">LI</span>
                </div>
                <span
                  className="text-lg font-bold tracking-tight"
                  style={{ color: navyDeep, fontFamily: 'var(--font-newsreader)' }}
                >
                  LicitaIA
                </span>
              </div>
              <p className="text-[10px] font-semibold text-center uppercase tracking-[0.18em] mt-1" style={{ color: gold }}>
                Lei 14.133/21
              </p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
