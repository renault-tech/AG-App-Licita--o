'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { criarConvite } from '@/lib/actions/convites'

export default function FormConvitePrefeitura() {
  const [email,          setEmail]    = useState('')
  const [nomePrefeitura, setNome]     = useState('')
  const [municipio,      setMunicipio] = useState('')
  const [estado,         setEstado]   = useState('')
  const [carregando,     setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)

    const resultado = await criarConvite({
      email,
      nomePrefeitura: nomePrefeitura || undefined,
      municipio:      municipio || undefined,
      estado:         estado.toUpperCase() || undefined,
    })

    if (!resultado.success) {
      toast.error(resultado.error ?? 'Erro ao enviar convite.')
    } else {
      toast.success(`Convite enviado para ${email}.`)
      setEmail('')
      setNome('')
      setMunicipio('')
      setEstado('')
    }
    setCarregando(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--r-lg)] border p-6 space-y-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
    >
      <h3 className="text-base font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
        Novo Convite
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>E-mail do administrador da prefeitura</Label>
          <Input
            type="email"
            placeholder="admin@prefeitura.gov.br"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Nome da prefeitura <span className="text-xs" style={{ color: 'var(--muted)' }}>(opcional, aparece no e-mail)</span></Label>
          <Input
            placeholder="Ex: Prefeitura Municipal de Sorocaba"
            value={nomePrefeitura}
            onChange={e => setNome(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Municipio <span className="text-xs" style={{ color: 'var(--muted)' }}>(opcional)</span></Label>
          <Input
            placeholder="Ex: Sorocaba"
            value={municipio}
            onChange={e => setMunicipio(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>UF <span className="text-xs" style={{ color: 'var(--muted)' }}>(opcional)</span></Label>
          <Input
            placeholder="SP"
            maxLength={2}
            value={estado}
            onChange={e => setEstado(e.target.value.toUpperCase())}
            className="uppercase"
          />
        </div>
      </div>

      <Button type="submit" disabled={carregando} className="w-full sm:w-auto">
        {carregando
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
          : <><Send className="w-4 h-4 mr-2" /> Enviar convite</>
        }
      </Button>
    </form>
  )
}
