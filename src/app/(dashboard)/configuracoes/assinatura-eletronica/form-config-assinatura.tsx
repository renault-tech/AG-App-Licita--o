'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Check, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { salvarConfigAssinatura } from '@/lib/actions/assinaturas'

const PROVEDORES = [
  {
    id: 'interno',
    nome: 'Assinatura Interna',
    descricao: 'Hash SHA-256 com timestamp e identidade do usuario. Registro interno sem validade ICP-Brasil.',
    badge: 'Disponivel',
    badgeClasses: 'bg-green-100 text-green-700',
    disponivel: true,
  },
  {
    id: 'clicksign',
    nome: 'Clicksign',
    descricao: 'Assinatura eletronica com validade juridica. Requer contrato com Clicksign e token de API.',
    badge: 'Em breve',
    badgeClasses: 'bg-gray-100 text-gray-500',
    disponivel: false,
  },
  {
    id: 'zapsign',
    nome: 'ZapSign',
    descricao: 'Assinatura eletronica simples e acessivel. Requer conta ZapSign e token de API.',
    badge: 'Em breve',
    badgeClasses: 'bg-gray-100 text-gray-500',
    disponivel: false,
  },
  {
    id: 'govbr',
    nome: 'Gov.br (ICP-Brasil)',
    descricao: 'Assinatura digital com certificado ICP-Brasil via plataforma Gov.br. Maxima validade juridica.',
    badge: 'Em breve',
    badgeClasses: 'bg-gray-100 text-gray-500',
    disponivel: false,
  },
  {
    id: 'docusign',
    nome: 'DocuSign',
    descricao: 'Plataforma global de assinatura eletronica. Requer conta DocuSign Enterprise.',
    badge: 'Em breve',
    badgeClasses: 'bg-gray-100 text-gray-500',
    disponivel: false,
  },
]

interface Props {
  provedorAtual: string
}

export default function FormConfigAssinatura({ provedorAtual }: Props) {
  const [selecionado, setSelecionado] = useState(provedorAtual)
  const [salvando, setSalvando] = useState(false)
  const alterou = selecionado !== provedorAtual

  async function handleSalvar() {
    setSalvando(true)
    const res = await salvarConfigAssinatura(selecionado)
    setSalvando(false)
    if (!res.success) {
      toast.error(res.error ?? 'Erro ao salvar.')
      return
    }
    toast.success('Provedor de assinatura atualizado.')
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
        {PROVEDORES.map(op => {
          const ativo = selecionado === op.id
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => op.disponivel && setSelecionado(op.id)}
              disabled={!op.disponivel}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                !op.disponivel
                  ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  : ativo
                  ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                !op.disponivel
                  ? 'border-gray-200'
                  : ativo
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}>
                {ativo && op.disponivel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{op.nome}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${op.badgeClasses}`}>
                    {op.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{op.descricao}</p>
              </div>
              {ativo && op.disponivel && (
                <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
            </button>
          )
        })}
      </div>

      {alterou && (
        <div className="flex justify-end pt-1">
          <Button
            onClick={handleSalvar}
            disabled={salvando}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm"
          >
            {salvando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : <><Save className="w-4 h-4" /> Salvar preferencia</>}
          </Button>
        </div>
      )}
    </div>
  )
}