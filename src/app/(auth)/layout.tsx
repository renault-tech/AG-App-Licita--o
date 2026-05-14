/* eslint-disable @next/next/no-img-element */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  /* Cor base alinhada ao tema Cataguases — azul marinho real da logo */
  const navyDeep = '#0E1B33'
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
        {/* Textura sutil de fundo — padrão geométrico inspirado no triângulo da logo */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          viewBox="0 0 500 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <polygon points="250,50 450,350 50,350" fill={cream} />
          <polygon points="250,200 420,480 80,480" fill={cream} />
          <polygon points="250,380 390,600 110,600" fill={cream} />
          <polygon points="250,550 370,720 130,720" fill={cream} />
        </svg>

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

          {/* Centro: logo da prefeitura + nome da organização */}
          <div className="flex flex-col items-center text-center gap-6 py-8">
            {/* Logo PNG da prefeitura — proporção 2:3 preservada */}
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src="/logo-prefeitura.png"
                alt="Logo da Prefeitura de Cataguases"
                style={{ height: 120, width: 'auto', objectFit: 'contain' }}
              />
            </div>

            <div>
              <p
                className="text-2xl font-bold tracking-wide leading-tight"
                style={{ color: cream, fontFamily: 'var(--font-newsreader)', letterSpacing: '0.06em' }}
              >
                CATAGUASES
              </p>
              <p
                className="text-xs font-semibold tracking-[0.22em] uppercase mt-1"
                style={{ color: gold }}
              >
                PREFEITURA MUNICIPAL
              </p>
              <div
                className="mx-auto mt-3"
                style={{ width: 40, height: 1.5, background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }}
              />
            </div>

            <p
              className="text-[13.5px] leading-relaxed max-w-[300px]"
              style={{ color: 'rgba(245,240,224,0.65)', fontFamily: 'var(--font-inter)' }}
            >
              Plataforma de automacao de processos licitatorios. Do DFD ao edital, com auxilio de inteligencia artificial.
            </p>
          </div>

          {/* Rodape: recursos */}
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

        {/* Linha dourada decorativa no rodape */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${gold}, ${goldSoft}, ${gold})` }} />
      </div>

      {/* Painel direito: formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo mobile: logo + nome */}
          <div className="lg:hidden flex flex-col items-center mb-8 gap-3">
            <div style={{ height: 72, display: 'flex', alignItems: 'center' }}>
              <img
                src="/logo-prefeitura.png"
                alt="Logo da Prefeitura de Cataguases"
                style={{ height: 72, width: 'auto', objectFit: 'contain' }}
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
