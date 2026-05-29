import React from 'react'
import {
  Document, Page, Text, View, Image, renderToBuffer,
  Svg, Path,
} from '@react-pdf/renderer'
import type { PayloadDocumento } from './tipos'

// ─── Cores fixas (neutras, sem marca de prefeitura) ──────────────────────────
const BRANCO   = '#FFFFFF'
const TINTA    = '#1e293b'
const CINZA    = '#5a6a7e'
const VERDE_IA = '#166534'

// ─── Dimensoes A4 (pontos) ──────────────────────────────────────────────────
const PW = 595
const PH = 842
const ML = 52
const HH = 72
const FH = 54
const FY = PH - FH

// ─── Paths SVG das faixas de cabecalho e rodape ──────────────────────────────
const P_HEADER = [
  `M 0 0`,
  `H ${PW}`,
  `V 50`,
  `C ${PW * 0.62} ${HH + 8} ${PW * 0.38} ${HH + 8} 0 ${HH}`,
  `Z`,
].join(' ')

const P_FOOTER = [
  `M 0 ${FY}`,
  `Q ${PW / 2} ${FY - 7} ${PW} ${FY}`,
  `V ${PH}`,
  `H 0`,
  `Z`,
].join(' ')

// ─── Estilos estaticos (layout e tipografia sem cor de marca) ─────────────────
const base = {
  page: {
    backgroundColor: BRANCO,
    fontFamily:      'Helvetica',
    fontSize:        10,
    color:           TINTA,
    paddingTop:      HH + 20,
    paddingBottom:   FH + 14,
    paddingLeft:     ML,
    paddingRight:    ML,
  },
  hdrWrap: {
    position:      'absolute'  as const,
    top:           0,
    left:          ML,
    right:         ML,
    height:        HH - 6,
    flexDirection: 'row'       as const,
    alignItems:    'center'    as const,
  },
  hdrBrasao: {
    width:     46,
    height:    46,
    objectFit: 'contain' as const,
  },
  hdrDivider: {
    width:           1,
    height:          36,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginLeft:      12,
    marginRight:     12,
  },
  hdrOrg: {
    color:         BRANCO,
    fontFamily:    'Helvetica-Bold',
    fontSize:      11,
    letterSpacing: 0.9,
  },
  hdrSec: {
    color:         BRANCO,
    fontSize:      8.5,
    marginTop:     3,
    letterSpacing: 0.3,
    opacity:       0.88,
  },
  ftrWrap: {
    position:       'absolute' as const,
    bottom:         0,
    left:           0,
    right:          0,
    height:         FH,
    alignItems:     'center'   as const,
    justifyContent: 'center'   as const,
  },
  ftrText: {
    color:      BRANCO,
    fontSize:   7.5,
    textAlign:  'center' as const,
    lineHeight: 1.6,
  },
  ftrPage: {
    color:     BRANCO,
    fontSize:  7,
    textAlign: 'center' as const,
    opacity:   0.65,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row' as const,
    gap:           14,
    marginBottom:  3,
  },
  metaField: {
    flexDirection: 'row' as const,
    gap:           4,
    flex:          1,
  },
  metaValor: {
    fontSize: 8.5,
    color:    '#334155',
    flex:     1,
  },
  secConteudo: {
    fontSize:     9.8,
    lineHeight:   1.65,
    textAlign:    'justify' as const,
    color:        TINTA,
    marginBottom: 12,
  },
  assinaturaWrap: {
    marginTop:  52,
    alignItems: 'center' as const,
    gap:        3,
  },
  assinaturaLinha: {
    width:             260,
    borderBottomWidth: 0.8,
    borderBottomColor: '#64748b',
    borderBottomStyle: 'solid' as const,
    marginBottom:      5,
  },
  assinaturaLabel: {
    fontFamily: 'Helvetica' as const,
    fontSize:   8.5,
    color:      CINZA,
    textAlign:  'center' as const,
  },
  rodapeIA: {
    marginTop:       28,
    padding:         8,
    borderWidth:     0.5,
    borderColor:     '#bbf7d0',
    borderStyle:     'solid'   as const,
    borderRadius:    2,
    backgroundColor: '#f0fdf4',
    fontSize:        7.5,
    color:           VERDE_IA,
    lineHeight:      1.55,
  },
  minuta: {
    position:   'absolute'      as const,
    top:        '38%'           as const,
    left:       0,
    right:      0,
    textAlign:  'center'        as const,
    fontSize:   88,
    color:      '#d1d5db',
    opacity:    0.18,
    fontFamily: 'Helvetica-Bold' as const,
    transform:  'rotate(-38deg)',
  },
}

