'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, UserX } from 'lucide-react'
import { alterarPapelUsuario, desativarUsuario } from '@/lib/actions/organizacao'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PapelUsuario } from '@/types/database'

const PAPEIS = [
  { value: 'requisitante', label: 'Requisitante' },
  { value: 'setor_compras', label: 'Setor de Compras' },
  { value: 'setor_licitacao', label: 'Setor de Licitacao' },
  { value: 'procurador', label: 'Procurador' },
  { value: 'gestor_publico', label: 'Gestor Publico' },
  { value: 'publicacao', label: 'Publicacao' },
  { value: 'admin_organizacao', label: 'Administrador' },
]

interface Usuario {
  id: string
  nome_completo: string
  cargo: string | null
  papel: string
  ativo: boolean
  created_at: string
}

interface Props {
  usuarios: Usuario[]
  usuarioAtualId: string
  papeisLabels: Record<string, string>
}

export default function TabelaUsuarios({ usuarios, usuarioAtualId, papeisLabels }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleAlterarPapel(usuarioId: string, papel: string) {
    setLoadingId(usuarioId)
    const result = await alterarPapelUsuario({ usuario_id: usuarioId, papel })
    if (!result.success) toast.error(result.error)
    else toast.success('Papel atualizado.')
    setLoadingId(null)
  }

  async function handleDesativar(usuarioId: string, nome: string) {
    if (!confirm(`Desativar o usuario "${nome}"? Ele nao conseguira mais acessar o sistema.`)) return
    setLoadingId(usuarioId)
    const result = await desativarUsuario(usuarioId)
    if (!result.success) toast.error(result.error)
    else toast.success('Usuario desativado.')
    setLoadingId(null)
  }

  if (usuarios.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
        Nenhum usuario cadastrado alem de voce.
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Papel</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Situacao</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Acoes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {usuarios.map(u => {
            const ehAtual = u.id === usuarioAtualId
            const carregando = loadingId === u.id
            return (
              <tr key={u.id} className={`${!u.ativo ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{u.nome_completo}</p>
                  {u.cargo && <p className="text-xs text-gray-400">{u.cargo}</p>}
                  {ehAtual && <span className="text-xs text-blue-600">(voce)</span>}
                </td>
                <td className="px-4 py-3">
                  {ehAtual ? (
                    <Badge variant="secondary">{papeisLabels[u.papel] ?? u.papel}</Badge>
                  ) : (
                    <Select
                      defaultValue={u.papel}
                      onValueChange={v => v && handleAlterarPapel(u.id, v)}
                      disabled={carregando || !u.ativo}
                    >
                      <SelectTrigger className="h-7 text-xs w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAPEIS.map(p => (
                          <SelectItem key={p.value} value={p.value} className="text-xs">
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.ativo ? 'default' : 'secondary'}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {!ehAtual && u.ativo && (
                    <button
                      onClick={() => handleDesativar(u.id, u.nome_completo)}
                      disabled={carregando}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Desativar usuario"
                    >
                      {carregando ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                      Desativar
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
