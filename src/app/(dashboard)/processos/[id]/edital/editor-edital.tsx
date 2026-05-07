'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { atualizarEdital, revisarEditalComIA } from '@/lib/actions/edital'
import BotaoTramitacao from '@/components/documentos/botao-tramitacao'
import { ModalidadeLicitacao, PapelUsuario } from '@/types/database'
import Link from 'next/link'

type Secao = { id: string; titulo: string; texto: string }

export default function EditorEdital({ edital, processoId, papelUsuario }: { edital: any; processoId: string; papelUsuario: PapelUsuario }) {
  const modalidade = (edital.processos_licitatorios?.modalidade || 'dispensa') as ModalidadeLicitacao
  const [secoes, setSecoes] = useState<Secao[]>(
    Array.isArray(edital.conteudo) ? edital.conteudo : []
  )
  const [salvando, setSalvando]         = useState(false)
  const [iaLoadingId, setIaLoadingId]   = useState<string | null>(null)
  const [iaEditados, setIaEditados]     = useState<Set<string>>(new Set())

  function atualiza(id: string, campo: 'titulo' | 'texto', valor: string) {
    setSecoes(prev => prev.map(s => s.id === id ? { ...s, [campo]: valor } : s))
  }

  async function handleSalvar() {
    setSalvando(true)
    const res = await atualizarEdital(edital.id, secoes)
    res.success ? toast.success('Edital salvo.') : toast.error('Erro ao salvar Edital.')
    setSalvando(false)
  }

  async function handleRevisarIA(id: string) {
    const secao = secoes.find(s => s.id === id)
    if (!secao || secao.texto.length < 5) { toast.warning('Texto muito curto.'); return }
    setIaLoadingId(id)
    const res = await revisarEditalComIA(secao.texto, modalidade)
    if (res.success) {
      atualiza(id, 'texto', res.texto)
      setIaEditados(prev => new Set(prev).add(id))
      toast.success('Clausula revisada pela IA.')
    } else {
      toast.error(res.error)
    }
    setIaLoadingId(null)
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="text-base font-semibold text-gray-800">
          Clausulas e Secoes do Edital
        </CardTitle>
        <p className="text-xs text-gray-500 mt-0.5">
          {secoes.length} secao(oes) — clique em "Revisao Juridica" para cada clausula.
        </p>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
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
                  disabled={iaLoadingId === secao.id}
                >
                  {iaLoadingId === secao.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  Revisao Juridica
                </Button>
              </div>

              <Textarea
                rows={5}
                value={secao.texto}
                onChange={(e) => atualiza(secao.id, 'texto', e.target.value)}
                className="resize-y text-sm text-gray-800 leading-relaxed"
                placeholder="Conteudo da clausula..."
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
          <Button onClick={handleSalvar} disabled={salvando} className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm">
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
