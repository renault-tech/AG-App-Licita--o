import React from 'react'
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
  Svg, Path, Circle, G,
} from '@react-pdf/renderer'
import type { PayloadDocumento } from './tipos'

// ─── Paleta Cataguases ──────────────────────────────────────────────────────
const AZUL     = '#06007D'
const BRANCO   = '#FFFFFF'
const AGUA     = '#C9A0A0'   // rosa queimado da marca d'agua
const AGUA2    = '#F1E8CB'   // amarelo claro interno
const TINTA    = '#1e293b'
const CINZA    = '#5a6a7e'
const VERDE_IA = '#166534'

// ─── Dimensoes A4 (pontos) ──────────────────────────────────────────────────
const PW = 595
const PH = 842
const ML = 52    // margem lateral
const HH = 72    // altura da faixa do cabecalho (lado esquerdo)
const FH = 54    // altura do rodape
const FY = PH - FH   // y de inicio do rodape = 788

// ─── SVG: Faixa do cabecalho ────────────────────────────────────────────────
// Faixa azul superior com base curva:
// - Lado direito: y=50 (mais alto)
// - Curva com pontos de controle
// - Lado esquerdo: y=72 (mais baixo)
const P_HEADER = [
  `M 0 0`,
  `H ${PW}`,
  `V 50`,
  `C ${PW * 0.62} ${HH + 8} ${PW * 0.38} ${HH + 8} 0 ${HH}`,
  `Z`,
].join(' ')

// ─── SVG: Faixa do rodape ───────────────────────────────────────────────────
// Curva suave na borda superior
const P_FOOTER = [
  `M 0 ${FY}`,
  `Q ${PW / 2} ${FY - 7} ${PW} ${FY}`,
  `V ${PH}`,
  `H 0`,
  `Z`,
].join(' ')

// ─── SVG: Marca d'agua (brasao estilizado de Cataguases) ────────────────────
// Centro horizontal levemente para a direita
const WCX  = 398
const WT   = 192   // topo do triangulo
const WB   = 605   // base do triangulo
const WHW  = 182   // meia-largura da base

// Triangulo externo
const P_TRI_OUT = `M ${WCX} ${WT} L ${WCX + WHW} ${WB} L ${WCX - WHW} ${WB} Z`

// Triangulo interno (cria profundidade)
const P_TRI_IN = [
  `M ${WCX} ${WT + 28}`,
  `L ${WCX + WHW * 0.68} ${WB - 22}`,
  `L ${WCX - WHW * 0.68} ${WB - 22}`,
  `Z`,
].join(' ')

