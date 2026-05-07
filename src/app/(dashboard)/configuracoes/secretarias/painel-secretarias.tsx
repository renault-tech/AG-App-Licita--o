'use client'

import { useState, useTransition } from 'react'
import { Building2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check, AlertTriangle } from 'lucide-react'
import {
  criarSecretaria,
  atualizarSecretaria,
  alternarAtivoSecretaria,
  excluirSecretaria,
} from '@/lib/actions/secretarias'

type Secretaria = {
  id: string
  nome: string
  sigla: string | null
  responsavel: string | null
  ativo: boolean
}

interface Props {
  secretariasIniciais: Secretaria[]
}

function FormSecretaria({
  inicial,
  onSalvar,
  onCancelar,
}: {
  inicial?: Secretaria
  onSalvar: (fd: FormData) => void
  onCancelar: () => void
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSalvar(new FormData(e.currentTarget))
      }}
      className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Nome da Secretaria <span className="text-red-500">*</span>
          </label>
          <input
            name="nome"
            defaultValue={inicial?.nome ?? ''}
            required
            minLength={2}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Secretaria Municipal de Administracao"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Sigla</label>
          <input
            name="sigla"
            defaultValue={inicial?.sigla ?? ''}
            maxLength={10}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: SEMAD"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Responsavel</label>
          <input
            name="responsavel"
            defaultValue={inicial?.responsavel ?? ''}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nome do secretario(a)"
          />
        </div>
        {inicial && (
          <input type="hidden" name="ativo" value={String(inicial.ativo)} />
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancelar
        </button>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {inicial ? 'Salvar alteracoes' : 'Criar secretaria'}
        </button>
      </div>
    </form>
  )
}

export default function PainelSecretarias({ secretariasIniciais }: Props) {
  const [secretarias, setSecretarias] = useState<Secretaria[]>(secretariasIniciais)
  const [adicionando, setAdicionando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function exibirErro(msg: string) {
    setErro(msg)
    setTimeout(() => setErro(null), 5000)
  }

  function handleCriar(fd: FormData) {
    startTransition(async () => {
      const res = await criarSecretaria(fd)
      if (!res.success) { exibirErro(res.error!); return }
      const novas = await fetch('/api/secretarias').catch(() => null)
      // Optimistic update com dados do form
      const nova: Secretaria = {
        id: res.data!.id,
        nome: fd.get('nome') as string,
        sigla: (fd.get('sigla') as string) || null,
        responsavel: (fd.get('responsavel') as string) || null,
        ativo: true,
      }
      setSecretarias(prev => [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome)))
      setAdicionando(false)
    })
  }

  function handleAtualizar(id: string, fd: FormData) {
    startTransition(async () => {
      const res = await atualizarSecretaria(id, fd)
      if (!res.success) { exibirErro(res.error!); return }
      setSecretarias(prev =>
        prev.map(s => s.id !== id ? s : {
          ...s,
          nome: fd.get('nome') as string,
          sigla: (fd.get('sigla') as string) || null,
          responsavel: (fd.get('responsavel') as string) || null,
        })
      )
      setEditandoId(null)
    })
  }

  function handleAlternarAtivo(s: Secretaria) {
    startTransition(async () => {
      const res = await alternarAtivoSecretaria(s.id, !s.ativo)
      if (!res.success) { exibirErro(res.error!); return }
      setSecretarias(prev => prev.map(x => x.id !== s.id ? x : { ...x, ativo: !x.ativo }))
    })
  }

  function handleExcluir(id: string) {
    startTransition(async () => {
      const res = await excluirSecretaria(id)
      if (!res.success) { exibirErro(res.error!); return }
      setSecretarias(prev => prev.filter(s => s.id !== id))
      setConfirmarExclusaoId(null)
    })
  }

  const ativas = secretarias.filter(s => s.ativo)
  const inativas = secretarias.filter(s => !s.ativo)

  return (
    <div className="space-y-4">
      {erro && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {erro}
        </div>
      )}

      {/* Cabecalho com botao adicionar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {ativas.length} secretaria{ativas.length !== 1 ? 's' : ''} ativa{ativas.length !== 1 ? 's' : ''}
          {inativas.length > 0 && `, ${inativas.length} inativa${inativas.length !== 1 ? 's' : ''}`}
        </p>
        {!adicionando && (
          <button
            onClick={() => setAdicionando(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova secretaria
          </button>
        )}
      </div>

      {/* Formulario de adicao */}
      {adicionando && (
        <FormSecretaria
          onSalvar={handleCriar}
          onCancelar={() => setAdicionando(false)}
        />
      )}

      {/* Lista de secretarias ativas */}
      {secretarias.length === 0 && !adicionando && (
        <div className="text-center py-12 text-gray-400">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma secretaria cadastrada.</p>
          <p className="text-xs mt-1">Adicione a primeira secretaria para comecar.</p>
        </div>
      )}

      <div className="space-y-2">
        {[...ativas, ...inativas].map(s => (
          <div key={s.id}>
            {editandoId === s.id ? (
              <FormSecretaria
                inicial={s}
                onSalvar={(fd) => handleAtualizar(s.id, fd)}
                onCancelar={() => setEditandoId(null)}
              />
            ) : confirmarExclusaoId === s.id ? (
              <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700">
                  Excluir <strong>{s.nome}</strong>? Esta acao nao pode ser desfeita.
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmarExclusaoId(null)}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleExcluir(s.id)}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Confirmar exclusao
                  </button>
                </div>
              </div>
            ) : (
              <div className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 transition-all ${
                s.ativo ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  s.ativo ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{s.nome}</span>
                    {s.sigla && (
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
                        {s.sigla}
                      </span>
                    )}
                    {!s.ativo && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
                        Inativa
                      </span>
                    )}
                  </div>
                  {s.responsavel && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{s.responsavel}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleAlternarAtivo(s)}
                    disabled={isPending}
                    title={s.ativo ? 'Desativar' : 'Ativar'}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {s.ativo
                      ? <ToggleRight className="w-4 h-4 text-green-500" />
                      : <ToggleLeft className="w-4 h-4" />
                    }
                  </button>
                  <button
                    onClick={() => { setEditandoId(s.id); setAdicionando(false) }}
                    title="Editar"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmarExclusaoId(s.id)}
                    title="Excluir"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
