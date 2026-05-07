import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, Header, Footer, PageNumber,
  NumberFormat, convertInchesToTwip, type ISectionOptions,
} from 'docx'
import type { PayloadDocumento } from './tipos'

type ElementoDoc = Paragraph | Table

function rodapeTexto(payload: PayloadDocumento): string {
  const partes: string[] = []
  if (payload.cabecalho.endereco) partes.push(`Endereco: ${payload.cabecalho.endereco}`)
  if (payload.cabecalho.telefone) partes.push(`Telefone: ${payload.cabecalho.telefone}`)
  if (payload.cabecalho.email)    partes.push(`E-mail: ${payload.cabecalho.email}`)
  return partes.join('   |   ')
}

export async function gerarDocx(payload: PayloadDocumento): Promise<Buffer> {
  const { cabecalho } = payload

  const secaoNomeOrg = cabecalho.nomeSecretaria
    ? `${cabecalho.nomeOrganizacao}\n${cabecalho.nomeSecretaria}`
    : cabecalho.nomeOrganizacao

  const paragrafos: ElementoDoc[] = [
    // Cabecalho interno (sem logo — logo requer imagem binária)
    new Paragraph({
      children: [
        new TextRun({
          text: secaoNomeOrg.toUpperCase(),
          bold: true,
          size: 28,
          color: '1e3a5f',
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      border: {
        bottom: { color: '1e3a5f', size: 6, style: BorderStyle.SINGLE, space: 4 },
      },
    }),

    // Tipo do documento
    new Paragraph({
      children: [
        new TextRun({
          text: payload.tipoDocumento,
          bold: true,
          size: 24,
          color: '1e3a5f',
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
    }),

    // Metadados em tabela
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'Processo: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({ text: payload.numeroProcesso ?? 'Nao informado', size: 18, font: 'Arial' }),
                ],
              })],
              shading: { type: ShadingType.CLEAR, color: 'f0f4f8' },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
            }),
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'Modalidade: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({ text: payload.modalidade, size: 18, font: 'Arial' }),
                ],
              })],
              shading: { type: ShadingType.CLEAR, color: 'f0f4f8' },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
            }),
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'Data: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({ text: payload.dataGeracao, size: 18, font: 'Arial' }),
                ],
              })],
              shading: { type: ShadingType.CLEAR, color: 'f0f4f8' },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'Objeto: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({ text: payload.objeto, size: 18, font: 'Arial' }),
                ],
              })],
              columnSpan: 3,
              shading: { type: ShadingType.CLEAR, color: 'f8fafc' },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
            }),
          ],
        }),
      ],
    }),

    new Paragraph({ text: '', spacing: { after: 240 } }),

    // Secoes do documento
    ...payload.secoes.flatMap((secao) => [
      new Paragraph({
        children: [new TextRun({ text: secao.titulo, bold: true, size: 22, color: '1e3a5f', font: 'Arial' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 120 },
        border: {
          bottom: { color: 'cbd5e1', size: 2, style: BorderStyle.SINGLE, space: 2 },
        },
      }),
      new Paragraph({
        children: [new TextRun({ text: secao.conteudo || '(nao preenchido)', size: 20, font: 'Arial' })],
        spacing: { after: 160 },
        alignment: AlignmentType.JUSTIFIED,
      }),
    ]),

    // Espaco para assinatura
    new Paragraph({ text: '', spacing: { before: 480 } }),
    new Paragraph({
      children: [new TextRun({ text: '_'.repeat(60), size: 20, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Assinatura do Responsavel', size: 18, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: cabecalho.nomeSecretaria ?? cabecalho.nomeOrganizacao, size: 18, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
    }),
  ]

  if (payload.rodapeIA) {
    paragrafos.push(
      new Paragraph({ text: '', spacing: { before: 480 } }),
      new Paragraph({
        children: [new TextRun({
          text: `Documento gerado com auxilio de inteligencia artificial em ${payload.dataGeracao}. A revisao e validacao do conteudo sao de responsabilidade do agente publico signatario, nos termos da Lei 14.133/21.`,
          size: 16,
          italics: true,
          color: '64748b',
          font: 'Arial',
        })],
        alignment: AlignmentType.JUSTIFIED,
      })
    )
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.18),
            right: convertInchesToTwip(0.98),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${cabecalho.municipio} - ${cabecalho.estado}  |  ${payload.tipoDocumento}`,
                  size: 16,
                  color: '64748b',
                  font: 'Arial',
                }),
              ],
              alignment: AlignmentType.RIGHT,
              border: {
                bottom: { color: 'cbd5e1', size: 2, style: BorderStyle.SINGLE, space: 2 },
              },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: rodapeTexto(payload), size: 16, color: '64748b', font: 'Arial' }),
                new TextRun({ text: '   Pagina ', size: 16, color: '64748b', font: 'Arial' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '64748b', font: 'Arial' }),
                new TextRun({ text: ' de ', size: 16, color: '64748b', font: 'Arial' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '64748b', font: 'Arial' }),
              ],
              alignment: AlignmentType.CENTER,
              border: {
                top: { color: 'cbd5e1', size: 2, style: BorderStyle.SINGLE, space: 2 },
              },
            }),
          ],
        }),
      },
      children: paragrafos,
    }],
    numbering: {
      config: [{
        reference: 'default-numbering',
        levels: [{ level: 0, format: NumberFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT }],
      }],
    },
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
