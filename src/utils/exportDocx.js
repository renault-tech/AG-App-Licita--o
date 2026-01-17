import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Gera documento DOCX do ETP
 * Formata profissionalmente conforme padrões de licitação
 */
export async function generateETPDocument(formData) {
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    // Título Principal
                    new Paragraph({
                        text: 'ESTUDO TÉCNICO PRELIMINAR (ETP)',
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),

                    // Seção 1: Identificação
                    createSectionHeader('1. IDENTIFICAÇÃO'),
                    createParagraph(`Secretaria Requisitante: ${formData.secretariaRequisitante}`),
                    createParagraph(`Responsável pela Elaboração: ${formData.responsavelElaboracao}`),

                    // Seção 2: Dados do Processo
                    createSectionHeader('2. DADOS DO PROCESSO'),
                    createParagraph(formData.descricaoNecessidade),

                    // Seção 3: Requisitos
                    createSectionHeader('3. REQUISITOS DA CONTRATAÇÃO'),
                    createParagraph(`Subcontratação: ${formData.subcontratacao}`),
                    ...(formData.subcontratacao === 'Pode Subcontratar' ? [
                        createParagraph(`Percentual Permitido: ${formData.percentualSubcontratacao}%`)
                    ] : []),
                    createParagraph(`Sustentabilidade: ${formData.sustentabilidade || 'Não há critérios de sustentabilidade para esta contratação/ata.'}`),
                    createParagraph(`Garantia: ${formData.garantia}`),
                    createParagraph(`Vedação de Marca: ${formData.vedacaoMarca}`),
                    ...(formData.vedacaoMarca === 'Sim' ? [
                        createParagraph(`Justificativa: ${formData.justificativaVedacao}`)
                    ] : []),

                    // Seção 4: Alternativas
                    createSectionHeader('4. ALTERNATIVAS CONSIDERADAS'),
                    createSubHeader('Opção 1:'),
                    createParagraph(formData.alternativa1),
                    ...(formData.alternativa2 ? [
                        createSubHeader('Opção 2:'),
                        createParagraph(formData.alternativa2)
                    ] : []),
                    ...(formData.alternativa3 ? [
                        createSubHeader('Opção 3:'),
                        createParagraph(formData.alternativa3)
                    ] : []),
                    createSubHeader('Conclusão:'),
                    createParagraph(formData.conclusaoAlternativa),

                    // Seção 5: Descrição da Solução
                    createSectionHeader('5. DESCRIÇÃO DA SOLUÇÃO'),
                    createParagraph(formData.descricaoSolucao),

                    // Seção 6: Modalidade
                    createSectionHeader('6. ESTIMATIVA DE QUANTIDADES E MODALIDADE'),
                    createParagraph(`Modalidade: ${formData.modalidade}`),
                    ...(formData.modalidade !== 'Pregão Eletrônico' ? [
                        createParagraph(`Justificativa: ${formData.justificativaModalidade}`)
                    ] : []),
                    createParagraph(`Procedimento Auxiliar: ${formData.procedimentoAuxiliar}`),
                    createParagraph(`Tipo de Julgamento: ${formData.tipoJulgamento}`),
                    createParagraph(`Forma de Julgamento: ${formData.formaJulgamento}`),
                    ...(formData.formaJulgamento === 'Por Lote' ? [
                        createParagraph(`Justificativa do Loteamento: ${formData.justificativaLoteamento}`)
                    ] : []),

                    // Seção 7: Valores
                    createSectionHeader('7. ESTIMATIVA DE VALORES'),
                    createParagraph(`Método de Precificação: ${formData.metodoPrecificacao}`),
                    createParagraph(`Valor Total Estimado: R$ ${formData.valorTotal}`),

                    // Seção 8: Resultados
                    createSectionHeader('8. RESULTADOS PRETENDIDOS'),
                    createParagraph(formData.resultadosPretendidos),

                    // Seção 9: Providências
                    createSectionHeader('9. PROVIDÊNCIAS'),
                    createParagraph(formData.descricaoProvidencias),

                    // Seção 10: Correlatas
                    createSectionHeader('10. CONTRATAÇÕES CORRELATAS'),
                    ...(formData.contratacoesCorrelatas === 'Sim' ? [
                        createParagraph(formData.descricaoCorrelatas)
                    ] : [
                        createParagraph('Não há contratações correlatas.')
                    ]),

                    // Seção 11: Impactos
                    createSectionHeader('11. IMPACTOS AMBIENTAIS'),
                    ...(formData.impactosAmbientais === 'Sim' ? [
                        createParagraph(formData.descricaoImpactos)
                    ] : [
                        createParagraph('Não há impactos ambientais significativos.')
                    ]),

                    // Seção 12: Viabilidade
                    createSectionHeader('12. VIABILIDADE'),
                    createParagraph(formData.viabilidade),

                    // Seção 13: Riscos
                    createSectionHeader('13. ANÁLISE DE RISCO'),
                    createParagraph(formData.conclusaoRisco),
                ],
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `ETP_${Date.now()}.docx`);
}

// Funções auxiliares
function createSectionHeader(text) {
    return new Paragraph({
        text,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 },
    });
}

function createSubHeader(text) {
    return new Paragraph({
        text,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
    });
}

function createParagraph(text) {
    return new Paragraph({
        text,
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 },
    });
}

export default generateETPDocument;
