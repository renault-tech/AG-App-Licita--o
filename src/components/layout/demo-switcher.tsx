'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trocarPerfilAtivo } from '@/lib/perfil-session'
import type { PapelUsuario } from '@/types/database'
import { ChevronUp, ChevronDown } from 'lucide-react'

const PAPEIS: {
  papel: PapelUsuario
  label: string
  descricao: string
  pode: string[]
  naoPode: string[]
  cor: string
  corTexto: string
  corBg: string
}[] = [
  {
    papel: 'requisitante',
    label: 'Requisitante',
    descricao: 'Servidor do setor que originou a demanda',
    pode: ['Criar DFD', 'Preencher ETP e TR do seu setor', 'Acompanhar status do processo'],
    naoPode: ['Acessar processos de outros setores', 'Emitir parecer', 'Autorizar licitacao'],
    cor: 'bg-[#0D47A1]',
    corTexto: 'text-[#0D47A1]',
    corBg: 'bg-[#0D47A1]/5 border-[#0D47A1]/20',
  },
  {
    papel: 'setor_compras',
    label: 'Setor de Compras',
    descricao: 'Primeiro revisor, responsavel pela cotacao',
    pode: ['Revisar DFD e ETP', 'Registrar cotacao e pesquisa de precos', 'Devolver ao requisitante ou encaminhar'],
    naoPode: ['Gerar edital', 'Emitir parecer juridico', 'Autorizar abertura'],
    cor: 'bg-[#1565C0]',
    corTexto: 'text-[#1565C0]',
    corBg: 'bg-[#1565C0]/5 border-[#1565C0]/20',
  },
  {
    papel: 'setor_licitacao',
    label: 'Licitacoes',
    descricao: 'Segundo revisor, conduz o processo licitatorio',
    pode: ['Gerar Edital e Oficio de Abertura', 'Encaminhar para procuradoria', 'Gerir tramitacao'],
    naoPode: ['Emitir parecer juridico', 'Autorizar abertura do certame'],
    cor: 'bg-[#1A365D]',
    corTexto: 'text-[#1A365D]',
    corBg: 'bg-[#1A365D]/5 border-[#1A365D]/20',
  },
  {
    papel: 'procurador',
    label: 'Procurador',
    descricao: 'Advogado da procuradoria municipal',
    pode: ['Visualizar todos os documentos', 'Emitir parecer juridico', 'Aprovar ou devolver o processo'],
    naoPode: ['Editar documentos do processo', 'Autorizar abertura do certame'],
    cor: 'bg-[#5B3E8A]',
    corTexto: 'text-[#5B3E8A]',
    corBg: 'bg-[#5B3E8A]/5 border-[#5B3E8A]/20',
  },
  {
    papel: 'gestor_publico',
    label: 'Gestor/Prefeito',
    descricao: 'Prefeito ou secretario com poder de autorizar',
    pode: ['Visualizar todos os documentos', 'Autorizar abertura do certame', 'Devolver para correcao'],
    naoPode: ['Editar documentos', 'Emitir parecer juridico'],
    cor: 'bg-[#1A6637]',
    corTexto: 'text-[#1A6637]',
    corBg: 'bg-[#1A6637]/5 border-[#1A6637]/20',
  },
  {
    papel: 'publicacao',
    label: 'Publicacao',
    descricao: 'Responsavel pela publicacao oficial do edital',
    pode: ['Publicar no PNCP e Diario Oficial', 'Marcar processo como publicado', 'Gerar notificacoes'],
    naoPode: ['Editar documentos', 'Emitir parecer', 'Autorizar'],
    cor: 'bg-[#006064]',
    corTexto: 'text-[#006064]',
    corBg: 'bg-[#006064]/5 border-[#006064]/20',
  },
  {
    papel: 'admin_organizacao',
    label: 'Admin Org',
    descricao: 'Gestor da plataforma na organizacao',
    pode: ['Acesso total', 'Gerenciar usuarios e secretarias', 'Configurar organizacao'],
    naoPode: [],
    cor: 'bg-[#43474E]',
    corTexto: 'text-[#43474E]',
    corBg: 'bg-[#43474E]/5 border-[#43474E]/20',
  },
  {
    papel: 'admin_plataforma',
    label: 'Admin Master',
    descricao: 'Administrador global da plataforma LicitaIA',
    pode: ['Acesso irrestrito', 'Gerenciar organizacoes', 'Modo Demo', 'Configurar IA e creditos'],
    naoPode: [],
    cor: 'bg-[#B71C1C]',
    corTexto: 'text-[#B71C1C]',
    corBg: 'bg-[#B71C1C]/5 border-[#B71C1C]/20',
  },
]

interface Props {
  papelAtual: PapelUsuario
}

export default function DemoSwitcher({ papelAtual }: Props) {
  const [isPending, startTransition] = useTransition()
  const [expandido, setExpandido] = useState(false)
  const router = useRouter()

  const infoAtual = PAPEIS.find(p => p.papel === papelAtual) ?? PAPEIS[0]

  function handleTrocar(papel: PapelUsuario) {
    if (papel === papelAtual || isPending) return
    startTransition(async () => {
      await trocarPerfilAtivo(papel)
      router.refresh()
    })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E3E2E6] bg-white" style={{ boxShadow: '0 -2px 8px rgba(26,54,93,0.06)' }}>
      {/* Painel expandido */}
      {expandido && (
        <div className={`border-b ${infoAtual.corBg} px-4 py-3`}>
          <p className="text-xs font-semibold text-[#74777F] uppercase tracking-wide mb-2">Papel atual: {infoAtual.label}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-[#1A6637] mb-1">Pode fazer:</p>
              <ul className="space-y-0.5">
                {infoAtual.pode.map(item => (
                  <li key={item} className="flex items-center gap-1.5 text-[#43474E]">
                    <span className="text-[#1A6637] font-bold">+</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            {infoAtual.naoPode.length > 0 && (
              <div>
                <p className="font-semibold text-[#BA1A1A] mb-1">Nao pode:</p>
                <ul className="space-y-0.5">
                  {infoAtual.naoPode.map(item => (
                    <li key={item} className="flex items-center gap-1.5 text-[#74777F]">
                      <span className="text-[#BA1A1A] font-bold">-</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra de botoes */}
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-xs font-bold text-[#74777F] uppercase tracking-wide shrink-0">Demo</span>
        <div className="flex gap-1.5 flex-1">
          {PAPEIS.map(({ papel, label, cor }) => (
            <button
              key={papel}
              onClick={() => handleTrocar(papel)}
              disabled={isPending}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 ${cor} ${
                papelAtual === papel
                  ? 'ring-2 ring-offset-1 ring-[#1A365D]/40 opacity-100'
                  : 'opacity-50 hover:opacity-80'
              }`}
            >
              {isPending && papel !== papelAtual ? label : label}
              {papelAtual === papel && ' (ativo)'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setExpandido(e => !e)}
          className="p-2 rounded-lg text-[#74777F] hover:bg-[#F4F3F7] transition-colors shrink-0"
          title={expandido ? 'Recolher' : 'Ver permissoes do papel'}
        >
          {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
