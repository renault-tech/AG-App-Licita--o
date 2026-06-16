'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Globe, Loader2, Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { adicionarPrecoWeb } from '@/lib/actions/cotacao-pncp'

export function AdicionarPrecoWeb({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [fonteNome, setFonteNome] = useState('')
  const [url, setUrl] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function handleSalvar() {
    const precoNum = parseFloat(preco)
    if (!fonteNome.trim() || !url.trim() || !precoNum) {
      toast.error('Preencha fonte, URL e preco.')
      return
    }
    setSalvando(true)
    const res = await adicionarPrecoWeb(itemId, {
      url: url.trim(),
      fonteNome: fonteNome.trim(),
      descricaoProduto: descricao.trim(),
      preco: precoNum,
    })
    setSalvando(false)
    if (res.success) {
      toast.success('Preco web registrado.')
      setFonteNome(''); setUrl(''); setDescricao(''); setPreco('')
      setAberto(false)
      router.refresh()
    } else {
      toast.error(res.error ?? 'Erro ao registrar preco web.')
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
      >
        <Plus className="w-3.5 h-3.5" /> Adicionar preco web (Art. 23, III)
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-800 inline-flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" /> Novo preco de fonte web
        </span>
        <button type="button" onClick={() => setAberto(false)} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Input value={fonteNome} onChange={(e) => setFonteNome(e.target.value)} placeholder="Nome da fonte (ex: Mercado Livre)" className="h-8 text-sm" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL completa (https://...)" className="h-8 text-sm" />
        <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descricao do produto" className="h-8 text-sm md:col-span-1" />
        <Input value={preco} onChange={(e) => setPreco(e.target.value)} type="number" step="0.01" min="0" placeholder="Preco (R$)" className="h-8 text-sm font-mono" />
      </div>
      <p className="text-[10px] text-gray-500">
        A URL e validada por acesso real e a data/hora de acesso e registrada automaticamente (requisito legal).
      </p>
      <div className="flex justify-end">
        <Button onClick={handleSalvar} disabled={salvando} size="sm" className="h-8 gap-1.5">
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Registrar
        </Button>
      </div>
    </div>
  )
}
