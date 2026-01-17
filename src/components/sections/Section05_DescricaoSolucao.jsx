import { ChevronLeft, ChevronRight, FileSignature, Lightbulb } from 'lucide-react';
import { useEffect } from 'react';
import useETPStore from '../../store/etpStore';
import FormTextArea from '../forms/FormTextArea';

/**
 * Seção 5: Descrição da Solução
 * Auto-fill baseado na modalidade selecionada na Seção 6
 */
function Section05_DescricaoSolucao() {
    const { formData, updateField, nextSection, previousSection, validateSection } = useETPStore();

    // Auto-fill lógico baseado na Seção 6
    useEffect(() => {
        if (
            formData.modalidade === 'Pregão Eletrônico' &&
            formData.procedimentoAuxiliar === 'Registro de Preço' &&
            formData.descricaoSolucao === ''
        ) {
            const textoAutomatico = `Opta-se pela contratação (inserir o nome do objeto) na modalidade Pregão Eletrônico, pretendendo de forma integrada, gerar resultados que atendam às necessidades definidas nos DFD's apresentados por cada área requisitante, os quais podemos enumerar: a do objeto pretendido dentro do prazo estipulado, disponibilização de todos os serviços nas quantidades estimadas e qualidade exigida e prevista, adoção de boas práticas de sustentabilidade por parte da contratada e atendimento dos requisitos com eficiência de modo a não provocar atrasos ou impedimentos na realização dos serviços públicos em cada setor da Prefeitura Municipal ou prejuízos à Administração Pública Municipal. O Pregão Eletrônico promove a ampla participação de fornecedores, permitindo um maior número de propostas e, consequentemente, aumentando a competitividade. Essa ampla concorrência tende a resultar em melhores preços e condições para a Administração Pública.`;

            updateField('descricaoSolucao', textoAutomatico);
        }
    }, [formData.modalidade, formData.procedimentoAuxiliar]);

    const handleNext = () => {
        if (validateSection(5)) {
            nextSection();
        }
    };

    return (
        <div className="card">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <FileSignature className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 5: Descrição da Solução
                        </h2>
                        <p className="text-gray-600">
                            Detalhamento da solução escolhida
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="text-sm text-gray-700">
                        <strong>Orientação:</strong> Descreva a solução escolhida de forma detalhada.
                        Se você selecionou "Pregão Eletrônico" com "Registro de Preços" na Seção 6,
                        um texto padrão será preenchido automaticamente, mas você pode editá-lo conforme necessário.
                    </p>
                </div>

                {/* Alerta de auto-fill */}
                {formData.modalidade === 'Pregão Eletrônico' && formData.procedimentoAuxiliar === 'Registro de Preço' && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg mt-4 flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-800">
                            <strong>Texto Automático:</strong> Como você selecionou "Pregão Eletrônico" + "Registro de Preços",
                            um texto padrão foi inserido. Você pode editá-lo livremente.
                        </p>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <FormTextArea
                    label="Descrição Detalhada da Solução"
                    value={formData.descricaoSolucao}
                    onChange={(value) => updateField('descricaoSolucao', value)}
                    required={true}
                    tooltip="Descreva em detalhes a solução que será adotada"
                    placeholder="Descreva a solução escolhida..."
                    rows={8}
                />
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button onClick={previousSection} className="btn-secondary flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5" />
                    Seção Anterior
                </button>
                <button onClick={handleNext} className="btn-primary flex items-center gap-2">
                    Próxima Seção
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

export default Section05_DescricaoSolucao;
