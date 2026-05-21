'use client'

import type { MensagemChat } from '@/types/chat'

interface MensagemChatProps {
  mensagem: MensagemChat
  eProprioUsuario: boolean
}

function formatarHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
}

const PAPEL_LABEL: Record<string, string> = {
  requisitante:           'Requisitante',
  setor_licitacao:        'Licitacao',
  procurador:             'Procurador',
  autoridade_competente:  'Autoridade',
  admin_organizacao:      'Admin',
  admin_plataforma:       'Admin',
}

export function MensagemChatItem({ mensagem, eProprioUsuario }: MensagemChatProps) {
  const nome = mensagem.autor?.nome_completo?.split(' ')[0] ?? 'Usuario'
  const papelLabel = mensagem.autor?.papel ? (PAPEL_LABEL[mensagem.autor.papel] ?? mensagem.autor.papel) : ''

  return (
    <div className={`flex gap-2.5 ${eProprioUsuario ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
        style={{
          background: eProprioUsuario ? 'var(--primary)' : 'var(--accentWash)',
          color: eProprioUsuario ? 'var(--primaryInk)' : 'var(--accent)',
        }}
      >
        {nome.slice(0, 2).toUpperCase()}
      </div>

      <div className={`max-w-[72%] ${eProprioUsuario ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!eProprioUsuario && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>{nome}</span>
            {papelLabel && (
              <span
                className="text-[9px] font-medium px-1.5 py-px rounded-sm"
                style={{ background: 'var(--accentWash)', color: 'var(--accent)' }}
              >
                {papelLabel}
              </span>
            )}
          </div>
        )}
        <div
          className="px-3 py-2 text-sm leading-relaxed"
          style={{
            background: eProprioUsuario ? 'var(--primary)' : 'var(--surfaceAlt)',
            color: eProprioUsuario ? 'var(--primaryInk)' : 'var(--ink)',
            borderRadius: eProprioUsuario ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {mensagem.conteudo}
        </div>
        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
          {formatarHora(mensagem.criado_em)}
          {mensagem.editado_em && ' (editado)'}
        </span>
      </div>
    </div>
  )
}
