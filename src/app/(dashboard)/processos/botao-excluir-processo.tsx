'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { excluirProcesso } from '@/lib/actions/processo'

export default function BotaoExcluirProcesso({ processoId, objeto }: { processoId: string; objeto: string }) {
  const [aberto, setAberto] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleExcluir() {
    startTransition(async () => {
      const res = await excluirProcesso(processoId)
      if (!res.success) {
        toast.error(res.error ?? 'Erro ao excluir processo.')
        setAberto(false)
        return
      }
      toast.success('Processo excluido com sucesso.')
      setAberto(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); setAberto(true) }}
        className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
        title="Excluir processo"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setAberto(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">Excluir processo</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Tem certeza que deseja excluir o processo{' '}
                  <span className="font-medium text-gray-700">&ldquo;{objeto}&rdquo;</span>?
                  Esta acao nao pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAberto(false)}
                disabled={pending}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExcluir}
                disabled={pending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
