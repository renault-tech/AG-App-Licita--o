'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Globe, CheckCircle2, AlertCircle, Loader2,
  ExternalLink, Calendar, FileText, XCircle, PauseCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  registrarPublicacao,
  atualizarStatusPublicacao,
  type PublicacaoRow,
  type DadosPublicacao,
} from '@/lib/actions/publicacao'
import Link from 'next/link'

interface PainelPublicacaoProps {
  processoId: string
  publicacao: PublicacaoRow | null
  podePublicar: boolean
  autorizado: boolean
}

const STATUS_PUBLICACAO: Record<string, { label: string; cor: string; icon: React.ReactNode }> = {
  publicado:  { label: 'Publicado',  cor: 'text-green-700 bg-green-50 border-green-200', icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> },
  suspenso:   { label: 'Suspenso',   cor: 'text-amber-700 bg-amber-50 border-amber-200', icon: <PauseCircle className="w-4 h-4 text-amber-600" /> },
  cancelado:  { label: 'Cancelado',  cor: 'text-red-700 bg-red-50 border-red-200',       icon: <XCircle className="w-4 h-4 text-red-600" /> },
  encerrado:  { label: 'Encerrado',  cor: 'text-gray-700 bg-gray-50 border-gray-200',    icon: <CheckCircle2 className="w-4 h-4 text-gray-500" /> },
}

function formatarData(iso: string | null) {
  if (!iso) return null
  const [ano, mes, dia] = iso.split('T')[0].split('-')
  return `${dia}/${mes}/${ano}`
}

