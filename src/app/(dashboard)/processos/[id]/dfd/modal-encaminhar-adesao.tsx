'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Share2, X, Calendar, Building2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { encaminharDFDParaAdesao, listarSecretariasParaConvite } from '@/lib/actions/dfd'
import { useRouter } from 'next/navigation'

type SecretariaOpcao = {
  id: string
  nome: string
  sigla: string | null
  ja_convidada: boolean
}

interface Props {
  dfdId: string
  processoId: string
  onClose: () => void
}

export default function ModalEncaminharAdesao({ dfdId, processoId, onClose }: Props) {
  const router = useRouter()
  const [secretarias, setSecretarias] = useState<SecretariaOpcao[]>([])
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [prazo, setPrazo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  // Data minima = amanha
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  const prazoMin = amanha.toISOString().split('T')[0]

  useEffect(() => {
    listarSecretariasParaConvite(dfdId).then(data => {
      setSecretarias(data)
      setCarregando(false)
    })
  }, [dfdId])

  function toggleSecretaria(id: string) {
    setSelecionadas(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) { novo.delete(id) } else { novo.add(id) }
      return novo
    })
  }

  function selecionarTodas() {
    setSelecionadas(new Set(secretarias.filter(s => !s.ja_convidada).map(s => s.id)))
  }

  function limparSelecao() {
    setSelecionadas(new Set())
  }

  async function handleEnviar() {
    if (!selecionadas.size) {
      toast.warning('Selecione ao menos uma secretaria.')
      return
    }
    if (!prazo) {
      toast.warning('Defina o prazo para resposta.')
      return
    }

    setEnviando(true)
    // Converte data local para ISO com horario de fim do dia
    const prazoISO = new Date(`${prazo}T23:59:59`).toISOString()
    const res = await encaminharDFDParaAdesao(dfdId, Array.from(selecionadas), prazoISO)

    if (!res.success) {
      toast.error(res.error ?? 'Erro ao encaminhar.')
      setEnviando(false)
      return
    }

    toast.success('DFD encaminhado para adesao das secretarias.')
    onClose()
    router.refresh()
  }

  const disponíveis = secretarias.filter(s => !s.ja_convidada)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Encaminhar para adesao</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">

          {/* Prazo */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Prazo para resposta das secretarias
            </Label>
            <Input
              type="date"
              value={prazo}
              min={prazoMin}
              onChange={e => setPrazo(e.target.value)}
              className="h-9 text-sm"
            />
            <p className="text-xs text-gray-400">
              Apos o prazo, o botao de consolidacao sera ativado automaticamente.
            </p>
          </div>

          {/* Selecao de secretarias */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                Secretarias a convidar
              </Label>
              {disponíveis.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={selecionarTodas}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Selecionar todas
                  </button>
                  {selecionadas.size > 0 && (
                    <button
                      onClick={limparSelecao}
                      className="text-xs text-gray-400 hover:underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              )}
            </div>

            {carregando ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : disponíveis.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Todas as secretarias ja foram convidadas ou nao ha outras cadastradas.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {disponíveis.map(s => {
                  const marcada = selecionadas.has(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSecretaria(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${
                        marcada
                          ? 'border-blue-300 bg-blue-50 text-blue-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        marcada ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {marcada && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-sm flex-1">{s.nome}</span>
                      {s.sigla && (
                        <span className="text-xs font-mono text-gray-400">{s.sigla}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {secretarias.filter(s => s.ja_convidada).length > 0 && (
              <p className="text-xs text-gray-400">
                {secretarias.filter(s => s.ja_convidada).length} secretaria(s) ja convidada(s) nao aparecem na lista.
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <Button variant="outline" size="sm" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleEnviar}
            disabled={enviando || !selecionadas.size || !prazo}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5"
          >
            {enviando
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
              : <><Share2 className="w-3.5 h-3.5" /> Encaminhar ({selecionadas.size})</>}
          </Button>
        </div>
      </div>
    </div>
  )
}