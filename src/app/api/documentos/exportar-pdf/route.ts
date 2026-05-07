import { NextRequest, NextResponse } from 'next/server'
import {
  montarPayloadDFD,
  montarPayloadETP,
  montarPayloadTR,
  montarPayloadRiscos,
  montarPayloadEdital,
  montarPayloadParecer,
} from '@/lib/documentos/montar-payload'
import { gerarPdf } from '@/lib/documentos/gerar-pdf'

const MONTADORES: Record<string, (id: string) => Promise<any>> = {
  dfd:    montarPayloadDFD,
  etp:    montarPayloadETP,
  tr:     montarPayloadTR,
  riscos: montarPayloadRiscos,
  edital: montarPayloadEdital,
  parecer: montarPayloadParecer,
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tipo = searchParams.get('tipo')
  const processoId = searchParams.get('processoId')

  if (!tipo || !processoId) {
    return NextResponse.json({ error: 'Parametros obrigatorios: tipo, processoId' }, { status: 400 })
  }

  const montador = MONTADORES[tipo]
  if (!montador) {
    return NextResponse.json({ error: `Tipo de documento nao suportado: ${tipo}` }, { status: 400 })
  }

  const payload = await montador(processoId)
  if (!payload) {
    return NextResponse.json({ error: 'Documento nao encontrado ou sem permissao.' }, { status: 404 })
  }

  const buffer = await gerarPdf(payload)
  const nomeArquivo = `${tipo.toUpperCase()}-${processoId.substring(0, 8)}.pdf`

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      'Content-Length': buffer.length.toString(),
    },
  })
}
