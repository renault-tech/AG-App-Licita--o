'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { XCircle, Clock, CheckCircle2, Ban, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { revogarConvite } from '@/lib/actions/convites'
import type { Convite } from '@/lib/actions/convites'

const STATUS_LABEL: Record<Convite['status'], string> = {
  pendente:  'Pendente',
  aceito:    'Aceito',
  revogado:  'Revogado',
  expirado:  'Expirado',
}

const STATUS_COLOR: Record<Convite['status'], { bg: string; color: string }> = {
  pendente:  { bg: 'var(--primaryWash)',  color: 'var(--primary)' },
  aceito:    { bg: 'var(--successWash)',  color: 'var(--success)' },
  revogado:  { bg: 'var(--dangerWash)',   color: 'var(--danger)' },
  expirado:  { bg: 'var(--warnWash)',     color: 'var(--warn)' },
}

const STATUS_ICON: Record<Convite['status'], React.ReactNode> = {
  pendente:  <Clock className="w-3 h-3" />,
  aceito:    <CheckCircle2 className="w-3 h-3" />,
  revogado:  <Ban className="w-3 h-3" />,
  expirado:  <XCircle className="w-3 h-3" />,
}

export default function TabelaConvites({ convites: inicial }: { convites: Convite[] }) {
  const [convites, setConvites] = useState(inicial)
  const [revogando, setRevogando] = useState<string | null>(null)

  async function handleRevogar(id: string, email: string) {
    if (!confirm(`Revogar convite para ${email}?`)) return
    setRevogando(id)
    const res = await revogarConvite(id)
    if (!res.success) {
      toast.error(res.error ?? 'Erro ao revogar convite.')
    } else {
      toast.success('Convite revogado.')
      setConvites(prev => prev.map(c => c.id === id ? { ...c, status: 'revogado' } : c))
    }
    setRevogando(null)
  }

  if (convites.length === 0) {
    return (
      <div
        className="rounded-[var(--r-lg)] border px-6 py-10 text-center"
        style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
      >
        <Mail className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhum convite enviado ainda.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--r-lg)] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}>
      <div className="px-6 py-4 border-b" style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}>
        <h3 className="text-base font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
          Convites enviados
        </h3>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--hairline)' }}>
        {convites.map((c) => {
          const cores = STATUS_COLOR[c.status]
          const expiresDate = new Date(c.expires_at).toLocaleDateString('pt-BR')
          const sentDate    = new Date(c.created_at).toLocaleDateString('pt-BR')

          return (
            <div key={c.id} className="flex items-center justify-between px-6 py-4 gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{c.email_destino}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {[c.nome_prefeitura, c.municipio, c.estado].filter(Boolean).join(', ') || 'Sem dados de prefeitura'}
                  {' · '}
                  Enviado {sentDate}
                  {c.status === 'pendente' && ` · Expira ${expiresDate}`}
                  {c.status === 'aceito' && c.accepted_at && ` · Aceito ${new Date(c.accepted_at).toLocaleDateString('pt-BR')}`}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: cores.bg, color: cores.color }}
                >
                  {STATUS_ICON[c.status]}
                  {STATUS_LABEL[c.status]}
                </span>

                {c.status === 'pendente' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevogar(c.id, c.email_destino)}
                    disabled={revogando === c.id}
                    className="text-xs h-7"
                    style={{ color: 'var(--danger)' }}
                  >
                    Revogar
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
