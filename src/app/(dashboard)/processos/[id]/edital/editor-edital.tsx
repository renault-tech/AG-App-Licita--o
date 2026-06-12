'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { atualizarEdital, revisarEditalComIA, gerarEditalIA } from '@/lib/actions/edital'
import { useAutoSave } from '@/hooks/use-auto-save'
import { AutoSaveIndicator } from '@/components/licita/auto-save-indicator'
import BotaoTramitacao from '@/components/documentos/botao-tramitacao'
import { ModalidadeLicitacao, PapelUsuario } from '@/types/database'
import Link from 'next/link'

type Secao = { id: string; titulo: string; texto: string }

export default function EditorEdital({ edital, processoId, papelUsuario, podeEditar = true }: { edital: any; processoId: string; papelUsuario: PapelUsuario; podeEditar?: boolean }) {
  const modalidade = (edital.processos_licitatorios?.modalidade || 'dispensa') as ModalidadeLicitacao
  const [secoes, setSecoes] = useState<Secao[]>(
    Array.isArray(edital.conteudo) ? edital.conteudo : []
  )
  const [salvando, setSalvando]         = useState(false)
  const [iaLoadingId, setIaLoadingId]   = useState<string | null>(null)
  const [iaEditados, setIaEditados]     = useState<Set<string>>(new Set())
  const [gerandoTudo, setGerandoTudo]   = useState(false)

  const autoSalvarEdital = useCallback(async () => {
    if (!podeEditar || edital.status === 'assinado') return
    await atualizarEdital(edital.id, secoes)
  }, [edital.id, edital.status, secoes, podeEditar])

  const { status: autoSaveStatus, lastSavedAt, retrySave } = useAutoSave(
    [secoes],
    autoSalvarEdital,
  )

  function atualiza(id: string, campo: 'titulo' | 'texto', valor: string) {
    setSecoes(prev => prev.map(s => s.id === id ? { ...s, [campo]: valor } : s))
  }

  async function handleSalvar() {
    setSalvando(true)
    const res = await atualizarEdital(edital.id, secoes)
    res.success ? toast.success('Edital salvo.') : toast.error('Erro ao salvar Edital.')
    setSalvando(false)
  }

  async function handleGerarTudoIA() {
    setGerandoTudo(true)
    const res = await gerarEditalIA(processoId)
    if (res.success) {
      setSecoes(res.secoes)
      setIaEditados(new Set(res.secoes.map(s => s.id)))
      toast.success(`Minuta gerada com ${res.secoes.length} cláusulas. Revise antes de tramitar.`)
    } else {
      toast.error(res.error)
    }
    setGerandoTudo(false)
  }

  async function handleRevisarIA(id: string) {
    const secao = secoes.find(s => s.id === id)
    if (!secao || secao.texto.length < 5) { toast.warning('Texto muito curto.'); return }
    setIaLoadingId(id)
    const res = await revisarEditalComIA(secao.texto, modalidade)
    if (res.success) {
      atualiza(id, 'texto', res.texto)
      setIaEditados(prev => new Set(prev).add(id))
      toast.success('Cláusula revisada pela IA.')
    } else {
      toast.error(res.error)
    }
    setIaLoadingId(null)
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-4 flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold text-gray-800">
            Cláusulas e Seções do Edital
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            {secoes.length} seção(ões). Use "Revisão Jurídica" por cláusula ou gere a minuta completa a partir do TR.
          </p>
        </div>
        {podeEditar && edital.status !== 'assinado' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGerarTudoIA}
            disabled={gerandoTudo}
            className="h-8 text-xs gap-1.5 shrink-0 text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100"
          >
            {gerandoTudo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Gerar minuta com IA
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {!podeEditar && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Visualização somente leitura. Seu perfil não tem permissão de editar este documento.
          </p>
        )}
        {secoes.map((secao, index) => {
          const foiIA = iaEditados.has(secao.id)
          return (
            <div key={secao.id} className={`p-4 border rounded-xl space-y-3 ${foiIA ? 'border-purple-200 bg-purple-50/20' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-semibold shrink-0">
                    {index + 1}
                  </span>
                  <Input
                    value={secao.titulo}
                    onChange={(e) => atualiza(secao.id, 'titulo', e.target.value)}
                    className="h-8 text-sm font-semibold text-gray-700 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-gray-300 rounded-none"
                    placeholder="Titulo da secao"
                  />
                  {foiIA && (
                    <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 whitespace-nowrap shrink-0">
                      Revisado por IA
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 gap-1 shrink-0"
                  onClick={() => handleRevisarIA(secao.id)}
                  disabled={iaLoadingId === secao.id || !podeEditar}
                >
                  {iaLoadingId === secao.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  Revisão Jurídica
                </Button>
              </div>

              <RichTextEditor
                value={secao.texto}
                onChange={(val) => atualiza(secao.id, 'texto', val)}
                readOnly={!podeEditar}
                placeholder="Conteúdo da cláusula..."
                minHeight={140}
              />
            </div>
          )
        })}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/processos/${processoId}/riscos`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              <ChevronLeft className="w-4 h-4" /> Riscos
            </Button>
          </Link>
          <BotaoTramitacao
            tabela="edital"
            documentoId={edital.id}
            processoId={processoId}
            statusAtual={edital.status}
            papelUsuario={papelUsuario}
          />
        </div>
        <div className="flex items-center gap-2">
          {podeEditar && edital.status !== 'assinado' && (
            <AutoSaveIndicator
              status={autoSaveStatus}
              lastSavedAt={lastSavedAt}
              onRetry={retrySave}
            />
          )}
          <Button onClick={handleSalvar} disabled={salvando || !podeEditar} className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm">
            {salvando ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar Edital</>}
          </Button>
          <Link href={`/processos/${processoId}/parecer`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              Parecer <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
