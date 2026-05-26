'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Check, Save, UsbIcon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { salvarConfigAssinatura } from '@/lib/actions/assinaturas'
import type { ZapSignAuthMode } from '@/lib/assinatura/types'

const PROVEDORES = [
  {
    id: 'interno',
    nome: 'Assinatura Interna',
    descricao: 'Registro de autoria e timestamp via hash SHA-256. Adequado para uso interno sem necessidade de validade ICP-Brasil.',
    badge: 'Disponivel',
    badgeClasses: 'bg-green-100 text-green-700',
    disponivel: true,
  },
  {
    id: 'zapsign',
    nome: 'ZapSign',
    descricao: 'Assinatura eletronica com validade juridica. Requer conta ZapSign e token de API configurado.',
    badge: 'Disponivel',
    badgeClasses: 'bg-green-100 text-green-700',
    disponivel: true,
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
    id: 'clicksign',
    nome: 'Clicksign',
    descricao: 'Assinatura eletronica com validade juridica. Requer contrato com Clicksign e token de API.',
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

const MODOS_ZAPSIGN: Array<{
  id: ZapSignAuthMode
  titulo: string
  descricao: string
  icone: React.ReactNode
}> = [
  {
    id: 'icpBrasil',
    titulo: 'Certificado digital (token ou arquivo)',
    descricao: 'Para quem possui pendrive com token A3 ou arquivo .pfx (A1) com certificado ICP-Brasil.',
    icone: <UsbIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
  },
  {
    id: 'assinaturaTela',
    titulo: 'Assinatura na tela',
    descricao: 'O signatario desenha ou clica para assinar diretamente no dispositivo, sem certificado fisico.',
    icone: <Monitor className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />,
  },
]

interface Props {
  provedorAtual: string
  authModeAtual: ZapSignAuthMode
}

export default function FormConfigAssinatura({ provedorAtual, authModeAtual }: Props) {
  const [selecionado, setSelecionado]   = useState(provedorAtual)
  const [authMode, setAuthMode]         = useState<ZapSignAuthMode>(authModeAtual)
  const [salvando, setSalvando]         = useState(false)

  const alterou =
    selecionado !== provedorAtual ||
    (selecionado === 'zapsign' && authMode !== authModeAtual)

  async function handleSalvar() {
    setSalvando(true)
    const res = await salvarConfigAssinatura(
      selecionado,
      selecionado === 'zapsign' ? authMode : undefined,
    )
    setSalvando(false)
    if (!res.success) {
      toast.error(res.error ?? 'Erro ao salvar.')
      return
    }
    toast.success('Configuracao de assinatura atualizada.')
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
        {PROVEDORES.map(op => {
          const ativo = selecionado === op.id
          return (
            <div key={op.id}>
              <button
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

              {/* Sub-opcao de modo apenas quando ZapSign esta selecionado */}
              {op.id === 'zapsign' && ativo && (
                <div className="mt-2 ml-7 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Como os signatarios vao assinar?</p>
                  {MODOS_ZAPSIGN.map(modo => {
                    const modoAtivo = authMode === modo.id
                    return (
                      <button
                        key={modo.id}
                        type="button"
                        onClick={() => setAuthMode(modo.id)}
                        className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
                          modoAtivo
                            ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {modo.icone}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-800">{modo.titulo}</span>
                            {modo.id === 'icpBrasil' && (
                              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700">
                                Padrao
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{modo.descricao}</p>
                        </div>
                        <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                          modoAtivo ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {modoAtivo && <div className="w-1 h-1 rounded-full bg-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
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
              : <><Save className="w-4 h-4" /> Salvar configuracao</>}
          </Button>
        </div>
      )}
    </div>
  )
}
