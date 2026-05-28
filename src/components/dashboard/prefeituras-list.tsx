'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Building2, Users, FileText, AlertCircle, ArrowRight, Search, SlidersHorizontal, X } from 'lucide-react'

export interface OrgComDados {
  id: string
  nome: string
  municipio: string
  estado: string
  ativo: boolean
  is_demo: boolean
  processos: number
  andamento: number
  usuariosAtivos: number
  usuariosPend: number
  tokens: number
  creditos: number
  ultimaAtiv: string | null
}

interface Props {
  orgs: OrgComDados[]
  diasIa: number
}

const FAIXAS_IA = [
  { value: 'todas',  label: 'Todos os consumos' },
  { value: 'alto',   label: 'Alto (> 1.000 tok)' },
  { value: 'medio',  label: 'Médio (100–1.000)' },
  { value: 'baixo',  label: 'Baixo (< 100 tok)' },
  { value: 'zero',   label: 'Sem uso de IA' },
]

function matchFaixa(tokens: number, faixa: string): boolean {
  if (faixa === 'todas') return true
  if (faixa === 'alto')  return tokens > 1000
  if (faixa === 'medio') return tokens >= 100 && tokens <= 1000
  if (faixa === 'baixo') return tokens > 0 && tokens < 100
  if (faixa === 'zero')  return tokens === 0
  return true
}

export function PrefeiturasList({ orgs, diasIa }: Props) {
  const [busca,    setBusca]    = useState('')
  const [estado,   setEstado]   = useState('todos')
  const [status,   setStatus]   = useState('todas')
  const [faixaIa,  setFaixaIa]  = useState('todas')
  const [expanded, setExpanded] = useState(false)

  const estados = useMemo(() => {
    const set = new Set(orgs.map((o) => o.estado).filter(Boolean))
    return ['todos', ...Array.from(set).sort()]
  }, [orgs])

  const filtradas = useMemo(() => {
    return orgs.filter((org) => {
      const termo = busca.toLowerCase().trim()
      if (termo) {
        const match =
          org.nome.toLowerCase().includes(termo) ||
          org.municipio.toLowerCase().includes(termo) ||
          org.estado.toLowerCase().includes(termo)
        if (!match) return false
      }
      if (estado !== 'todos' && org.estado !== estado) return false
      if (status === 'ativas'    && !(org.ativo && !org.is_demo)) return false
      if (status === 'demo'      && !org.is_demo)                  return false
      if (status === 'suspensas' && org.ativo)                     return false
      if (!matchFaixa(org.tokens, faixaIa)) return false
      return true
    })
  }, [orgs, busca, estado, status, faixaIa])

  const temFiltroAtivo = busca || estado !== 'todos' || status !== 'todas' || faixaIa !== 'todas'

  function limparFiltros() {
    setBusca('')
    setEstado('todos')
    setStatus('todas')
    setFaixaIa('todas')
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--hairline)', background: 'var(--surface)' }}>
      {/* Cabeçalho com título e contador */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--hairline)', background: 'var(--surfaceAlt)' }}
      >
        <div>
          <p className="text-[15px] font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Prefeituras
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {filtradas.length === orgs.length
              ? `${orgs.length} organizações, ordenadas por atividade`
              : `${filtradas.length} de ${orgs.length} organizações`}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: expanded || temFiltroAtivo ? 'var(--primaryWash)' : 'var(--hairline)',
            color: expanded || temFiltroAtivo ? 'var(--primary)' : 'var(--muted)',
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
          {temFiltroAtivo && (
            <span
              className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              {[busca, estado !== 'todos', status !== 'todas', faixaIa !== 'todas'].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Barra de filtros */}
      {expanded && (
        <div
          className="px-6 py-4 border-b space-y-3"
          style={{ borderColor: 'var(--hairline)', background: 'var(--surface)' }}
        >
          {/* Busca livre */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Buscar por nome, município ou estado..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm rounded-lg border outline-none"
              style={{
                background: 'var(--surfaceAlt)',
                borderColor: 'var(--hairline)',
                color: 'var(--ink)',
              }}
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdowns */}
          <div className="flex flex-wrap gap-3">
            {/* Estado */}
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border outline-none"
              style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)', color: 'var(--ink)' }}
            >
              {estados.map((e) => (
                <option key={e} value={e}>{e === 'todos' ? 'Todos os estados' : e}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border outline-none"
              style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)', color: 'var(--ink)' }}
            >
              <option value="todas">Todos os status</option>
              <option value="ativas">Ativas</option>
              <option value="demo">Demo</option>
              <option value="suspensas">Suspensas</option>
            </select>

            {/* Faixa IA */}
            <select
              value={faixaIa}
              onChange={(e) => setFaixaIa(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border outline-none"
              style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)', color: 'var(--ink)' }}
            >
              {FAIXAS_IA.map((f) => (
                <option key={f.value} value={f.value}>{f.label} ({diasIa}d)</option>
              ))}
            </select>

            {/* Limpar */}
            {temFiltroAtivo && (
              <button
                onClick={limparFiltros}
                className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--error)', background: 'var(--errorWash)' }}
              >
                <X className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Building2 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--mutedSoft)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhuma prefeitura encontrada com esses filtros.</p>
          {temFiltroAtivo && (
            <button
              onClick={limparFiltros}
              className="mt-3 text-sm font-semibold"
              style={{ color: 'var(--primary)' }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        filtradas.map((org) => (
          <Link
            key={org.id}
            href={`/admin/prefeituras/${org.id}`}
            className="flex items-center gap-4 px-6 py-4 border-b transition-colors hover:bg-[var(--surfaceAlt)] last:border-b-0"
            style={{ borderColor: 'var(--hairline)' }}
          >
            {/* Ícone com indicador de status */}
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-[var(--r-md)] flex items-center justify-center"
                style={{ background: org.ativo ? 'var(--primaryWash)' : 'var(--surfaceAlt)' }}
              >
                <Building2 className="w-4 h-4" style={{ color: org.ativo ? 'var(--primary)' : 'var(--muted)' }} />
              </div>
              {org.is_demo && (
                <span
                  className="absolute -top-1 -right-1 text-[9px] font-bold px-1 rounded-full"
                  style={{ background: 'var(--warnWash)', color: 'var(--warn)' }}
                >D</span>
              )}
            </div>

            {/* Dados da org */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{org.nome}</p>
                {!org.ativo && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                    style={{ background: 'var(--errorWash)', color: 'var(--error)' }}
                  >
                    Suspensa
                  </span>
                )}
                {org.usuariosPend > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'var(--warnWash)', color: 'var(--warn)' }}
                  >
                    <AlertCircle className="w-2.5 h-2.5" />
                    {org.usuariosPend}
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {org.municipio} · {org.estado}
                {' · '}<span className="inline-flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> {org.usuariosAtivos}</span>
                {' · '}<span className="inline-flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" /> {org.processos} proc ({org.andamento} em and.)</span>
                {org.ultimaAtiv ? ` · ${new Date(org.ultimaAtiv).toLocaleDateString('pt-BR')}` : ''}
              </p>
            </div>

            {/* Métricas e seta */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                  {org.tokens.toLocaleString('pt-BR')} tok
                </p>
                <p className="text-xs font-mono" style={{ color: 'var(--mutedSoft)' }}>
                  {org.creditos.toLocaleString('pt-BR')} cred
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--mutedSoft)' }} />
            </div>
          </Link>
        ))
      )}
    </div>
  )
}
