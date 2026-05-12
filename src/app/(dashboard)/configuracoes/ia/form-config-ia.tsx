'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Check, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { salvarConfigIA } from '@/lib/actions/organizacao'

const OPCOES = [
  {
    id: 'gemini',
    nome: 'Google Gemini Flash',
    descricao: 'Gratuito. 15 req/min, 1 milhao de tokens/dia.',
    badge: 'Gratuito',
    badgeClasses: 'bg-green-100 text-green-700',
    configurado: false,
  },
  {
    id: 'groq',
    nome: 'Groq (LLaMA 3.3 70B)',
    descricao: 'Gratuito. 14.400 requisicoes por dia, alta velocidade.',
    badge: 'Gratuito',
    badgeClasses: 'bg-green-100 text-green-700',
    configurado: false,
  },
  {
    id: 'anthropic',
    nome: 'Anthropic Claude',
    descricao: 'Pago. Maxima qualidade para documentos complexos.',
    badge: 'Pago',
    badgeClasses: 'bg-amber-100 text-amber-700',
    configurado: false,
  },
  {
    id: 'openrouter',
    nome: 'OpenRouter',
    descricao: 'Creditos gratuitos iniciais. Acesso a dezenas de modelos.',
    badge: 'Creditos gratuitos',
    badgeClasses: 'bg-blue-100 text-blue-700',
    configurado: false,
  },
]

interface Props {
  provedorAtual: string
  chavesConfiguradas: Record<string, boolean>
}

export default function FormConfigIA({ provedorAtual, chavesConfiguradas }: Props) {
  const [selecionado, setSelecionado] = useState(provedorAtual)
  const [salvando, setSalvando] = useState(false)
  const alterou = selecionado !== provedorAtual

  async function handleSalvar() {
    setSalvando(true)
    const res = await salvarConfigIA(selecionado)
    setSalvando(false)
    if (!res.success) {
      toast.error(res.error ?? 'Erro ao salvar.')
      return
    }
    toast.success('Provedor de IA atualizado com sucesso.')
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
        {OPCOES.map(op => {
          const ativo = selecionado === op.id
          const configurado = chavesConfiguradas[op.id] ?? false
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => setSelecionado(op.id)}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                ativo
                  ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                ativo ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
              }`}>
                {ativo && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{op.nome}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${op.badgeClasses}`}>
                    {op.badge}
                  </span>
                  {configurado ? (
                    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Chave configurada
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full">
                      Sem chave
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{op.descricao}</p>
              </div>
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