import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface AvisoCotacaoPendenteProps {
  processoId: string
}

export function AvisoCotacaoPendente({ processoId }: AvisoCotacaoPendenteProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border px-4 py-3"
      style={{ background: '#FFFBEB', borderColor: '#FCD34D' }}
      role="alert"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#B45309' }} />
      <div className="text-sm" style={{ color: '#92400E' }}>
        <strong>Cotacao nao preenchida.</strong>{' '}
        O processo sera encaminhado sem cotacao. Voce pode{' '}
        <Link
          href={`/processos/${processoId}/cotacao`}
          className="font-semibold underline"
          style={{ color: '#B45309' }}
        >
          preencher a cotacao
        </Link>
        {' '}antes de enviar, mas isso nao e obrigatorio para continuar.
      </div>
    </div>
  )
}