export default function PainelPublicacao({
  processoId,
  publicacao: publicacaoInicial,
  podePublicar,
  autorizado,
}: PainelPublicacaoProps) {
  const hoje = new Date().toISOString().split('T')[0]

  const [publicacao, setPublicacao] = useState(publicacaoInicial)
  const [loading, setLoading] = useState(false)
  const [modalPublicar, setModalPublicar] = useState(false)
  const [modalStatus, setModalStatus] = useState(false)
  const [novoStatus, setNovoStatus] = useState<'suspenso' | 'cancelado' | 'encerrado' | null>(null)
  const [motivoStatus, setMotivoStatus] = useState('')

  const [form, setForm] = useState<DadosPublicacao>({
    pncp_numero:    publicacaoInicial?.pncp_numero ?? '',
    pncp_url:       publicacaoInicial?.pncp_url ?? '',
    diario_oficial: publicacaoInicial?.diario_oficial ?? '',
    portal_proprio: publicacaoInicial?.portal_proprio ?? '',
    data_publicacao: publicacaoInicial?.data_publicacao ?? hoje,
    data_abertura:  publicacaoInicial?.data_abertura ?? '',
    observacoes:    publicacaoInicial?.observacoes ?? '',
  })

  function campo(field: keyof DadosPublicacao, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handlePublicar() {
    if (!form.data_publicacao) return
    setLoading(true)
    const res = await registrarPublicacao(processoId, form)
    if (res.success) {
      toast.success('Processo publicado com sucesso.')
      setPublicacao({
        id: '',
        processo_id: processoId,
        organizacao_id: '',
        publicado_por: '',
        created_at: new Date().toISOString(),
        status: 'publicado',
        ...form,
        pncp_numero: form.pncp_numero || null,
        pncp_url: form.pncp_url || null,
        diario_oficial: form.diario_oficial || null,
        portal_proprio: form.portal_proprio || null,
        data_abertura: form.data_abertura || null,
        observacoes: form.observacoes || null,
      })
      setModalPublicar(false)
    } else {
      toast.error(res.error ?? 'Erro ao publicar.')
    }
    setLoading(false)
  }

  async function handleAtualizarStatus() {
    if (!novoStatus) return
    setLoading(true)
    const res = await atualizarStatusPublicacao(processoId, novoStatus, motivoStatus.trim() || undefined)
    if (res.success) {
      toast.success(`Status atualizado para ${STATUS_PUBLICACAO[novoStatus]?.label}.`)
      setPublicacao(prev => prev ? { ...prev, status: novoStatus! } : prev)
      setModalStatus(false)
      setMotivoStatus('')
      setNovoStatus(null)
    } else {
      toast.error(res.error ?? 'Erro ao atualizar status.')
    }
    setLoading(false)
  }

  // Processo ainda nao autorizado
  if (!autorizado && !publicacao) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
          <AlertCircle className="w-8 h-8 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">Aguardando autorização</p>
            <p className="text-xs text-gray-500 mt-1">
              O processo precisa ser autorizado pela autoridade competente antes da publicação.
            </p>
          </div>
          <Link href={`/processos/${processoId}/autorizacao`}>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              Ver autorização
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  // Ja publicado: exibe os dados registrados
  if (publicacao) {
    const cfg = STATUS_PUBLICACAO[publicacao.status] ?? STATUS_PUBLICACAO['publicado']
    return (
      <div className="space-y-4">
        {/* Banner de status */}
        <div className={`flex items-center gap-3 p-4 border rounded-xl ${cfg.cor}`}>
          {cfg.icon}
          <div>
            <p className="text-sm font-semibold">Processo {cfg.label}</p>
            <p className="text-xs mt-0.5">
              Publicado em {formatarData(publicacao.data_publicacao)}.
              {publicacao.data_abertura && ` Abertura prevista: ${formatarData(publicacao.data_abertura)}.`}
            </p>
          </div>
        </div>

        {/* Dados de publicacao */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              Dados da Publicação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {[
              { label: 'Número PNCP',      value: publicacao.pncp_numero,    href: publicacao.pncp_url },
              { label: 'Diário Oficial',   value: publicacao.diario_oficial, href: null },
              { label: 'Portal da Prefeitura', value: publicacao.portal_proprio, href: publicacao.portal_proprio },
            ].map(item => item.value && (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                {item.href ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-700 hover:underline flex items-center gap-1">
                    {item.value} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs text-gray-700">{item.value}</span>
                )}
              </div>
            ))}

            {publicacao.observacoes && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Observações</p>
                <p className="text-xs text-gray-700">{publicacao.observacoes}</p>
              </div>
            )}
          </CardContent>

          {podePublicar && publicacao.status === 'publicado' && (
            <CardFooter className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl">
              <Button
                variant="outline" size="sm"
                className="h-8 text-xs gap-1.5 text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100"
                onClick={() => { setNovoStatus('suspenso'); setMotivoStatus(''); setModalStatus(true) }}
              >
                <PauseCircle className="w-3.5 h-3.5" /> Suspender
              </Button>
              <Button
                variant="outline" size="sm"
                className="h-8 text-xs gap-1.5 text-gray-700 border-gray-300 hover:bg-gray-100"
                onClick={() => { setNovoStatus('encerrado'); setMotivoStatus(''); setModalStatus(true) }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Encerrar
              </Button>
              <Button
                variant="outline" size="sm"
                className="h-8 text-xs gap-1.5 text-red-700 border-red-300 bg-red-50 hover:bg-red-100"
                onClick={() => { setNovoStatus('cancelado'); setMotivoStatus(''); setModalStatus(true) }}
              >
                <XCircle className="w-3.5 h-3.5" /> Cancelar
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Modal: atualizar status */}
        <Dialog open={modalStatus} onOpenChange={(open) => { if (!open) { setModalStatus(false); setMotivoStatus('') } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {novoStatus && STATUS_PUBLICACAO[novoStatus]?.icon}
                {novoStatus ? `${STATUS_PUBLICACAO[novoStatus]?.label} o processo` : 'Atualizar status'}
              </DialogTitle>
              <DialogDescription>
                Confirme a alteração de status da publicação.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="motivo-status" className="text-sm font-medium">
                Motivo (opcional)
              </Label>
              <Textarea
                id="motivo-status"
                rows={3}
                placeholder="Descreva o motivo da alteração..."
                value={motivoStatus}
                onChange={(e) => setMotivoStatus(e.target.value)}
                className="resize-none"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalStatus(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleAtualizarStatus}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Nao publicado ainda: formulario de publicacao
  return (
    <>
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            Registrar Publicação
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {!podePublicar && (
            <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
              Somente o setor de licitações pode registrar a publicação.
            </div>
          )}

          <p className="text-sm text-gray-600">
            Conforme Art. 54 da Lei 14.133/21, o edital deve ser publicado no PNCP com antecedência mínima
            de 8 dias úteis (Pregão) ou 25 dias úteis (Concorrência) antes da abertura das propostas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="data_publicacao" className="text-sm font-medium">
                Data de Publicação <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <Input
                  id="data_publicacao"
                  type="date"
                  value={form.data_publicacao}
                  onChange={(e) => campo('data_publicacao', e.target.value)}
                  className="pl-8 h-9 text-sm"
                  disabled={!podePublicar}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_abertura" className="text-sm font-medium">
                Data de Abertura das Propostas
              </Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <Input
                  id="data_abertura"
                  type="date"
                  value={form.data_abertura ?? ''}
                  onChange={(e) => campo('data_abertura', e.target.value)}
                  className="pl-8 h-9 text-sm"
                  disabled={!podePublicar}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pncp_numero" className="text-sm font-medium flex items-center gap-1">
              <Globe className="w-3 h-3" /> Número no PNCP
            </Label>
            <Input
              id="pncp_numero"
              placeholder="Ex: 01.234.567/0001-89-2024-0001"
              value={form.pncp_numero ?? ''}
              onChange={(e) => campo('pncp_numero', e.target.value)}
              className="h-9 text-sm"
              disabled={!podePublicar}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pncp_url" className="text-sm font-medium flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Link no PNCP
            </Label>
            <Input
              id="pncp_url"
              type="url"
              placeholder="https://pncp.gov.br/app/editais/..."
              value={form.pncp_url ?? ''}
              onChange={(e) => campo('pncp_url', e.target.value)}
              className="h-9 text-sm"
              disabled={!podePublicar}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="diario_oficial" className="text-sm font-medium flex items-center gap-1">
              <FileText className="w-3 h-3" /> Diário Oficial
            </Label>
            <Input
              id="diario_oficial"
              placeholder="Ex: DOE SP de 07/05/2026, página 42"
              value={form.diario_oficial ?? ''}
              onChange={(e) => campo('diario_oficial', e.target.value)}
              className="h-9 text-sm"
              disabled={!podePublicar}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal_proprio" className="text-sm font-medium flex items-center gap-1">
              <Globe className="w-3 h-3" /> Portal da Prefeitura
            </Label>
            <Input
              id="portal_proprio"
              type="url"
              placeholder="https://www.municipio.sp.gov.br/licitacoes/..."
              value={form.portal_proprio ?? ''}
              onChange={(e) => campo('portal_proprio', e.target.value)}
              className="h-9 text-sm"
              disabled={!podePublicar}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes" className="text-sm font-medium">
              Observações
            </Label>
            <Textarea
              id="observacoes"
              rows={2}
              placeholder="Informações adicionais sobre a publicação..."
              value={form.observacoes ?? ''}
              onChange={(e) => campo('observacoes', e.target.value)}
              className="resize-none text-sm"
              disabled={!podePublicar}
            />
          </div>
        </CardContent>

        {podePublicar && (
          <CardFooter className="flex items-center justify-end border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl">
            <Button
              size="sm"
              className="h-9 text-sm gap-1.5 bg-blue-700 hover:bg-blue-800 text-white"
              onClick={() => setModalPublicar(true)}
              disabled={!form.data_publicacao}
            >
              <Globe className="w-3.5 h-3.5" />
              Registrar Publicação
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Modal de confirmacao */}
      <Dialog open={modalPublicar} onOpenChange={(open) => { if (!open) setModalPublicar(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              Confirmar Publicação
            </DialogTitle>
            <DialogDescription>
              Confirme o registro da publicação do processo conforme Art. 54 da Lei 14.133/21.
              Esta ação marcará o processo como publicado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-1 text-sm text-gray-700">
            <p><span className="font-medium">Data de publicação:</span> {formatarData(form.data_publicacao)}</p>
            {form.data_abertura && (
              <p><span className="font-medium">Abertura das propostas:</span> {formatarData(form.data_abertura)}</p>
            )}
            {form.pncp_numero && (
              <p><span className="font-medium">PNCP:</span> {form.pncp_numero}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalPublicar(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5"
              onClick={handlePublicar}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
              Confirmar Publicação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
