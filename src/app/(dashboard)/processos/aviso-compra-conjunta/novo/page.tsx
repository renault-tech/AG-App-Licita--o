'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Loader2, Send } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { criarAviso } from '@/lib/actions/avisos'
import { listarSecretarias } from '@/lib/actions/secretarias'
import { LABELS_MODALIDADE, LABELS_CATEGORIA } from '@/app/(dashboard)/processos/novo/types'
import type { CriarAvisoInput, ItemAvisoInput } from '@/lib/actions/avisos'
import type { ModalidadeLicitacao } from '@/types/database'
import type { CategoriaObjeto } from '@/app/(dashboard)/processos/novo/types'

type Secretaria = { id: string; nome: string; sigla: string | null }

const PRAZO_PADRAO = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 5)
  return d.toISOString().split('T')[0]
})()

const PRAZO_MIN = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
})()

export default function NovoAvisoPage() {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [secretarias, setSecretarias] = useState<Secretaria[]>([])
  const [secretariaOrigemId, setSecretariaOrigemId] = useState('')
  const [modalidade, setModalidade] = useState<ModalidadeLicitacao>('pregao_eletronico')
  const [categoria, setCategoria] = useState<CategoriaObjeto>('outros')
  const [prazo, setPrazo] = useState(PRAZO_PADRAO)
  const [destinatarias, setDestinatarias] = useState<Set<string>>(new Set())
  const [itens, setItens] = useState<Array<ItemAvisoInput & { _id: string }>>([
    { _id: crypto.randomUUID(), descricao: '', unidade: 'unidade', quantidade_origem: 1 },
  ])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    listarSecretarias().then(setSecretarias)
  }, [])

  const secretariasDestinatarias = secretarias.filter(s => s.id !== secretariaOrigemId)

  function toggleDestinataria(id: string) {
    setDestinatarias(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  function addItem() {
    setItens(prev => [...prev, { _id: crypto.randomUUID(), descricao: '', unidade: 'unidade', quantidade_origem: 1 }])
  }

  function removeItem(id: string) {
    setItens(prev => prev.filter(i => i._id !== id))
  }

  function updateItem(id: string, campo: keyof ItemAvisoInput, valor: string | number) {
    setItens(prev => prev.map(i => i._id === id ? { ...i, [campo]: valor } : i))
  }

  function validar(): string | null {
    if (!secretariaOrigemId) return 'Selecione a secretaria de origem.'
    if (!prazo || prazo < PRAZO_MIN) return 'Prazo deve ser ao menos amanha.'
    if (itens.length === 0) return 'Adicione ao menos um item.'
    for (const item of itens) {
      if (item.descricao.trim().length < 2) return 'Preencha a descricao de todos os itens.'
      if (!item.unidade.trim()) return 'Preencha a unidade de todos os itens.'
      if (item.quantidade_origem <= 0) return 'Quantidade deve ser maior que zero em todos os itens.'
    }
    if (destinatarias.size === 0) return 'Selecione ao menos uma secretaria destinataria.'
    return null
  }

  function handleEnviar() {
    const erro = validar()
    if (erro) { toast.error(erro); return }

    setEnviando(true)
    const prazoISO = new Date(`${prazo}T23:59:59`).toISOString()

    const payload: CriarAvisoInput = {
      secretaria_origem_id: secretariaOrigemId,
      modalidade,
      categoria_objeto: categoria,
      prazo_adesao: prazoISO,
      itens: itens.map(({ _id, ...rest }) => rest),
      secretarias_destinatarias: Array.from(destinatarias),
    }

    startTransition(async () => {
      const res = await criarAviso(payload)
      setEnviando(false)
      if (!res.success || !res.avisoId) {
        toast.error(res.error ?? 'Erro ao enviar aviso.')
        return
      }
      toast.success('Aviso enviado com sucesso!')
      router.push(`/processos/aviso-compra-conjunta/${res.avisoId}`)
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Novo Aviso de Compra Conjunta</h1>
          <p className="text-sm text-gray-500">
            Comunique a intencao de licitar e convide outras secretarias a participar.
          </p>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6 space-y-6">

          {/* Secretaria de Origem */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Secretaria de Origem <span className="text-red-500">*</span></Label>
            <Select value={secretariaOrigemId} onValueChange={v => setSecretariaOrigemId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Selecione a secretaria..." /></SelectTrigger>
              <SelectContent>
                {secretarias.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}{s.sigla ? ` (${s.sigla})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Modalidade */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Modalidade <span className="text-red-500">*</span></Label>
            <Select value={modalidade} onValueChange={v => setModalidade(v as ModalidadeLicitacao)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(LABELS_MODALIDADE) as [ModalidadeLicitacao, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Categoria do Objeto <span className="text-red-500">*</span></Label>
            <Select value={categoria} onValueChange={v => setCategoria(v as CategoriaObjeto)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(LABELS_CATEGORIA) as [CategoriaObjeto, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prazo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prazo para Adesao <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={prazo}
              min={PRAZO_MIN}
              onChange={e => setPrazo(e.target.value)}
              className="max-w-xs"
            />
            <p className="text-xs text-gray-500">Minimo: amanha. Sugestao: D+5.</p>
          </div>

          {/* Itens */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Itens que pretendo licitar <span className="text-red-500">*</span></Label>
            <div className="space-y-2">
              {itens.map(item => (
                <div key={item._id} className="flex gap-2 items-start">
                  <Input
                    placeholder="Descricao do item"
                    value={item.descricao}
                    onChange={e => updateItem(item._id, 'descricao', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Unidade"
                    value={item.unidade}
                    onChange={e => updateItem(item._id, 'unidade', e.target.value)}
                    className="w-28"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantidade_origem}
                    onChange={e => updateItem(item._id, 'quantidade_origem', Number(e.target.value))}
                    className="w-24"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item._id)}
                    disabled={itens.length === 1}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Adicionar item
            </Button>
          </div>

          {/* Secretarias destinatarias */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Secretarias Destinatarias <span className="text-red-500">*</span></Label>
            {!secretariaOrigemId && (
              <p className="text-xs text-gray-400">Selecione a secretaria de origem primeiro.</p>
            )}
            {secretariaOrigemId && secretariasDestinatarias.length === 0 && (
              <p className="text-xs text-gray-400">Nenhuma outra secretaria cadastrada.</p>
            )}
            <div className="space-y-1.5">
              {secretariasDestinatarias.map(s => (
                <label
                  key={s.id}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={destinatarias.has(s.id)}
                    onChange={() => toggleDestinataria(s.id)}
                    className="rounded border-gray-300 text-[#1A365D] focus:ring-[#1A365D]"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {s.nome}{s.sigla ? ` (${s.sigla})` : ''}
                  </span>
                </label>
              ))}
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleEnviar}
          disabled={enviando}
          className="gap-2 bg-[#1A365D] hover:bg-[#1A365D]/90 text-white"
        >
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Enviar Aviso
        </Button>
      </div>
    </div>
  )
}
