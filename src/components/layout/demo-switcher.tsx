'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trocarPapelDemo } from '@/lib/actions/usuario'
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
    papel: 'setor_licitacao',
    label: 'Setor de Licitacao',
    descricao: 'Servidor que conduz o processo licitatorio',
    pode: ['Criar processos', 'Preencher DFD, ETP, TR, Edital', 'Registrar publicacao'],
    naoPode: ['Emitir parecer juridico', 'Autorizar abertura do certame'],
    cor: 'bg-blue-600',
    corTexto: 'text-blue-700',
    corBg: 'bg-blue-50 border-blue-200',
  },
  {
    papel: 'procurador',
    label: 'Procurador',
    descricao: 'Advogado da procuradoria municipal',
    pode: ['Visualizar todos os documentos', 'Emitir parecer juridico', 'Aprovar ou devolver o processo'],
    naoPode: ['Editar documentos do processo', 'Autorizar abertura do certame'],
    cor: 'bg-purple-600',
    corTexto: 'text-purple-700',
    corBg: 'bg-purple-50 border-purple-200',
  },
  {
    papel: 'autoridade_competente',
    label: 'Autoridade Competente',
    descricao: 'Prefeito ou secretario com poder de autorizar',
    pode: ['Visualizar todos os documentos', 'Autorizar abertura do certame', 'Devolver para correcao'],
    naoPode: ['Editar documentos', 'Emitir parecer juridico'],
    cor: 'bg-green-600',
    corTexto: 'text-green-700',
    corBg: 'bg-green-50 border-green-200',
  },
  {
    papel: 'admin_organizacao',
    label: 'Administrador',
    descricao: 'Gestor da plataforma na organizacao',
    pode: ['Acesso total', 'Gerenciar usuarios e secretarias', 'Configurar organizacao'],
    naoPode: [],
    cor: 'bg-gray-700',
    corTexto: 'text-gray-700',
    corBg: 'bg-gray-50 border-gray-200',
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
      await trocarPapelDemo(papel)
      router.refresh()
    })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg">
      {/* Painel expandido */}
      {expandido && (
        <div className={`border-b ${infoAtual.corBg} px-4 py-3`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Papel atual: {infoAtual.label}</p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold text-green-700 mb-1">Pode fazer:</p>
              <ul className="space-y-0.5">
                {infoAtual.pode.map(item => (
                  <li key={item} className="flex items-center gap-1.5 text-gray-700">
                    <span className="text-green-500 font-bold">+</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            {infoAtual.naoPode.length > 0 && (
              <div>
                <p className="font-semibold text-red-600 mb-1">Nao pode:</p>
                <ul className="space-y-0.5">
                  {infoAtual.naoPode.map(item => (
                    <li key={item} className="flex items-center gap-1.5 text-gray-500">
                      <span className="text-red-400 font-bold">-</span> {item}
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
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide shrink-0">Demo</span>
        <div className="flex gap-1.5 flex-1">
          {PAPEIS.map(({ papel, label, cor }) => (
            <button
              key={papel}
              onClick={() => handleTrocar(papel)}
              disabled={isPending}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50 ${cor} ${
                papelAtual === papel
                  ? 'ring-2 ring-offset-1 ring-gray-400 opacity-100'
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
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors shrink-0"
          title={expandido ? 'Recolher' : 'Ver permissoes do papel'}
        >
          {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
