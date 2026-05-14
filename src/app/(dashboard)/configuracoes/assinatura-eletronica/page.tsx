import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PenTool, ShieldCheck, Info } from 'lucide-react'
import FormConfigAssinatura from './form-config-assinatura'

export default async function AssinaturaEletronicaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const usuario = usuarioData as { papel: string; organizacao_id: string } | null
  if (!usuario) redirect('/onboarding')
  if (!['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)) redirect('/dashboard')

  const { data: orgData } = await (supabase.from('organizacoes') as any)
    .select('assinatura_config')
    .eq('id', usuario.organizacao_id)
    .maybeSingle()

  const assinaturaConfig = (orgData as any)?.assinatura_config as { provider?: string } | null
  const provedorAtual = assinaturaConfig?.provider ?? 'interno'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Assinatura Eletrônica</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure o método de assinatura eletrônica dos documentos gerados pela plataforma.
        </p>
      </div>

      {/* Status atual */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Método ativo</p>
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-medium text-gray-900 capitalize">{provedorAtual}</p>
          {provedorAtual === 'interno' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" /> Operacional
            </span>
          )}
        </div>
      </div>

      {/* Aviso sobre assinatura interna */}
      {provedorAtual === 'interno' && (
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Assinatura interna ativa</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Registra a autoria e timestamp via hash SHA-256. Adequada para uso interno e protocolos administrativos.
              Para validade jurídica plena (Lei 14.133/21 art. 92), utilize provedor ICP-Brasil como Gov.br.
            </p>
          </div>
        </div>
      )}

      {/* Seletor de provedor */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Provedor de assinatura</h3>
        <FormConfigAssinatura provedorAtual={provedorAtual} />
      </div>

      {/* Referencia legal */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <p className="text-xs text-gray-500">
          <strong className="text-gray-700">Referência legal:</strong> A Lei 14.133/21 aceita assinatura eletrônica
          nos termos da Lei 14.063/20. Para atos que exijam assinatura digital com certificado ICP-Brasil,
          utilize o provedor Gov.br ou outro compatível.
        </p>
      </div>
    </div>
  )
}