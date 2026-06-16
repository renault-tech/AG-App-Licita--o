'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Upload, ClipboardPaste, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { importarItensLista, type ItemImportadoComMatch } from '@/lib/actions/cotacao-import'

const FORMATOS = '.xlsx,.xls,.csv,.docx,.pdf,.txt'

export function ImportarLista({ onImportar }: { onImportar: (itens: ItemImportadoComMatch[]) => void }) {
  const [texto, setTexto] = useState('')
  const [importando, setImportando] = useState(false)
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const arquivoRef = useRef<File | null>(null)

  async function enviar(fd: FormData) {
    setImportando(true)
    const res = await importarItensLista(fd)
    setImportando(false)
    if (!res.success || !res.data) {
      toast.error(res.error ?? 'Falha ao importar.')
      return
    }
    if (res.data.itens.length === 0) {
      toast.warning('Nenhum item identificado.')
      return
    }
    const semMatch = res.data.itens.filter((i) => i.semMatch).length
    toast.success(
      `${res.data.itens.length} itens importados.` +
        (semMatch > 0 ? ` ${semMatch} sem codigo sugerido, revise.` : ''),
    )
    onImportar(res.data.itens)
  }

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    arquivoRef.current = f
    setNomeArquivo(f?.name ?? null)
  }

  async function importarArquivo() {
    if (!arquivoRef.current) { toast.error('Selecione um arquivo.'); return }
    const fd = new FormData()
    fd.append('arquivo', arquivoRef.current)
    await enviar(fd)
  }

  async function importarTexto() {
    if (texto.trim().length < 10) { toast.error('Cole o texto da lista de itens.'); return }
    const fd = new FormData()
    fd.append('texto', texto)
    await enviar(fd)
  }

  return (
    <div className="space-y-5">
      {/* Upload de arquivo */}
      <div className="rounded-xl border border-dashed border-gray-300 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Enviar arquivo</span>
          <span className="text-xs text-gray-400">Word, PDF, planilha (.xlsx/.csv) ou texto</span>
        </div>
        <input ref={inputRef} type="file" accept={FORMATOS} onChange={handleArquivo} className="hidden" />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="gap-1.5">
            <FileText className="w-4 h-4" /> Escolher arquivo
          </Button>
          {nomeArquivo && <span className="text-xs text-gray-500 truncate max-w-[240px]">{nomeArquivo}</span>}
          <Button size="sm" onClick={importarArquivo} disabled={importando || !nomeArquivo} className="gap-1.5">
            {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar arquivo
          </Button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Apenas os itens (descricao, unidade, quantidade) sao usados. Marca e valores da lista sao ignorados.
        </p>
      </div>

      {/* Colar texto */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardPaste className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Colar lista</span>
        </div>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={8}
          placeholder={'Cole aqui a lista de itens. Ex:\n1  ABAIXADOR DE LINGUA EM MADEIRA - PACOTE COM 100 UNIDADES  PCT  300\n2  ACIDO FOSFORICO A 37% (ATAQUE ACIDO) 2,5 ML  UND  1200'}
          className="text-sm font-mono"
        />
        <div className="flex justify-end mt-3">
          <Button size="sm" onClick={importarTexto} disabled={importando} className="gap-1.5">
            {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardPaste className="w-4 h-4" />}
            Importar texto
          </Button>
        </div>
      </div>
    </div>
  )
}
