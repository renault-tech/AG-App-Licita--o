import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer'
import type { PayloadDocumento } from './tipos'

// Helvetica e Helvetica-Bold sao fontes PDF nativas — nao precisam de registro nem download
const FONT_NORMAL = 'Helvetica'
const FONT_BOLD   = 'Helvetica-Bold'

const AZUL        = '#1b3a6b'
const AZUL_CLARO  = '#2563eb'
const CINZA       = '#64748b'
const CINZA_CLARO = '#eef2f7'
const LINHA       = '#c7d2e2'
const VERDE_IA    = '#166534'

const s = StyleSheet.create({
  page: {
    fontFamily: FONT_NORMAL,
    fontSize: 10,
    paddingTop: 68,
    paddingBottom: 64,
    paddingLeft: 56,
    paddingRight: 46,
    color: '#1e293b',
  },
  cabecalho: {
    borderBottomWidth: 3,
    borderBottomColor: AZUL,
    borderBottomStyle: 'solid',
    paddingBottom: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brasao: {
    width: 52,
    height: 52,
    objectFit: 'contain',
  },
  cabecalhoTexto: {
    flex: 1,
    alignItems: 'center',
  },
  orgNome: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    color: AZUL,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secNome: {
    fontFamily: FONT_NORMAL,
    fontSize: 10,
    color: AZUL_CLARO,
    textAlign: 'center',
    marginTop: 3,
  },
  tipoDoc: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 14,
    textTransform: 'uppercase',
    backgroundColor: AZUL,
    padding: 6,
    borderRadius: 3,
  },
  metaTabela: {
    backgroundColor: CINZA_CLARO,
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
    flexDirection: 'column',
    gap: 4,
  },
  metaLinha: {
    flexDirection: 'row',
    gap: 16,
  },
  metaCampo: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  metaLabel: { fontFamily: FONT_BOLD, color: AZUL, fontSize: 9 },
  metaValor: { fontFamily: FONT_NORMAL, fontSize: 9, color: '#334155' },
  secaoTitulo: {
    fontFamily: FONT_BOLD,
    fontSize: 10,
    color: AZUL,
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 4,
    paddingLeft: 6,
    borderBottomWidth: 1,
    borderBottomColor: AZUL_CLARO,
    borderBottomStyle: 'solid',
    borderLeftWidth: 3,
    borderLeftColor: AZUL_CLARO,
    borderLeftStyle: 'solid',
  },
  secaoConteudo: {
    fontFamily: FONT_NORMAL,
    fontSize: 10,
    lineHeight: 1.6,
    textAlign: 'justify',
    color: '#1e293b',
  },
  assinatura: {
    marginTop: 48,
    alignItems: 'center',
    gap: 4,
  },
  assinaturaLinha: {
    width: 280,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    borderBottomStyle: 'solid',
    marginBottom: 6,
  },
  assinaturaLabel: { fontFamily: FONT_NORMAL, fontSize: 9, color: CINZA, textAlign: 'center' },
  rodapeIA: {
    marginTop: 32,
    padding: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderStyle: 'solid',
    borderRadius: 3,
    backgroundColor: '#f0fdf4',
    fontSize: 8,
    color: VERDE_IA,
    textAlign: 'justify',
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 56,
    right: 46,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: LINHA,
    borderBottomStyle: 'solid',
    paddingBottom: 4,
  },
  headerText: { fontFamily: FONT_NORMAL, fontSize: 8, color: CINZA },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 56,
    right: 46,
    borderTopWidth: 1,
    borderTopColor: LINHA,
    borderTopStyle: 'solid',
    paddingTop: 4,
    alignItems: 'center',
  },
  footerText: { fontFamily: FONT_NORMAL, fontSize: 8, color: CINZA, textAlign: 'center' },
  marca: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 76,
    color: '#e2e8f0',
    opacity: 0.3,
    transform: 'rotate(-45deg)',
    fontFamily: FONT_BOLD,
  },
})

function rodapeTexto(payload: PayloadDocumento): string {
  const partes: string[] = []
  if (payload.cabecalho.endereco) partes.push(payload.cabecalho.endereco)
  if (payload.cabecalho.telefone) partes.push(`Tel: ${payload.cabecalho.telefone}`)
  if (payload.cabecalho.email)    partes.push(payload.cabecalho.email)
  return partes.join('   |   ')
}

