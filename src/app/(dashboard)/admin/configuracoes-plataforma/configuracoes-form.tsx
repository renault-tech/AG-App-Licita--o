'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { salvarConfiguracoes } from '@/lib/actions/configuracoes-plataforma'

export default function ConfiguracoesPlatafoma({
  prazoUrgencia,
  prazoAlerta,
  adminOrgPodeTrocarPerfil,
}: {
  prazoUrgencia: number
  prazoAlerta: number
  adminOrgPodeTrocarPerfil: boolean
}) {
  const [urgencia, setUrgencia]         = useState(prazoUrgencia)
  const [alerta, setAlerta]             = useState(prazoAlerta)
  const [trocarPerfil, setTrocarPerfil] = useState(adminOrgPodeTrocarPerfil)
  const [salvando, setSalvando]         = useState(false)

  async function handleSalvar() {
    setSalvando(true)
    const res = await salvarConfiguracoes({
      prazo_urgencia_parecer_dias:  urgencia,
      prazo_alerta_parecer_dias:    alerta,
      admin_org_pode_trocar_perfil: trocarPerfil,
    })
    res.success
      ? toast.success('Configuracoes salvas.')
      : toast.error(res.error ?? 'Erro ao salvar.')
    setSalvando(false)
  }

  return (
    <div className="space-y-5">
      <Card className="border-gray-200">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-sm font-semibold text-gray-800">Prazos de Alerta para Pareceres</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Urgencia de parecer (dias)
            </Label>
            <p className="text-xs text-gray-500">
              Dias sem parecer para exibir badge URGENTE vermelho.
            </p>
            <Input
              type="number"
              min={1}
              max={365}
              value={urgencia}
              onChange={e => setUrgencia(Number(e.target.value))}
              className="w-32"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Alerta de prazo (dias)
            </Label>
            <p className="text-xs text-gray-500">
              Dias sem parecer para exibir badge ATENCAO ambar.
            </p>
            <Input
              type="number"
              min={1}
              max={365}
              value={alerta}
              onChange={e => setAlerta(Number(e.target.value))}
              className="w-32"
            />
          </div>
          {urgencia >= alerta && (
            <p className="text-xs text-red-600">
              O prazo de urgencia deve ser menor que o prazo de alerta.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-sm font-semibold text-gray-800">Permissoes de Visualizacao</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={trocarPerfil}
              onChange={e => setTrocarPerfil(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-700"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Permitir que administradores de organizacao troquem perfil
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Quando ativo, o admin da organizacao pode alternar entre perfis para visualizar o sistema como requisitante, procurador, etc. Nenhuma alteracao real e feita, apenas a visao muda.
              </p>
            </div>
          </label>
        </CardContent>
        <CardFooter className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
          <Button
            onClick={handleSalvar}
            disabled={salvando || urgencia >= alerta}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm"
          >
            {salvando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : <><Save className="w-4 h-4" /> Salvar configuracoes</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
