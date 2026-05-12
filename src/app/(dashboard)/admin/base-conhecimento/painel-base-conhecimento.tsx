'use client'

import { useState, useRef, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Upload, FileText, Loader2, Trash2, Bot,
  CheckCircle2, AlertCircle, Clock, HelpCircle, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  uploadDocumentoBase,
  analisarDocumentoBase,
  excluirDocumentoBase,
  type DocumentoBase,
} from '@/lib/actions/base-conhecimento'

const TIPOS_DOCUMENTO = [
  { value: 'dfd',        label: 'DFD - Formalizacao da Demanda' },
  { value: 'etp',        label: 'ETP - Estudo Tecnico Preliminar' },
  { value: 'tr',         label: 'Termo de Referencia' },
  { value: 'edital',     label: 'Edital de Licitacao' },
  { value: 'parecer',    label: 'Parecer Juridico' },
  { value: 'mapa_riscos', label: 'Mapa de Riscos' },
  { value: 'geral',      label: 'Geral (varios tipos)' },
]

const MODALIDADES = [
  { value: '', label: 'Todas as modalidades' },
  { value: 'pregao_eletronico',   label: 'Pregao Eletronico' },
  { value: 'pregao_presencial',   label: 'Pregao Presencial' },
  { value: 'concorrencia',        label: 'Concorrencia' },
  { value: 'dispensa',            label: 'Dispensa' },
  { value: 'inexigibilidade',     label: 'Inexigibilidade' },
  { value: 'dialogo_competitivo', label: 'Dialogo Competitivo' },
]

function StatusBadge({ status }: { status: DocumentoBase['status'] }) {
  const map = {
    pendente:   { label: 'Pendente',    cls: 'text-gray-600 bg-gray-100 border-gray-200',   icon: Clock },
    analisando: { label: 'Analisando',  cls: 'text-blue-700 bg-blue-50 border-blue-200',    icon: Loader2 },
    processado: { label: 'Processado',  cls: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle2 },
    erro:       { label: 'Erro',        cls: 'text-red-600 bg-red-50 border-red-200',       icon: AlertCircle },
  }
  const { label, cls, icon: Icon } = map[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      <Icon className={`w-3 h-3 ${status === 'analisando' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  )
}

interface Props {
  documentosIniciais: DocumentoBase[]
}

export default function PainelBaseConhecimento({ documentosIniciais }: Props) {
  const [documentos, setDocumentos] = useState<DocumentoBase[]>(documentosIniciais)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState('tr')
  const [modalidade, setModalidade] = useState('')
  const [dragging, setDragging] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [analisando, setAnalisando] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setArquivo(f)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setArquivo(f)
  }

  async function handleUpload() {
    if (!arquivo || !titulo.trim()) {
      toast.error('Informe o titulo e selecione um arquivo.')
      return
    }
    const fd = new FormData()
    fd.append('arquivo', arquivo)
    fd.append('titulo', titulo)
    fd.append('descricao', descricao)
    fd.append('tipo_documento', tipoDocumento)
    fd.append('modalidade', modalidade)

    startTransition(async () => {
      const res = await uploadDocumentoBase(fd)
      if (!res.success) {
        toast.error(res.error ?? 'Erro ao enviar.')
        return
      }
      toast.success('Documento enviado. Inicie a analise para extrair clausulas.')
      // Recarregar lista
      const { listarDocumentosBase } = await import('@/lib/actions/base-conhecimento')
      const lista = await listarDocumentosBase()
      if (lista.success && lista.dados) setDocumentos(lista.dados)
      // Limpar form
      setArquivo(null)
      setTitulo('')
      setDescricao('')
    })
  }

  async function handleAnalisar(id: string) {
    setAnalisando(id)
    const res = await analisarDocumentoBase(id)
    setAnalisando(null)
    if (!res.success) {
      toast.error(res.error ?? 'Falha na analise.')
    } else {
      toast.success(`Analise concluida: ${res.clausulas} clausula(s) extraida(s) para a base de conhecimento.`)
    }
    const { listarDocumentosBase } = await import('@/lib/actions/base-conhecimento')
    const lista = await listarDocumentosBase()
    if (lista.success && lista.dados) setDocumentos(lista.dados)
  }

  async function handleExcluir(id: string, titulo: string) {
    if (!confirm(`Excluir "${titulo}" da base de conhecimento?`)) return
    const res = await excluirDocumentoBase(id)
    if (!res.success) {
      toast.error(res.error ?? 'Erro ao excluir.')
      return
    }
    toast.success('Documento removido.')
    setDocumentos(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="space-y-6">

      {/* Formulario de upload */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">Enviar Novo Documento</h3>
          <div className="group relative">
            <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help" />
            <span className="pointer-events-none absolute left-5 top-0 z-50 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl leading-relaxed">
              Envie documentos reais de licitacao (DFD, ETP, TR, Edital etc.). A IA ira extrair clausulas e textos modelo que serao reutilizados automaticamente para reduzir o consumo de tokens em novas geracoes.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Titulo do documento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: TR Pregao Eletronico - Servicos de TI 2024"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de documento <span className="text-red-500">*</span></label>
            <select
              value={tipoDocumento}
              onChange={e => setTipoDocumento(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIPOS_DOCUMENTO.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Modalidade
              <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
            </label>
            <select
              value={modalidade}
              onChange={e => setModalidade(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MODALIDADES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Descricao <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Contexto sobre o documento: orgao, objeto, ano..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Zona de drop */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
          }`}
        >
          <Upload className="w-6 h-6 text-gray-400" />
          {arquivo ? (
            <p className="text-sm font-medium text-blue-700">{arquivo.name}</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">Arraste o arquivo ou clique para selecionar</p>
              <p className="text-xs text-gray-400">PDF, DOCX ou TXT, ate 20 MB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={isPending || !arquivo || !titulo.trim()}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm"
          >
            {isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Upload className="w-4 h-4" /> Enviar Documento</>}
          </Button>
        </div>
      </div>

      {/* Lista de documentos */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Documentos na Base ({documentos.length})
        </h3>
        {documentos.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
            <BookOpenIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum documento enviado ainda.</p>
            <p className="text-xs text-gray-300 mt-1">Envie documentos reais de licitacao para alimentar a base de conhecimento da IA.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documentos.map(doc => (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.titulo}</p>
                    <StatusBadge status={doc.status} />
                    <span className="text-xs text-gray-400 uppercase">{doc.formato}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500">{TIPOS_DOCUMENTO.find(t => t.value === doc.tipo_documento)?.label ?? doc.tipo_documento}</span>
                    {doc.clausulas_count > 0 && (
                      <span className="text-xs text-green-700">
                        {doc.clausulas_count} clausula(s) extraida(s)
                      </span>
                    )}
                    {doc.erro_mensagem && (
                      <span className="text-xs text-red-600 truncate max-w-xs">{doc.erro_mensagem}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(doc.status === 'pendente' || doc.status === 'erro') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAnalisar(doc.id)}
                      disabled={analisando === doc.id}
                      className="gap-1.5 h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      {analisando === doc.id
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Analisando...</>
                        : <><Bot className="w-3 h-3" /> Analisar com IA</>}
                    </Button>
                  )}
                  {doc.status === 'processado' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAnalisar(doc.id)}
                      disabled={analisando === doc.id}
                      className="gap-1.5 h-8 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      <RefreshCw className="w-3 h-3" /> Reanalisar
                    </Button>
                  )}
                  <button
                    onClick={() => handleExcluir(doc.id, doc.titulo)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Excluir documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Icone local para estado vazio
function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}