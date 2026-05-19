import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LABEL_PAPEL, COR_PAPEL } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'

interface ChatMensagemProps {
  nomeUsuario: string
  papelUsuario?: PapelUsuario
  conteudo: string
  createdAt: string
  isProprioUsuario: boolean
}

function iniciais(nome: string): string {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function ChatMensagem({
  nomeUsuario,
  papelUsuario,
  conteudo,
  createdAt,
  isProprioUsuario,
}: ChatMensagemProps) {
  const cor = papelUsuario ? COR_PAPEL[papelUsuario] : '#64748B'

  return (
    <div className={`flex gap-2 ${isProprioUsuario ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="w-7 h-7 shrink-0 mt-0.5">
        <AvatarFallback style={{ background: cor, color: 'white', fontSize: 10, fontWeight: 700 }}>
          {iniciais(nomeUsuario)}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[75%] ${isProprioUsuario ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!isProprioUsuario && (
          <div className="flex items-center gap-1.5 ml-0.5">
            <span className="text-[11px] font-semibold" style={{ color: cor }}>{nomeUsuario}</span>
            {papelUsuario && (
              <span className="text-[9px] text-muted-foreground">{LABEL_PAPEL[papelUsuario]}</span>
            )}
          </div>
        )}
        <div
          className="px-3 py-2 rounded-2xl text-[13px] leading-snug"
          style={{
            background: isProprioUsuario ? cor : 'var(--accent)',
            color: isProprioUsuario ? 'white' : 'var(--foreground)',
            borderRadius: isProprioUsuario ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          }}
        >
          {conteudo}
        </div>
        <span className="text-[10px] text-muted-foreground mx-1">{formatarHora(createdAt)}</span>
      </div>
    </div>
  )
}