function ehMinuta(statusDocumento: string | null): boolean {
  return !['assinado', 'publicado'].includes(statusDocumento ?? '')
}

function PaginaDoc({ payload }: { payload: PayloadDocumento }) {
  const { cabecalho } = payload
  const minuta = ehMinuta(payload.statusDocumento)

  return (
    <Page size="A4" style={s.page}>
      {/* Marca d'agua MINUTA enquanto nao assinado */}
      {minuta && <Text style={s.marca} fixed>MINUTA</Text>}

      {/* Header fixo por pagina */}
      <View style={s.header} fixed>
        <Text style={s.headerText}>{cabecalho.municipio} - {cabecalho.estado}</Text>
        <Text style={s.headerText}>{payload.tipoDocumento}</Text>
      </View>

      {/* Footer fixo por pagina */}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>{rodapeTexto(payload)}</Text>
        <Text
          style={[s.footerText, { marginTop: 2 }]}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </View>

      {/* Cabecalho do documento com brasao */}
      <View style={s.cabecalho}>
        {cabecalho.brasaoUrl && (
          <Image src={cabecalho.brasaoUrl} style={s.brasao} />
        )}
        <View style={s.cabecalhoTexto}>
          <Text style={s.orgNome}>{cabecalho.nomeOrganizacao}</Text>
          {cabecalho.nomeSecretaria && (
            <Text style={s.secNome}>{cabecalho.nomeSecretaria}</Text>
          )}
        </View>
        {/* Espaco simetrico para alinhar o texto ao centro quando ha brasao */}
        {cabecalho.brasaoUrl && <View style={{ width: 52 }} />}
      </View>

      <Text style={s.tipoDoc}>{payload.tipoDocumento}</Text>

      {/* Metadados */}
      <View style={s.metaTabela}>
        <View style={s.metaLinha}>
          <View style={s.metaCampo}>
            <Text style={s.metaLabel}>Processo:</Text>
            <Text style={s.metaValor}>{payload.numeroProcesso ?? 'Não informado'}</Text>
          </View>
          <View style={s.metaCampo}>
            <Text style={s.metaLabel}>Modalidade:</Text>
            <Text style={s.metaValor}>{payload.modalidade}</Text>
          </View>
          <View style={s.metaCampo}>
            <Text style={s.metaLabel}>Data:</Text>
            <Text style={s.metaValor}>{payload.dataGeracao}</Text>
          </View>
        </View>
        <View style={s.metaLinha}>
          <View style={[s.metaCampo, { flex: 3 }]}>
            <Text style={s.metaLabel}>Objeto:</Text>
            <Text style={s.metaValor}>{payload.objeto}</Text>
          </View>
        </View>
      </View>

      {/* Secoes */}
      {payload.secoes.map((secao, i) => (
        <View key={i} wrap={false}>
          <Text style={s.secaoTitulo}>{secao.titulo}</Text>
          <Text style={s.secaoConteudo}>{secao.conteudo || '(não preenchido)'}</Text>
        </View>
      ))}

      {/* Espaco para assinatura */}
      <View style={s.assinatura}>
        <View style={s.assinaturaLinha} />
        <Text style={s.assinaturaLabel}>Assinatura do Responsável</Text>
        <Text style={s.assinaturaLabel}>
          {cabecalho.nomeSecretaria ?? cabecalho.nomeOrganizacao}
        </Text>
      </View>

      {/* Rodape IA */}
      {payload.rodapeIA && (
        <Text style={s.rodapeIA}>
          Documento gerado com auxílio de inteligência artificial em {payload.dataGeracao}. A revisão e validação do conteúdo são de responsabilidade do agente público signatário, nos termos da Lei 14.133/21.
        </Text>
      )}
    </Page>
  )
}

export async function gerarPdf(payload: PayloadDocumento): Promise<Buffer> {
  const elemento = (
    <Document
      title={payload.tipoDocumento}
      author={payload.cabecalho.nomeOrganizacao}
      subject={payload.objeto}
      creator="LicitaIA"
    >
      <PaginaDoc payload={payload} />
    </Document>
  )

  // renderToBuffer e a API correta para uso server-side (Next.js API routes / Node.js)
  return renderToBuffer(elemento)
}