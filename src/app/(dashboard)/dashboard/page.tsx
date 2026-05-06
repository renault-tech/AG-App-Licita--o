import { createClient } from '@/lib/supabase/server'
import { FileText, PlusCircle, Clock, CheckCircle, Search, MoreVertical, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Não autenticado.</div>
  }

  const { data } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  const usuario = data as any;
  const organizacaoId = usuario?.organizacao_id

  // Buscar processos
  const { data: dataProcessos } = await supabase
    .from('processos_licitatorios')
    .select('*')
    .eq('organizacao_id', organizacaoId as string)
    .order('created_at', { ascending: false })

  const processos = dataProcessos as any[] | null

  const totalProcessos = processos?.length || 0
  const concluidos = processos?.filter(p => p.status === 'publicado' || p.status === 'assinado').length || 0
  const emAndamento = totalProcessos - concluidos

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel de Controle</h1>
        <p className="text-gray-500 mt-1">Gerencie seus processos licitatórios e acompanhe as fases da Lei 14.133/21.</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalProcessos}</p>
                <p className="text-sm text-gray-500">Total de Processos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{emAndamento}</p>
                <p className="text-sm text-gray-500">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{concluidos}</p>
                <p className="text-sm text-gray-500">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-700 font-bold text-sm">IA</span>
              </div>
              <div>
                <p className="text-2xl font-bold">Ilimitado</p>
                <p className="text-sm text-gray-500">Créditos de IA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Processos */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-lg">Processos Licitatórios Recentes</CardTitle>
            <CardDescription>Acompanhe e continue a elaboração dos documentos</CardDescription>
          </div>
          <Link href="/processos/novo">
            <Button className="bg-blue-700 hover:bg-blue-800 text-white gap-2">
              <PlusCircle className="w-4 h-4" /> Novo Processo
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {totalProcessos === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Nenhum processo encontrado</h3>
              <p className="text-gray-500 mt-1 max-w-sm">Você ainda não possui processos licitatórios. Clique em "Novo Processo" para iniciar o assistente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                  <tr>
                    <th className="px-6 py-4">Processo / Objeto</th>
                    <th className="px-6 py-4">Modalidade</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {processos?.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{p.numero_processo || 'S/N'}</p>
                        <p className="text-gray-500 truncate max-w-xs">{p.objeto}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {p.modalidade.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          p.status === 'rascunho' ? 'bg-gray-50 text-gray-700 border-gray-200' : 
                          p.status === 'em_revisao' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {/* Dropdown de ações rápidas simplificado para MVP */}
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/processos/${p.id}/dfd`} className="text-xs font-medium text-gray-600 hover:text-blue-600 bg-white border px-2 py-1 rounded">DFD</Link>
                          <Link href={`/processos/${p.id}/etp`} className="text-xs font-medium text-gray-600 hover:text-blue-600 bg-white border px-2 py-1 rounded">ETP</Link>
                          <Link href={`/processos/${p.id}/tr`} className="text-xs font-medium text-gray-600 hover:text-blue-600 bg-white border px-2 py-1 rounded">TR</Link>
                          <Link href={`/processos/${p.id}/edital`} className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-100 px-2 py-1 rounded flex items-center">
                            Edital <ArrowRight className="w-3 h-3 ml-1" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
