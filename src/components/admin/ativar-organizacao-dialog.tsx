'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ativarOrganizacao, suspenderOrganizacao } from '@/lib/actions/admin-master'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

interface AtivarOrganizacaoDialogProps {
  organizacaoId: string
  nomeOrg: string
  modo?: 'ativar' | 'suspender'
}

export function AtivarOrganizacaoDialog({
  organizacaoId,
  nomeOrg,
  modo = 'ativar',
}: AtivarOrganizacaoDialogProps) {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [motivo, setMotivo] = useState('')

  async function handleConfirmar() {
    setCarregando(true)
    const resultado = modo === 'ativar'
      ? await ativarOrganizacao(organizacaoId)
      : await suspenderOrganizacao(organizacaoId, motivo)

    if (!resultado.success) {
      toast.error(resultado.error ?? 'Erro na operacao.')
    } else {
      toast.success(modo === 'ativar' ? `${nomeOrg} ativada com sucesso!` : `${nomeOrg} suspensa.`)
      setAberto(false)
      setMotivo('')
    }
    setCarregando(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant={modo === 'ativar' ? 'default' : 'destructive'}
            className="shrink-0"
          />
        }
      >
        {modo === 'ativar'
          ? <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Ativar</>
          : <><XCircle className="w-3.5 h-3.5 mr-1.5" />Suspender</>
        }
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modo === 'ativar' ? `Ativar ${nomeOrg}?` : `Suspender ${nomeOrg}?`}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {modo === 'ativar'
            ? 'A prefeitura e o Admin de Org serao ativados e poderao acessar a plataforma.'
            : 'A prefeitura sera suspensa e todos os seus usuarios perderao acesso.'
          }
        </p>

        {modo === 'suspender' && (
          <div className="space-y-2">
            <Label>Motivo da suspensao (obrigatorio)</Label>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Inadimplencia no plano..."
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)} disabled={carregando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={carregando || (modo === 'suspender' && !motivo.trim())}
            variant={modo === 'suspender' ? 'destructive' : 'default'}
          >
            {carregando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {modo === 'ativar' ? 'Confirmar ativacao' : 'Confirmar suspensao'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
