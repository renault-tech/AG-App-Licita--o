/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { Brasao } from '@/components/licita/brasao'
import {
  AuthBrandingContext,
  DEFAULT_BRANDING,
  type OrgBranding,
} from '@/lib/auth/branding-context'

export default function AuthLayoutClient({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<OrgBranding>(DEFAULT_BRANDING)

  const setBrandingByOrgId = useCallback(async (orgId: string) => {
    if (!orgId) { setBrandingState(DEFAULT_BRANDING); return }
    try {
      const res = await fetch(`/api/org-branding?orgId=${encodeURIComponent(orgId)}`)
      if (res.ok) {
        const data = await res.json() as OrgBranding
        setBrandingState(data)
      }
    } catch { /* falha silenciosa — mantém branding atual */ }
  }, [])

  const { cor_primaria, brasao_url, nome } = branding

  return (
    <AuthBrandingContext.Provider value={{ branding, setBrandingByOrgId }}>
      <div className="min-h-screen flex" style={{ background: '#EDE8D8' }}>

        {/* Painel esquerdo: identidade institucional */}
        <div
          className="hidden lg:flex lg:w-[440px] xl:w-[500px] shrink-0 flex-col"
          style={{
            background:  cor_primaria,
            position:    'relative',
            overflow:    'hidden',
            transition:  'background-color 0.4s ease',
          }}
        >
          <div style={{ height: 3, background: 'linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0.55), rgba(255,255,255,0.25))' }} />

          <div className="flex-1 flex flex-col justify-between p-10 xl:p-12 relative z-10">
            {/* Topo: LicitaIA */}
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', width: 38, height: 38 }}
              >
                <span className="text-white font-bold text-sm" style={{ fontFamily: 'var(--font-inter)' }}>LI</span>
              </div>
              <div>
                <span
                  className="text-lg font-bold tracking-tight"
                  style={{ color: '#F5F0E0', fontFamily: 'var(--font-newsreader)' }}
                >
                  LicitaIA
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Lei 14.133/21
                </p>
              </div>
            </div>

            {/* Centro: logo da prefeitura */}
            <div className="flex-1 w-full relative min-h-0 my-8 overflow-hidden">
              {brasao_url ? (
                <img
                  src={brasao_url}
                  alt={nome ?? 'Logo da Prefeitura'}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ transition: 'opacity 0.3s ease' }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brasao size={160} theme="petroleo" />
                </div>
              )}
            </div>

            {/* Rodape */}
            <div className="shrink-0 flex flex-col items-start space-y-6">
              {nome && (
                <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {nome}
                </p>
              )}
              <p className="text-[13px] leading-relaxed max-w-[300px]" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-inter)' }}>
                Plataforma de automacao de processos licitatorios. Do DFD ao edital, com auxilio de inteligencia artificial.
              </p>
              <div className="space-y-2.5">
                {[
                  'Conformidade com a Lei 14.133/21',
                  'Geracao assistida por IA',
                  'Fluxo completo de tramitacao',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5">
                    <div className="rounded-full shrink-0" style={{ width: 5, height: 5, background: 'rgba(255,255,255,0.45)' }} />
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>{item}</span>
                  </div>
                ))}
                <p className="text-[11px] mt-4 pt-4" style={{ color: 'rgba(255,255,255,0.18)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  &copy; {new Date().getFullYear()} LicitaIA
                </p>
              </div>
            </div>
          </div>

          <div style={{ height: 3, background: 'linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0.55), rgba(255,255,255,0.25))' }} />
        </div>

        {/* Painel direito: formulário — sem zoom (quebra portais Radix no Chrome) */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Logo mobile */}
            <div className="lg:hidden flex flex-col items-center mb-10 gap-4">
              <div className="w-full h-[140px] relative">
                {brasao_url ? (
                  <img src={brasao_url} alt="Logo" className="absolute inset-0 w-full h-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brasao size={100} theme="petroleo" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <span className="text-lg font-bold tracking-tight" style={{ color: '#112239', fontFamily: 'var(--font-newsreader)' }}>
                  LicitaIA
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mt-1" style={{ color: cor_primaria }}>
                  Lei 14.133/21
                </p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </AuthBrandingContext.Provider>
  )
}