// Engrenagem: estrela de 12 dentes (star polygon)
function buildGear(
  cx: number, cy: number,
  outerR: number, innerR: number,
  teeth: number
): string {
  const total = teeth * 2
  const segs: string[] = []
  for (let i = 0; i < total; i++) {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2
    const r     = i % 2 === 0 ? outerR : innerR
    const x     = (cx + r * Math.cos(angle)).toFixed(2)
    const y     = (cy + r * Math.sin(angle)).toFixed(2)
    segs.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`)
  }
  return segs.join(' ') + ' Z'
}

const GEAR_CY  = 462
const P_GEAR   = buildGear(WCX, GEAR_CY, 64, 49, 12)

// Coroa estilizada (3 pontas) no topo do triangulo
const CRY = WT + 32
const P_CROWN = [
  `M ${WCX - 44} ${CRY + 22}`,
  `L ${WCX - 44} ${CRY + 8}`,
  `L ${WCX - 24} ${CRY + 2}`,
  `L ${WCX - 24} ${CRY - 13}`,
  `L ${WCX}      ${CRY - 24}`,
  `L ${WCX + 24} ${CRY - 13}`,
  `L ${WCX + 24} ${CRY + 2}`,
  `L ${WCX + 44} ${CRY + 8}`,
  `L ${WCX + 44} ${CRY + 22}`,
  `Z`,
].join(' ')

// Folhas simetricos na base do triangulo
const LY = WB - 32
const P_LEAF_L = [
  `M ${WCX - 30} ${LY}`,
  `Q ${WCX - 80} ${LY - 35} ${WCX - 60} ${LY - 65}`,
  `Q ${WCX - 20} ${LY - 30} ${WCX - 30} ${LY}`,
  `Z`,
].join(' ')
const P_LEAF_R = [
  `M ${WCX + 30} ${LY}`,
  `Q ${WCX + 80} ${LY - 35} ${WCX + 60} ${LY - 65}`,
  `Q ${WCX + 20} ${LY - 30} ${WCX + 30} ${LY}`,
  `Z`,
].join(' ')

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
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

  // Cabecalho: conteudo sobreposto na faixa azul
  hdrWrap: {
    position:      'absolute',
    top:           0,
    left:          ML,
    right:         ML,
    height:        HH - 6,
    flexDirection: 'row',
    alignItems:    'center',
  },
  hdrBrasao: {
    width:     46,
    height:    46,
    objectFit: 'contain',
  },
  hdrDivider: {
    width:           1,
    height:          36,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginLeft:      12,
    marginRight:     12,
  },
  hdrOrg: {
    color:          BRANCO,
    fontFamily:     'Helvetica-Bold',
    fontSize:       11,
    letterSpacing:  0.9,
  },
  hdrSec: {
    color:         BRANCO,
    fontSize:      8.5,
    marginTop:     3,
    letterSpacing: 0.3,
    opacity:       0.88,
  },

  // Rodape: conteudo sobreposto na faixa azul inferior
  ftrWrap: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          FH,
    alignItems:      'center',
    justifyContent:  'center',
  },
  ftrText: {
    color:       BRANCO,
    fontSize:    7.5,
    textAlign:   'center',
    lineHeight:  1.6,
  },
  ftrPage: {
    color:      BRANCO,
    fontSize:   7,
    textAlign:  'center',
    opacity:    0.65,
    marginTop:  2,
  },

  // Corpo do documento
  tipoDoc: {
    fontFamily:      'Helvetica-Bold',
    fontSize:        11.5,
    color:           AZUL,
    textAlign:       'center',
    textTransform:   'uppercase',
    letterSpacing:   1.4,
    paddingBottom:   7,
    borderBottomWidth: 1.5,
    borderBottomColor: AZUL,
    borderBottomStyle: 'solid',
    marginBottom:    0,
  },
  metaBox: {
    backgroundColor: '#f0f4fa',
    borderRadius:    3,
    padding:         9,
    marginTop:       13,
    marginBottom:    18,
    borderLeftWidth: 3,
    borderLeftColor: AZUL,
    borderLeftStyle: 'solid',
  },
  metaRow: {
    flexDirection: 'row',
    gap:           14,
    marginBottom:  3,
  },
  metaField: {
    flexDirection: 'row',
    gap:           4,
    flex:          1,
  },
  metaLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize:   8.5,
    color:      AZUL,
  },
  metaValor: {
    fontSize: 8.5,
    color:    '#334155',
    flex:     1,
  },
  secTitulo: {
    fontFamily:        'Helvetica-Bold',
    fontSize:          9.5,
    color:             AZUL,
    textTransform:     'uppercase',
    letterSpacing:     0.7,
    marginTop:         16,
    marginBottom:      5,
    paddingBottom:     3,
    paddingLeft:       6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#c7d2e2',
    borderBottomStyle: 'solid',
    borderLeftWidth:   2.5,
    borderLeftColor:   AZUL,
    borderLeftStyle:   'solid',
  },
  secConteudo: {
    fontSize:   9.8,
    lineHeight: 1.65,
    textAlign:  'justify',
    color:      TINTA,
  },
  assinaturaWrap: {
    marginTop:  52,
    alignItems: 'center',
    gap:        3,
  },
  assinaturaLinha: {
    width:             260,
    borderBottomWidth: 0.8,
    borderBottomColor: '#64748b',
    borderBottomStyle: 'solid',
    marginBottom:      5,
  },
  assinaturaLabel: {
    fontFamily: 'Helvetica',
    fontSize:   8.5,
    color:      CINZA,
    textAlign:  'center',
  },
  rodapeIA: {
    marginTop:       28,
    padding:         8,
    borderWidth:     0.5,
    borderColor:     '#bbf7d0',
    borderStyle:     'solid',
    borderRadius:    2,
    backgroundColor: '#f0fdf4',
    fontSize:        7.5,
    color:           VERDE_IA,
    lineHeight:      1.55,
  },
  minuta: {
    position:   'absolute',
    top:        '38%',
    left:       0,
    right:      0,
    textAlign:  'center',
    fontSize:   88,
    color:      '#dde3ee',
    opacity:    0.16,
    fontFamily: 'Helvetica-Bold',
    transform:  'rotate(-38deg)',
  },
})

// ─── Componentes ─────────────────────────────────────────────────────────────

// Camada SVG de fundo: faixas + marca d'agua
function Background() {
  return (
    <View fixed style={{ position: 'absolute', top: 0, left: 0 }}>
      <Svg width={PW} height={PH}>
        {/* Faixa superior curva */}
        <Path d={P_HEADER} fill={AZUL} />

        {/* Faixa inferior curva */}
        <Path d={P_FOOTER} fill={AZUL} />

        {/* Marca d'agua: brasao estilizado de Cataguases */}
        <G opacity={0.075}>
          {/* Triangulo externo */}
          <Path d={P_TRI_OUT} fill={AGUA} />
          {/* Triangulo interno (cria area branca interna) */}
          <Path d={P_TRI_IN}  fill={BRANCO} />
          {/* Engrenagem */}
          <Path d={P_GEAR}    fill={AGUA} />
          {/* Centro da engrenagem: anel branco + nucleo */}
          <Circle cx={WCX} cy={GEAR_CY} r={31} fill={BRANCO} />
          <Circle cx={WCX} cy={GEAR_CY} r={11} fill={AGUA} />
          {/* Coroa */}
          <Path d={P_CROWN} fill={AGUA} />
          {/* Folhas */}
          <Path d={P_LEAF_L} fill={AGUA2} />
          <Path d={P_LEAF_R} fill={AGUA2} />
        </G>
      </Svg>
    </View>
  )
}

// Conteudo sobreposto na faixa do cabecalho
function HeaderContent({
  brasaoUrl,
  nomeOrg,
  nomeSecretaria,
}: {
  brasaoUrl:      string | null
  nomeOrg:        string
  nomeSecretaria: string | null
}) {
  return (
    <View fixed style={s.hdrWrap}>
      {brasaoUrl && (
        <Image src={brasaoUrl} style={s.hdrBrasao} />
      )}
      <View style={s.hdrDivider} />
      <View style={{ flex: 1 }}>
        <Text style={s.hdrOrg}>{nomeOrg.toUpperCase()}</Text>
        {nomeSecretaria && (
          <Text style={s.hdrSec}>{nomeSecretaria.toUpperCase()}</Text>
        )}
      </View>
    </View>
  )
}

// Conteudo sobreposto na faixa do rodape
function FooterContent({
  endereco,
  telefone,
  email,
}: {
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
    <View fixed style={s.ftrWrap}>
      {linhas.map((linha, i) => (
        <Text key={i} style={s.ftrText}>{linha}</Text>
      ))}
      <Text
        style={s.ftrPage}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
        fixed
      />
    </View>
  )
}

// Pagina completa do documento
function PaginaDoc({ payload }: { payload: PayloadDocumento }) {
  const { cabecalho } = payload
  const isMinuta = !['assinado', 'publicado'].includes(payload.statusDocumento ?? '')

  return (
    <Page size="A4" style={s.page}>
      {/* Faixas azuis + marca d'agua (fixa em todas as paginas) */}
      <Background />

      {/* Conteudo do cabecalho sobre a faixa azul */}
      <HeaderContent
        brasaoUrl={cabecalho.brasaoUrl}
        nomeOrg={cabecalho.nomeOrganizacao}
        nomeSecretaria={cabecalho.nomeSecretaria}
      />

      {/* Conteudo do rodape sobre a faixa azul */}
      <FooterContent
        endereco={cabecalho.endereco}
        telefone={cabecalho.telefone}
        email={cabecalho.email}
      />

      {/* Marca d'agua MINUTA enquanto nao assinado */}
      {isMinuta && (
        <Text style={s.minuta} fixed>MINUTA</Text>
      )}

      {/* Titulo do tipo de documento */}
      <Text style={s.tipoDoc}>{payload.tipoDocumento}</Text>

      {/* Caixa de metadados */}
      <View style={s.metaBox}>
        <View style={s.metaRow}>
          <View style={s.metaField}>
            <Text style={s.metaLabel}>Processo:</Text>
            <Text style={s.metaValor}>{payload.numeroProcesso ?? 'Não informado'}</Text>
          </View>
          <View style={s.metaField}>
            <Text style={s.metaLabel}>Modalidade:</Text>
            <Text style={s.metaValor}>{payload.modalidade}</Text>
          </View>
          <View style={s.metaField}>
            <Text style={s.metaLabel}>Data:</Text>
            <Text style={s.metaValor}>{payload.dataGeracao}</Text>
          </View>
        </View>
        <View style={s.metaRow}>
          <View style={[s.metaField, { flex: 3 }]}>
            <Text style={s.metaLabel}>Objeto:</Text>
            <Text style={s.metaValor}>{payload.objeto}</Text>
          </View>
        </View>
      </View>

      {/* Secoes do documento */}
      {payload.secoes.map((secao, i) => (
        <View key={i} wrap={false}>
          <Text style={s.secTitulo}>{secao.titulo}</Text>
          <Text style={s.secConteudo}>{secao.conteudo || '(não preenchido)'}</Text>
        </View>
      ))}

      {/* Bloco de assinatura */}
      <View style={s.assinaturaWrap}>
        <View style={s.assinaturaLinha} />
        <Text style={s.assinaturaLabel}>Assinatura do Responsável</Text>
        <Text style={s.assinaturaLabel}>
          {cabecalho.nomeSecretaria ?? cabecalho.nomeOrganizacao}
        </Text>
      </View>

      {/* Aviso de geracao por IA (obrigatorio por guardrail juridico - CLAUDE.md) */}
      {payload.rodapeIA && (
        <Text style={s.rodapeIA}>
          {'Documento gerado com auxílio de inteligência artificial em '}
          {payload.dataGeracao}
          {'. A revisão e validação do conteúdo são de responsabilidade do agente público signatário, nos termos da Lei 14.133/21.'}
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
