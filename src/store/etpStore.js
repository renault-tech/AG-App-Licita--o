import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Store Zustand para gerenciar o estado do formulário ETP
 * Implementa persistência no localStorage
 */
const useETPStore = create(
    persist(
        (set, get) => ({
            // Estado inicial de todas as seções
            currentSection: 1,
            formData: {
                // Seção 1: Identificação
                secretariaRequisitante: '',
                responsavelElaboracao: '',

                // Seção 2: Dados do Processo
                descricaoNecessidade: '',

                // Seção 3: Requisitos da Contratação
                subcontratacao: 'Não Pode Subcontratar',
                percentualSubcontratacao: '',
                sustentabilidade: '',
                garantia: '',
                vedacaoMarca: 'Não',
                justificativaVedacao: '',

                // Seção 4: Alternativas Consideradas
                alternativa1: '',
                alternativa2: '',
                alternativa3: '',
                conclusaoAlternativa: '',

                // Seção 5: Descrição da Solução
                descricaoSolucao: '',

                // Seção 6: Estimativa das Quantidades e Modalidade
                modalidade: 'Pregão Eletrônico',
                justificativaModalidade: '',
                procedimentoAuxiliar: 'Registro de Preço',
                tipoJulgamento: 'Menor Preço',
                formaJulgamento: 'Por Item',
                justificativaLoteamento: '',

                // Seção 7: Estimativa de Valores
                metodoPrecificacao: 'Média Aritmética',
                valorTotal: '',

                // Seção 8: Resultados Pretendidos
                resultadosPretendidos: '',

                // Seção 9: Providências
                haProvidencias: false,
                descricaoProvidencias: 'Para esta solução não há necessidade de ajustes de qualquer natureza, a serem adotados pela Administração Pública',

                // Seção 10: Contratações Correlatas
                contratacoesCorrelatas: 'Não',
                descricaoCorrelatas: '',

                // Seção 11: Impactos Ambientais
                impactosAmbientais: 'Não',
                descricaoImpactos: '',

                // Seção 12: Viabilidade
                viabilidade: 'O presente estudo levantou os elementos essenciais que irão compor o Termo de Referência e demonstrou ser viável a contratação demandada, cabendo ressaltar que os riscos envolvidos são administráveis e os custos previstos são compatíveis e se caracterizam pela economicidade',

                // Seção 13: Análise de Risco
                analiseRisco: {},
                conclusaoRisco: '',
            },

            // Estado de validação
            sectionValidation: {
                1: false, 2: false, 3: false, 4: false, 5: false, 6: false,
                7: false, 8: false, 9: false, 10: false, 11: false, 12: false, 13: false
            },

            // Actions
            updateField: (field, value) => set((state) => ({
                formData: { ...state.formData, [field]: value }
            })),

            updateMultipleFields: (fields) => set((state) => ({
                formData: { ...state.formData, ...fields }
            })),

            setCurrentSection: (section) => set({ currentSection: section }),

            nextSection: () => set((state) => ({
                currentSection: Math.min(state.currentSection + 1, 13)
            })),

            previousSection: () => set((state) => ({
                currentSection: Math.max(state.currentSection - 1, 1)
            })),

            validateSection: (sectionNumber) => {
                const { formData } = get();
                let isValid = false;

                switch (sectionNumber) {
                    case 1:
                        isValid = formData.secretariaRequisitante.trim() !== '' &&
                            formData.responsavelElaboracao.trim() !== '';
                        break;
                    case 2:
                        isValid = formData.descricaoNecessidade.trim() !== '';
                        break;
                    case 3:
                        isValid = formData.garantia.trim() !== '';
                        if (formData.subcontratacao === 'Pode Subcontratar') {
                            isValid = isValid && formData.percentualSubcontratacao !== '';
                        }
                        if (formData.vedacaoMarca === 'Sim') {
                            isValid = isValid && formData.justificativaVedacao.trim() !== '';
                        }
                        break;
                    case 4:
                        isValid = formData.alternativa1.trim() !== '' &&
                            formData.conclusaoAlternativa.trim() !== '';
                        break;
                    case 5:
                        isValid = formData.descricaoSolucao.trim() !== '';
                        break;
                    case 6:
                        isValid = true; // Validação básica, todos campos já têm valores default
                        if (formData.modalidade !== 'Pregão Eletrônico') {
                            isValid = formData.justificativaModalidade.trim() !== '';
                        }
                        if (formData.formaJulgamento === 'Por Lote') {
                            isValid = isValid && formData.justificativaLoteamento.trim() !== '';
                        }
                        break;
                    case 7:
                        isValid = formData.valorTotal !== '' && parseFloat(formData.valorTotal) > 0;
                        break;
                    case 8:
                        isValid = formData.resultadosPretendidos.trim() !== '';
                        break;
                    case 9:
                        isValid = formData.descricaoProvidencias.trim() !== '';
                        break;
                    case 10:
                        isValid = true;
                        if (formData.contratacoesCorrelatas === 'Sim') {
                            isValid = formData.descricaoCorrelatas.trim() !== '';
                        }
                        break;
                    case 11:
                        isValid = true;
                        if (formData.impactosAmbientais === 'Sim') {
                            isValid = formData.descricaoImpactos.trim() !== '';
                        }
                        break;
                    case 12:
                        isValid = formData.viabilidade.trim() !== '';
                        break;
                    case 13:
                        isValid = formData.conclusaoRisco.trim() !== '';
                        break;
                    default:
                        isValid = false;
                }

                set((state) => ({
                    sectionValidation: { ...state.sectionValidation, [sectionNumber]: isValid }
                }));

                return isValid;
            },

            resetForm: () => set((state) => ({
                currentSection: 1,
                formData: {
                    secretariaRequisitante: '',
                    responsavelElaboracao: '',
                    descricaoNecessidade: '',
                    subcontratacao: 'Não Pode Subcontratar',
                    percentualSubcontratacao: '',
                    sustentabilidade: '',
                    garantia: '',
                    vedacaoMarca: 'Não',
                    justificativaVedacao: '',
                    alternativa1: '',
                    alternativa2: '',
                    alternativa3: '',
                    conclusaoAlternativa: '',
                    descricaoSolucao: '',
                    modalidade: 'Pregão Eletrônico',
                    justificativaModalidade: '',
                    procedimentoAuxiliar: 'Registro de Preço',
                    tipoJulgamento: 'Menor Preço',
                    formaJulgamento: 'Por Item',
                    justificativaLoteamento: '',
                    metodoPrecificacao: 'Média Aritmética',
                    valorTotal: '',
                    resultadosPretendidos: '',
                    haProvidencias: false,
                    descricaoProvidencias: 'Para esta solução não há necessidade de ajustes de qualquer natureza, a serem adotados pela Administração Pública',
                    contratacoesCorrelatas: 'Não',
                    descricaoCorrelatas: '',
                    impactosAmbientais: 'Não',
                    descricaoImpactos: '',
                    viabilidade: 'O presente estudo levantou os elementos essenciais que irão compor o Termo de Referência e demonstrou ser viável a contratação demandada, cabendo ressaltar que os riscos envolvidos são administráveis e os custos previstos são compatíveis e se caracterizam pela economicidade',
                    analiseRisco: {},
                    conclusaoRisco: '',
                },
                sectionValidation: {
                    1: false, 2: false, 3: false, 4: false, 5: false, 6: false,
                    7: false, 8: false, 9: false, 10: false, 11: false, 12: false, 13: false
                }
            })),
        }),
        {
            name: 'etp-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

export default useETPStore;
