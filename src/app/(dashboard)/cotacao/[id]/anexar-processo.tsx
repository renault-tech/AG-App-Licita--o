'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Link2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { anexarCotacaoAProcesso, listarProcessosSemCotacao } from '@/lib/actions/cotacao-pncp'

interface Processo {
  id: string
  objeto: string
  numero_processo: string | null
}

export function AnexarProcesso({ cotacaoId }: { cotacaoId: string }) {
  const [processos, setProcessos] = useState<Processo[]>([])
  const [selecionado, setSelecionado] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    listarProcessosSemCotacao().then((res) => {
      if (res.success && res.data) setProcessos(res.data)
    })
  }, [])

  async function handleAnexar() {
    if (!selecionado) { toast.error('Selecione um processo.'); return }
    setSalvando(true)
    const res = await anexarCotacaoAProcesso(cotacaoId, selecionado)
    setSalvando(false)
    if (res.success) {
      toast.success('Cotacao anexada ao processo.')
      setProcessos((prev) => prev.filter((p) => p.id !== selecionado))
      setSelecionado('')
    } else {
      toast.error(res.error ?? 'Erro ao anexar.')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={selecionado} onValueChange={(v) => setSelecionado(v ?? '')}>
        <SelectTrigger className="h-9 text-sm min-w-[260px]">
          <SelectValue placeholder="Anexar a um processo..." />
        </SelectTrigger>
        <SelectContent>
          {processos.length === 0 ? (
            <SelectItem value="__none" disabled>Nenhum processo disponivel</SelectItem>
          ) : (
            processos.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.numero_processo ? `${p.numero_processo} · ` : ''}{p.objeto.slice(0, 50)}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button onClick={handleAnexar} disabled={salvando || !selecionado} size="sm" className="gap-1.5 h-9">
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        Anexar
      </Button>
    </div>
  )
}
