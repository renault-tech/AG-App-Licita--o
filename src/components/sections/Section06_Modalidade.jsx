import { ChevronLeft, ChevronRight, Scale } from 'lucide-react';
import useETPStore from '../../store/etpStore';
import FormDropdown from '../forms/FormDropdown';
import FormTextArea from '../forms/FormTextArea';

/**
 * Seção 6: Estimativa de Quantidades e Modalidade
 * Definição de modalidade, procedimento, tipo e forma de julgamento
 */
function Section06_Modalidade() {
    const { formData, updateField, nextSection, previousSection, validateSection } = useETPStore();

    const handleNext = () => {
        if (validateSection(6)) {
            nextSection();
        }
    };

    return (
        <div className="card">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <Scale className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 6: Estimativa de Quantidades e Modalidade
                        </h2>
                        <p className="text-gray-600">
                            Definição da modalidade licitatória e quantitativos
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Estimativa das Quantidades */}
                <FormTextArea
                    label="Estimativa das Quantidades"
                    value={formData.estimativaQuantidades}
                    onChange={(value) => updateField('estimativaQuantidades', value)}
                    required={true}
                    tooltip="Informe os parâmetros utilizados para a estimativa de quantidades"
                    placeholder="Descreva a estimativa de quantidades..."
                    rows={6}
                />

                <div className="border-t border-gray-100 pt-6"></div>

                {/* Modalidade */}
                <FormDropdown
                    label="Modalidade"
                    value={formData.modalidade}
                    onChange={(value) => {
                        updateField('modalidade', value);
                        if (value === 'Pregão Eletrônico') {
                            updateField('justificativaModalidade', '');
                        }
                    }}
                    options={['Pregão Eletrônico', 'Concorrência', 'Dispensa', 'Inexigibilidade']}
                    tooltip="Selecione a modalidade de licitação aplicável"
                />

                {/* Justificativa da Modalidade (Condicional) */}
                {formData.modalidade !== 'Pregão Eletrônico' && (
                    <FormTextArea
                        label="Justificativa da Modalidade"
                        value={formData.justificativaModalidade}
                        onChange={(value) => updateField('justificativaModalidade', value)}
                        required={true}
                        tooltip="Justifique a escolha desta modalidade"
                        placeholder="Explique por que esta modalidade foi escolhida..."
                        rows={4}
                    />
                )}

                {/* Procedimento Auxiliar */}
                <FormDropdown
                    label="Procedimento Auxiliar"
                    value={formData.procedimentoAuxiliar}
                    onChange={(value) => updateField('procedimentoAuxiliar', value)}
                    options={['Registro de Preço', 'Credenciamento', 'Chamamento Público']}
                    tooltip="Selecione o procedimento auxiliar aplicável"
                />

                {/* Tipo de Julgamento */}
                <FormDropdown
                    label="Tipo (Julgamento)"
                    value={formData.tipoJulgamento}
                    onChange={(value) => updateField('tipoJulgamento', value)}
                    options={['Menor Preço', 'Maior Desconto', 'Técnica e Preço', 'Melhor Técnica', 'Maior Retorno Econômico']}
                    tooltip="Selecione o critério de julgamento"
                />

                {/* Forma de Julgamento */}
                <FormDropdown
                    label="Forma (Julgamento)"
                    value={formData.formaJulgamento}
                    onChange={(value) => {
                        updateField('formaJulgamento', value);
                        if (value !== 'Por Lote') {
                            updateField('justificativaLoteamento', '');
                        }
                    }}
                    options={['Por Item', 'Por Lote', 'Global']}
                    tooltip="Selecione a forma de julgamento"
                />

                {/* Justificativa do Loteamento (Condicional) */}
                {formData.formaJulgamento === 'Por Lote' && (
                    <FormTextArea
                        label="Justificativa do Loteamento"
                        value={formData.justificativaLoteamento}
                        onChange={(value) => updateField('justificativaLoteamento', value)}
                        required={true}
                        tooltip="Justifique a divisão em lotes"
                        placeholder="Explique os critérios para divisão em lotes..."
                        rows={4}
                    />
                )}
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

export default Section06_Modalidade;
