import type { ReactNode, ElementType, CSSProperties } from 'react'

// EditorialKicker — kicker editorial com edição e data
export function EditorialKicker({
  kicker, edition, date, tone = 'accent',
}: {
  kicker?: string
  edition?: string
  date?: string
  tone?: 'accent' | 'muted'
}) {
  return (
    <div
      className="flex items-center gap-2.5 text-[10px] font-bold uppercase"
      style={{
        letterSpacing: '0.18em',
        color: tone === 'accent' ? 'var(--accent)' : 'var(--muted)',
      }}
    >
      {kicker && <span>{kicker}</span>}
      {kicker && (edition || date) && (
        <span className="h-px w-3.5 opacity-40" style={{ background: 'currentColor' }} />
      )}
      {edition && (
        <span className="font-mono" style={{ color: 'var(--muted)', letterSpacing: '0.04em' }}>
          {edition}
        </span>
      )}
      {edition && date && (
        <span className="h-[3px] w-[3px] rounded-full" style={{ background: 'var(--mutedSoft)' }} />
      )}
      {date && (
        <span className="l-tnum" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>
          {date}
        </span>
      )}
    </div>
  )
}

// HeadlineSerif — H1 editorial dramático
const headlineSizes = {
  sm:  { fs: 22, lh: 1.18, ls: '-0.012em' },
  md:  { fs: 30, lh: 1.12, ls: '-0.018em' },
  lg:  { fs: 42, lh: 1.06, ls: '-0.022em' },
  xl:  { fs: 56, lh: 1.02, ls: '-0.028em' },
  xxl: { fs: 72, lh: 0.98, ls: '-0.032em' },
} as const

export function HeadlineSerif({
  children, size = 'xl', as: As = 'h1', maxWidth, style = {},
}: {
  children: ReactNode
  size?: keyof typeof headlineSizes
  as?: ElementType
  maxWidth?: number | string
  style?: CSSProperties
}) {
  const s = headlineSizes[size]
  return (
    <As
      className="l-h"
      style={{
        fontFamily: 'var(--font-heading)',
        fontSize: s.fs, lineHeight: s.lh, letterSpacing: s.ls,
        margin: 0, color: 'var(--ink)', fontWeight: 500,
        maxWidth, textWrap: 'balance' as const,
        ...style,
      }}
    >
      {children}
    </As>
  )
}

// RuleHead — título de seção com regra horizontal
export function RuleHead({
  kicker, children, rightLabel, level = 2,
}: {
  kicker?: string
  children: ReactNode
  rightLabel?: string
  level?: 1 | 2 | 3
}) {
  const fontSize = { 1: 36, 2: 22, 3: 16 }[level]
  return (
    <div className="mb-[18px]">
      {kicker && (
        <div className="l-meta mb-2" style={{ color: 'var(--accent)' }}>{kicker}</div>
      )}
      <div
        className="flex items-baseline gap-[18px] pb-2.5"
        style={{ borderBottom: '1px solid var(--rule)' }}
      >
        <h2
          className="l-h flex-1 m-0"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize, lineHeight: 1.1, letterSpacing: '-0.018em',
            fontWeight: 500,
          }}
        >
          {children}
        </h2>
        {rightLabel && (
          <div className="l-meta" style={{ color: 'var(--muted)' }}>{rightLabel}</div>
        )}
      </div>
    </div>
  )
}

// BigStat — número grande tipo cover de relatório anual
export function BigStat({
  label, valor, sub, accent = false,
}: {
  label: string
  valor: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="l-meta" style={{ color: 'var(--muted)' }}>{label}</div>
      <div
        className="l-h l-tnum"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 64, lineHeight: 0.92, letterSpacing: '-0.035em',
          color: accent ? 'var(--accent)' : 'var(--ink)',
          fontWeight: 500,
        }}
      >
        {valor}
      </div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--inkSoft)' }}>{sub}</div>}
    </div>
  )
}

// SectionMark — § I — Label
const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
export function SectionMark({ n, label }: { n: number; label?: string }) {
  return (
    <div className="inline-flex items-baseline gap-2.5">
      <span
        className="l-h"
        style={{
          fontFamily: 'var(--font-heading)', fontSize: 18,
          color: 'var(--accent)', letterSpacing: '0.08em', fontWeight: 500,
        }}
      >
        § {ROMANS[n - 1] || n}
      </span>
      {label && <span className="l-meta" style={{ color: 'var(--muted)' }}>{label}</span>}
    </div>
  )
}

// DotLeader — "Chave ............. valor" (estilo TOC)
export function DotLeader({
  label, value, valueAccent = false, mono = false,
}: {
  label: string
  value: string
  valueAccent?: boolean
  mono?: boolean
}) {
  return (
    <div className="l-leader text-[12.5px] py-0.5">
      <span style={{ color: 'var(--inkSoft)', fontWeight: 500 }}>{label}</span>
      <span className="l-leader-fill" />
      <span
        className={mono ? 'l-mono' : 'l-tnum'}
        style={{
          color: valueAccent ? 'var(--accent)' : 'var(--ink)',
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  )
}

// Wordmark — "LICITA·IA" para footers
export function Wordmark({
  size = 12, opacity = 0.55, mono = true,
}: {
  size?: number
  opacity?: number
  mono?: boolean
}) {
  return (
    <span
      className={mono ? 'l-mono' : ''}
      style={{
        fontSize: size, letterSpacing: '0.32em', textTransform: 'uppercase',
        fontWeight: 700, color: 'var(--ink)', opacity,
      }}
    >
      Licita·IA
    </span>
  )
}

// DotStatus — "● Em análise" para listas densas
const dotColors: Record<string, string> = {
  rascunho:               'var(--statusRascunho, var(--muted))',
  em_revisao:             'var(--statusRevisao, var(--warn))',
  assinado:               'var(--statusAssinado, var(--success))',
  publicado:              'var(--statusPublicado, var(--success))',
  em_andamento:           'var(--statusAnalise, var(--accent))',
  em_analise:             'var(--statusAnalise, var(--accent))',
  pendente:               'var(--statusRevisao, var(--warn))',
  aprovado:               'var(--statusPublicado, var(--success))',
  aprovado_com_ressalvas: 'var(--statusRevisao, var(--warn))',
  devolvido:              'var(--statusDevolvido, var(--danger))',
}
const dotLabels: Record<string, string> = {
  rascunho:               'Rascunho',
  em_revisao:             'Em revisão',
  assinado:               'Assinado',
  publicado:              'Publicado',
  em_andamento:           'Em análise',
  em_analise:             'Em análise',
  pendente:               'Pendente',
  aprovado:               'Aprovado',
  aprovado_com_ressalvas: 'Aprovado c/ ressalvas',
  devolvido:              'Devolvido',
}
export function DotStatus({ status }: { status: string }) {
  const c = dotColors[status] ?? 'var(--muted)'
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        color: c, fontSize: 10.5,
        letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {dotLabels[status] ?? String(status)}
    </span>
  )
}
