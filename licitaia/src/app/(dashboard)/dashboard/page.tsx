import { createClient } from '@/lib/supabase/server'
import { FileText, PlusCircle, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel de Controle</h1>
        <p className="text-gray-500 mt-1">Bem-vindo ao LicitaIA. Gerencie seus processos licitatórios.</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-gray-500">Total de Processos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">0</p>
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
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-gray-500">Concluidos</p>
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
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-gray-500">Creditos Disponiveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ação principal */}
      <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50">
        <CardHeader className="text-center">
          <CardTitle className="text-blue-800">Iniciar Novo Processo</CardTitle>
          <CardDescription>
            Crie um processo licitatorio seguindo o fluxo conforme a Lei 14.133/21
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link
            href="/processos/novo"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-800 transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            Novo Processo Licitatorio
          </Link>
        </CardContent>
      </Card>

      {/* Configuração pendente */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <p className="text-sm text-amber-800 font-medium">
            Configure sua organizacao antes de criar processos.{' '}
            <Link href="/configuracoes/organizacao" className="underline font-semibold">
              Configurar agora
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
