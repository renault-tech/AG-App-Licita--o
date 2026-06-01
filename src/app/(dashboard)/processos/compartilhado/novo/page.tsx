'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Users, Info } from 'lucide-react'
import Link from 'next/link'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarProcessoCompartilhado } from '@/lib/actions/processo'
import { listarSecretarias } from '@/lib/actions/secretarias'
import type { ModalidadeLicitacao } from '@/types/database'

const MODALIDADES: { value: ModalidadeLicitacao; label: string; artigo: string }[] = [
  { value: 'pregao_eletronico', label: 'Pregao Eletronico', artigo: 'Art. 28' },
  { value: 'concorrencia', label: 'Concorrencia', artigo: 'Art. 29' },
  { value: 'dispensa', label: 'Dispensa', artigo: 'Art. 75' },
  { value: 'inexigibilidade', label: 'Inexigibilidade', artigo: 'Art. 74' },
  { value: 'pregao_presencial', label: 'Pregao Presencial', artigo: 'Art. 28' },
  { value: 'concurso', label: 'Concurso', artigo: 'Art. 30' },
  { value: 'leilao', label: 'Leilao', artigo: 'Art. 31' },
  { value: 'dialogo_competitivo', label: 'Dialogo Competitivo', artigo: 'Art. 32' },
]

const CATEGORIAS: { value: string; label: string }[] = [
  { value: 'informatica', label: 'Equipamentos de Informatica' },
  { value: 'mobiliario', label: 'Mobiliario e Decoracao' },
  { value: 'material_consumo', label: 'Material de Consumo' },
  { value: 'veiculos', label: 'Veiculos e Transporte' },
  { value: 'obras', label: 'Obras e Reformas' },
  { value: 'servicos_continuados', label: 'Servicos Continuados' },
  { value: 'servicos_eventuais', label: 'Servicos Eventuais' },
  { value: 'saude_medicamentos', label: 'Saude e Medicamentos' },
  { value: 'alimentacao', label: 'Alimentacao e Generos' },
  { value: 'outros', label: 'Outros' },
]

export default function NovoProcessoCompartilhadoPage() {
  const router = useRouter()
  const [secretarias, setSecretarias] = useState<Array<{ id: string; nome: string; sigla: string | null }>>([])
  const [secretariaId, setSecretariaId] = useState('')
  const [categoria, setCategoria] = useState('')
  const [modalidade, setModalidade] = useState<string>('')
  const [registroPrecos, setRegistroPrecos] = useState(false)
  const [objeto, setObjeto] = useState('')
  const [salvando, startTransition] = useTransition()

  useEffect(() => {
    listarSecretarias().then(secs => setSecretarias(secs))
  }, [])

  const secretariaSelecionada = secretarias.find(s => s.id === secretariaId)
  const categoriaSelecionada = CATEGORIAS.find(c => c.value === categoria)

  const pronto =
    secretariaId.length > 0 &&
    categoria.length > 0 &&
    modalidade.length > 0 &&
    objeto.trim().length >= 10

  function handleCriar() {
    if (!pronto) {
      toast.error('Preencha todos os campos obrigatorios.')
      return
    }
    startTransition(async () => {
      const res = await criarProcessoCompartilhado({
        objeto: objeto.trim(),
        modalidade,
        categoria_objeto: categoria,
        secretaria_id: secretariaId,
        registro_de_precos: registroPrecos,
      })
      if (!res.success || !res.processoId) {
        toast.error(res.error ?? 'Erro ao criar processo compartilhado.')
        return
      }
      toast.success('Processo compartilhado criado. Defina os itens e convide as secretarias.')
      router.push(`/processos/${res.processoId}/dfd`)
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/processos"
          className="p-1.5 rounded-[var(--r-md)] transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            <Users className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            Compra Compartilhada
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Crie o DFD e convide outras secretarias a manifestar interesse antes de gerar ETP e TR.
          </p>
        </div>
      </div>

      <div className="glass rounded-[var(--r-lg)] p-6 space-y-6">
        {/* Secretaria requisitante */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Secretaria Requisitante <span className="text-red-500">*</span></Label>
          <Select value={secretariaId} onValueChange={v => setSecretariaId(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a secretaria...">
                {secretariaSelecionada
                  ? `${secretariaSelecionada.nome}${secretariaSelecionada.sigla ? ` (${secretariaSelecionada.sigla})` : ''}`
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-w-sm">
              {secretarias.map(s => (
                <SelectItem key={s.id} value={s.id} className="whitespace-normal">
                  {s.nome}{s.sigla ? ` (${s.sigla})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categoria */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Categoria do Objeto <span className="text-red-500">*</span></Label>
          <Select value={categoria} onValueChange={v => setCategoria(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a categoria...">
                {categoriaSelecionada ? categoriaSelecionada.label : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-w-sm">
              {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value} className="whitespace-normal">{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Modalidade */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Modalidade de Licitacao <span className="text-red-500">*</span></Label>
          <Select value={modalidade} onValueChange={v => setModalidade(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a modalidade...">
                {modalidade ? MODALIDADES.find(m => m.value === modalidade)?.label : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-w-sm">
              {MODALIDADES.map(m => (
                <SelectItem key={m.value} value={m.value} className="whitespace-normal">
                  {m.label} ({m.artigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Registro de Precos */}
        <div className="space-y-2">
          <label className="flex items-start gap-3 p-3 rounded-[var(--r-md)] border cursor-pointer transition-colors"
            style={{ borderColor: registroPrecos ? 'var(--primary)' : 'var(--hairline)', background: registroPrecos ? 'var(--primaryWash)' : 'transparent' }}
          >
            <input
              type="checkbox"
              checked={registroPrecos}
              onChange={e => setRegistroPrecos(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                Sistema de Registro de Precos (SRP)
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                Marque se a contratacao usara registro de precos (Art. 82). Define o rito da manifestacao
                como Intencao de Registro de Precos (Art. 86 a 88 e Decreto 11.462/2023).
              </p>
            </div>
          </label>
        </div>

        {/* Objeto */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Objeto <span className="text-red-500">*</span></Label>
          <textarea
            value={objeto}
            onChange={e => setObjeto(e.target.value)}
            placeholder="Descreva o objeto a ser contratado ou adquirido..."
            rows={3}
            className="w-full rounded-[var(--r-md)] border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--hairline)', background: 'var(--surface)', color: 'var(--ink)' }}
          />
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Minimo de 10 caracteres. Voce podera detalhar o Anexo Unico de itens na proxima tela.
          </p>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-[var(--r-md)]" style={{ background: 'var(--primaryWash)' }}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
          <p className="text-xs" style={{ color: 'var(--inkSoft)' }}>
            Apos criar, voce sera levado ao DFD para preencher os itens (Anexo Unico) e encaminhar para
            adesao das secretarias. O ETP e o TR sao gerados apenas depois da consolidacao das manifestacoes.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--hairline)' }}>
          <Link href="/processos">
            <button type="button" className="px-4 py-2 text-sm rounded-[var(--r-md)] border" style={{ color: 'var(--inkSoft)', borderColor: 'var(--hairline)' }}>
              Cancelar
            </button>
          </Link>
          <button
            type="button"
            onClick={handleCriar}
            disabled={salvando || !pronto}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-[var(--r-md)] transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--primary)', color: 'white' }}
          >
            {salvando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
              : 'Criar e definir itens'}
          </button>
        </div>
      </div>
    </div>
  )
}