// Estilos que dependem da cor primaria da organizacao
function colorStyles(cor: string) {
  return {
    tipoDoc: {
      fontFamily:        'Helvetica-Bold',
      fontSize:          11.5,
      color:             cor,
      textAlign:         'center'    as const,
      textTransform:     'uppercase' as const,
      letterSpacing:     1.4,
      paddingBottom:     7,
      borderBottomWidth: 1.5,
      borderBottomColor: cor,
      borderBottomStyle: 'solid'     as const,
      marginBottom:      0,
    },
    metaBox: {
      backgroundColor: '#f0f4fa',
      borderRadius:    3,
      padding:         9,
      marginTop:       13,
      marginBottom:    18,
      borderLeftWidth: 3,
      borderLeftColor: cor,
      borderLeftStyle: 'solid' as const,
    },
    metaLabel: {
      fontFamily: 'Helvetica-Bold',
      fontSize:   8.5,
      color:      cor,
    },
    secTitulo: {
      fontFamily:        'Helvetica-Bold',
      fontSize:          9.5,
      color:             cor,
      textTransform:     'uppercase' as const,
      letterSpacing:     0.7,
      marginTop:         16,
      marginBottom:      3,
      paddingBottom:     3,
      paddingLeft:       6,
      borderBottomWidth: 0.5,
      borderBottomColor: '#c7d2e2',
      borderBottomStyle: 'solid'     as const,
      borderLeftWidth:   2.5,
      borderLeftColor:   cor,
      borderLeftStyle:   'solid'     as const,
    },
  }
}

// ─── Componentes ─────────────────────────────────────────────────────────────

// Faixas curvas de cabecalho/rodape + brasao da org como marca d'agua de fundo
function Background({ cor, brasaoUrl }: { cor: string; brasaoUrl: string | null }) {
  return (
    <View fixed style={{ position: 'absolute', top: 0, left: 0 }}>
      <Svg width={PW} height={PH}>
        <Path d={P_HEADER} fill={cor} />
        <Path d={P_FOOTER} fill={cor} />
      </Svg>
      {/* Brasao da org como marca d'agua institucional */}
      {brasaoUrl && (
        <Image
          src={brasaoUrl}
          style={{
            position: 'absolute',
            top:      (PH - 240) / 2,
            left:     (PW - 240) / 2,
            width:    240,
            height:   240,
            opacity:  0.04,
          }}
        />
      )}
    </View>
  )
}

function HeaderContent({ brasaoUrl, nomeOrg, nomeSecretaria }: {
  brasaoUrl:      string | null
  nomeOrg:        string
  nomeSecretaria: string | null
}) {
  return (
    <View fixed style={base.hdrWrap}>
      {brasaoUrl && <Image src={brasaoUrl} style={base.hdrBrasao} />}
      <View style={base.hdrDivider} />
      <View style={{ flex: 1 }}>
        <Text style={base.hdrOrg}>{nomeOrg.toUpperCase()}</Text>
        {nomeSecretaria && <Text style={base.hdrSec}>{nomeSecretaria.toUpperCase()}</Text>}
      </View>
    </View>
  )
}

function FooterContent({ endereco, telefone, email }: {
  endereco: string | null
  telefone: string | null
  email:    string | null
}) {
  const linhas = [
    endereco ? `Endereço: ${endereco}` : null,
    telefone ? `Telefone: ${telefone}` : null,
    email    ? `E-mail: ${email}`      : null,
  ].filter(Boolean) as string[]

  return (
    <View fixed style={base.ftrWrap}>
      {linhas.map((linha, i) => <Text key={i} style={base.ftrText}>{linha}</Text>)}
      <Text
        style={base.ftrPage}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
        fixed
      />
    </View>
  )
}

