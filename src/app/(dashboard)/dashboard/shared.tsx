import React from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, Plus } from 'lucide-react'
import { EditorialKicker, HeadlineSerif, Wordmark } from '@/components/licita/editorial'

/* ----------------------------------------------------------------
 * saudacao — bom dia / boa tarde / boa noite (horario BRT)
 * ---------------------------------------------------------------- */
function saudacao(): string {
  const utcHour = new Date().getUTCHours()
  const brtHour = ((utcHour - 3) + 24) % 24
  if (brtHour < 12) return 'Bom dia'
  if (brtHour < 18) return 'Boa tarde'
  return 'Boa noite'
}

/* ----------------------------------------------------------------
 * FooterEditorial
 * ---------------------------------------------------------------- */
export function FooterEditorial() {
  return (
    <div className="pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--hairline)' }}>
      <Wordmark />
      <div className="font-mono text-[9.5px]" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>
        Painel atualizado · {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
 * SectionHeader
 * Com nome: renderiza "Bom dia, [Nome]." + linha italic contextual
 * Sem nome: layout editorial padrao com regra horizontal
 * ---------------------------------------------------------------- */
export function SectionHeader({
  supTitle, title, contextLine, subtitle, action, nome,
}: {
  supTitle: string
  title: string
  contextLine?: string
  subtitle?: string
  action?: React.ReactNode
  nome?: string | null
}) {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  }).replace(/^./, (c) => c.toUpperCase())

  if (nome) {
    const primeiroNome = nome.trim().split(' ')[0]
    const saud = saudacao()
    return (
      <div>
        {/* Kicker editorial */}
        <div className="flex items-center justify-between pb-3 mb-5" style={{ borderBottom: '1px solid var(--hairline)' }}>
          <EditorialKicker kicker={supTitle} date={hoje} />
          <div className="font-mono text-[10px] font-semibold uppercase hidden sm:block" style={{ color: 'var(--muted)', letterSpacing: '0.14em' }}>
            Lei 14.133/21
          </div>
        </div>

        {/* Headline personalizada + CTA */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-2">
          <div>
            {/* "Bom dia, Mariana." */}
            <HeadlineSerif size="xxl" as="h1">
              {saud}, {primeiroNome}.
            </HeadlineSerif>
            {/* Linha italic contextual */}
            {contextLine && (
              <HeadlineSerif
                size="xl"
                as="p"
                style={{ fontStyle: 'italic', color: 'var(--inkSoft)', fontWeight: 400, marginTop: 6 }}
              >
                {contextLine}
              </HeadlineSerif>
            )}
            {/* Paragrafo descritivo */}
            {subtitle && (
              <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--inkSoft)', maxWidth: '52ch' }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="shrink-0 mt-1">{action}</div>
          )}
        </div>
      </div>
    )
  }

  /* Layout padrao (sem saudacao personalizada) */
  return (
    <div>
      <div className="flex items-center justify-between pb-3.5 mb-5" style={{ borderBottom: '2px solid var(--rule)' }}>
        <EditorialKicker kicker={supTitle} date={hoje} />
        <div className="font-mono text-[10px] font-semibold uppercase hidden sm:block" style={{ color: 'var(--muted)', letterSpacing: '0.14em' }}>
          Lei 14.133/21
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          {subtitle && <div className="l-meta mb-2" style={{ color: 'var(--muted)' }}>{subtitle}</div>}
          <HeadlineSerif size="lg" as="h1">{title}</HeadlineSerif>
          {contextLine && (
            <p className="mt-3 l-h" style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 19, lineHeight: 1.4, color: 'var(--inkSoft)', fontWeight: 400, maxWidth: '54ch' }}>
              {contextLine}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
 * ListCard — container glass com cabecalho
 * ---------------------------------------------------------------- */
export function ListCard({ title, subtitle, action, children }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="glass rounded-[var(--r-lg)] overflow-hidden">
      <div
        className="flex flex-row items-center justify-between px-6 py-5 border-b"
        style={{ borderColor: 'var(--glass-edge)', background: 'rgba(0,0,0,0.025)' }}
      >
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>{title}</h2>
          {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

/* ----------------------------------------------------------------
 * ProcessosListSection — secao de lista com rows glass individuais
 * ---------------------------------------------------------------- */
export function ProcessosListSection({ title, rightLabel, children, emptyMessage }: {
  title: string
  rightLabel?: string
  children: React.ReactNode
  emptyMessage?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
          {title}
        </h2>
        {rightLabel && (
          <span className="text-[9.5px] font-bold uppercase" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em' }}>
            {rightLabel}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {children}
      </div>
      {emptyMessage && !children && (
        <div className="glass rounded-[var(--r-lg)] px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
          {emptyMessage}
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------
 * NovoProcessoCTA — botao primario flutuante (pill)
 * ---------------------------------------------------------------- */
export function NovoProcessoCTA() {
  return (
    <Link
      href="/processos/novo"
      className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13px] font-semibold transition-opacity hover:opacity-90 shrink-0"
      style={{ background: 'var(--primary)', color: 'var(--primaryInk)' }}
    >
      <span
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ background: 'var(--accent)' }}
      />
      Novo processo com Licita-IA
    </Link>
  )
}

/* ----------------------------------------------------------------
 * DarkFeaturedCard — cartao de destaque escuro para item urgente
 * ---------------------------------------------------------------- */
export function DarkFeaturedCard({ titulo, descricao, href, badge, meta }: {
  titulo: string
  descricao?: string
  href: string
  badge?: string
  meta?: string
}) {
  return (
    <div
      className="rounded-[var(--r-lg)] p-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primarySoft, var(--primary)) 100%)',
        color: 'var(--primaryInk)',
      }}
    >
      {/* Glow de fundo decorativo */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.06)' }}
        aria-hidden="true"
      />

      {badge && (
        <div
          className="text-[9px] font-bold uppercase mb-3"
          style={{ letterSpacing: '0.18em', opacity: 0.6 }}
        >
          {badge}
        </div>
      )}
      <h3
        className="text-[16px] font-bold leading-snug mb-2"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {titulo}
      </h3>
      {descricao && (
        <p className="text-[12.5px] leading-relaxed mb-4" style={{ opacity: 0.72 }}>
          {descricao}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-opacity hover:opacity-80"
          style={{ opacity: 0.92 }}
        >
          Abrir processo
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        {meta && (
          <span className="font-mono text-[10px]" style={{ opacity: 0.45 }}>{meta}</span>
        )}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
 * AiSuggestionCard — cartao de sugestao da IA
 * ---------------------------------------------------------------- */
export function AiSuggestionCard({ texto, hrefAplicar, hrefDetalhes }: {
  texto: string
  hrefAplicar?: string
  hrefDetalhes?: string
}) {
  return (
    <div className="glass rounded-[var(--r-lg)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--primaryWash)' }}
        >
          <Sparkles className="w-2.5 h-2.5" style={{ color: 'var(--primary)' }} />
        </div>
        <span
          className="text-[9px] font-bold uppercase"
          style={{ color: 'var(--accent)', letterSpacing: '0.16em' }}
        >
          Licita-IA · Sugestão
        </span>
      </div>
      <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: 'var(--inkSoft)' }}>
        {texto}
      </p>
      <div className="flex gap-2 flex-wrap">
        {hrefAplicar && (
          <Link
            href={hrefAplicar}
            className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'var(--primaryWash)', color: 'var(--primary)' }}
          >
            <Plus className="w-3 h-3" />
            Aplicar sugestão
          </Link>
        )}
        {hrefDetalhes && (
          <Link
            href={hrefDetalhes}
            className="inline-flex items-center text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--hairline)', color: 'var(--inkSoft)' }}
          >
            Ver detalhes
          </Link>
        )}
      </div>
    </div>
  )
}
