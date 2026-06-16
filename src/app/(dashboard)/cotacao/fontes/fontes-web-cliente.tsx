'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Globe } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  adicionarFonteWeb,
  alternarFonteWeb,
  removerFonteWeb,
} from '@/lib/actions/cotacao-pncp'

interface Fonte {
  id: string
  nome: string
  dominio: string
  ativo: boolean
}

export function FontesWebCliente({ inicial }: { inicial: Fonte[] }) {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [dominio, setDominio] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function handleAdicionar() {
    if (!nome.trim() || !dominio.trim()) {
      toast.error('Informe nome e dominio.')
      return
    }
    setSalvando(true)
    const res = await adicionarFonteWeb(nome, dominio)
    setSalvando(false)
    if (res.success) {
      toast.success('Fonte adicionada.')
      setNome('')
      setDominio('')
      router.refresh()
    } else {
      toast.error(res.error ?? 'Erro ao adicionar.')
    }
  }

  async function handleAlternar(id: string, ativo: boolean) {
    const res = await alternarFonteWeb(id, ativo)
    if (res.success) router.refresh()
    else toast.error(res.error ?? 'Erro.')
  }

  async function handleRemover(id: string) {
    const res = await removerFonteWeb(id)
    if (res.success) {
      toast.success('Fonte removida.')
      router.refresh()
    } else {
      toast.error(res.error ?? 'Erro.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome da fonte</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Mercado Livre" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dominio ou URL</Label>
            <Input value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="Ex: mercadolivre.com.br" className="h-9 text-sm font-mono" />
          </div>
          <Button onClick={handleAdicionar} disabled={salvando} className="gap-1.5 h-9">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </Button>
        </div>
      </div>

      {inicial.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Nenhuma fonte cadastrada. Sem fontes confiaveis, qualquer URL e aceita ao registrar preco web.
        </p>
      ) : (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          {inicial.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Globe className={`w-4 h-4 shrink-0 ${f.ativo ? 'text-blue-500' : 'text-gray-300'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.nome}</p>
                  <p className="text-xs text-gray-400 font-mono truncate">{f.dominio}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAlternar(f.id, !f.ativo)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    f.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {f.ativo ? 'Ativa' : 'Inativa'}
                </button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => handleRemover(f.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