function PaginaDoc({ payload }: { payload: PayloadDocumento }) {
  const { cabecalho } = payload
  const cor     = cabecalho.corPrimaria
  const cs      = colorStyles(cor)
  const isMinuta = !['assinado', 'publicado'].includes(payload.statusDocumento ?? '')

  return (
    <Page size="A4" style={base.page}>
      {/* Faixas curvas + brasao como fundo (fixo em todas as paginas) */}
      <Background cor={cor} brasaoUrl={cabecalho.brasaoUrl} />

      {/* Conteudo do cabecalho sobre a faixa */}
      <HeaderContent
        brasaoUrl={cabecalho.brasaoUrl}
        nomeOrg={cabecalho.nomeOrganizacao}
        nomeSecretaria={cabecalho.nomeSecretaria}
      />

      {/* Conteudo do rodape sobre a faixa */}
      <FooterContent
        endereco={cabecalho.endereco}
        telefone={cabecalho.telefone}
        email={cabecalho.email}
      />

      {/* Marca d'agua MINUTA enquanto nao assinado/publicado */}
      {isMinuta && <Text style={base.minuta} fixed>MINUTA</Text>}

      {/* Titulo do tipo de documento */}
      <Text style={cs.tipoDoc}>{payload.tipoDocumento}</Text>

      {/* Caixa de metadados do processo */}
      <View style={cs.metaBox}>
        <View style={base.metaRow}>
          <View style={base.metaField}>
            <Text style={cs.metaLabel}>Processo:</Text>
            <Text style={base.metaValor}>{payload.numeroProcesso ?? 'Não informado'}</Text>
          </View>
          <View style={base.metaField}>
            <Text style={cs.metaLabel}>Modalidade:</Text>
            <Text style={base.metaValor}>{payload.modalidade}</Text>
          </View>
          <View style={base.metaField}>
            <Text style={cs.metaLabel}>Data:</Text>
            <Text style={base.metaValor}>{payload.dataGeracao}</Text>
          </View>
        </View>
        <View style={base.metaRow}>
          <View style={[base.metaField, { flex: 3 }]}>
            <Text style={cs.metaLabel}>Objeto:</Text>
            <Text style={base.metaValor}>{payload.objeto}</Text>
          </View>
        </View>
      </View>

      {/* Secoes: titulo nao quebra de pagina, conteudo flui livremente */}
      {payload.secoes.map((secao, i) => (
        <View key={i}>
          {/* wrap={false} apenas no titulo garante que ele nunca fica orfao no fim da pagina */}
          <View wrap={false}>
            <Text style={cs.secTitulo}>{secao.titulo}</Text>
          </View>
          <Text style={base.secConteudo}>{secao.conteudo || '(não preenchido)'}</Text>
        </View>
      ))}

      {/* Bloco de assinatura */}
      <View style={base.assinaturaWrap}>
        <View style={base.assinaturaLinha} />
        <Text style={base.assinaturaLabel}>Assinatura do Responsável</Text>
        <Text style={base.assinaturaLabel}>
          {cabecalho.nomeSecretaria ?? cabecalho.nomeOrganizacao}
        </Text>
      </View>

      {/* Aviso obrigatorio conforme guardrail juridico do CLAUDE.md */}
      {payload.rodapeIA && (
        <Text style={base.rodapeIA}>
          {`Documento gerado com auxílio de inteligência artificial em ${payload.dataGeracao}. A revisão e validação do conteúdo são de responsabilidade do agente público signatário, nos termos da Lei 14.133/21.`}
        </Text>
      )}
    </Page>
  )
}

// ─── Export ──────────────────────────────────────────────────────────────────
export async function gerarPdf(payload: PayloadDocumento): Promise<Awaited<ReturnType<typeof renderToBuffer>>> {
  const doc = (
    <Document
      title={payload.tipoDocumento}
      author={payload.cabecalho.nomeOrganizacao}
      subject={payload.objeto}
      creator="LicitaIA"
    >
      <PaginaDoc payload={payload} />
    </Document>
  )
  return renderToBuffer(doc)
}
