import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import useETPStore from '../../store/etpStore';
import FormDropdown from '../forms/FormDropdown';
import FormNumber from '../forms/FormNumber';
import FormInput from '../forms/FormInput';
import FormTextArea from '../forms/FormTextArea';

/**
 * Seção 3: Requisitos da Contratação
 * Define requisitos como subcontratação, sustentabilidade, garantia e vedação de marca
 */
function Section03_Requisitos() {
    const { formData, updateField, updateMultipleFields, nextSection, previousSection, validateSection } = useETPStore();

    const handleNext = () => {
        if (validateSection(3)) {
            nextSection();
        }
    };

    return (
        <div className="card">
            {/* Header da Seção */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <ClipboardList className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 3: Requisitos da Contratação
                        </h2>
                        <p className="text-gray-600">
                            Especificações e requisitos necessários
                        </p>
                    </div>
                </div>

                {/* Card informativo */}
                <div className="bg-blue-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="text-sm text-gray-700">
                        <strong>Orientação:</strong> Os requisitos da contratação tratam-se da descrição
                        dos requisitos necessários e suficientes para escolha da solução - o que é essencial
                        para suprir a necessidade da unidade que está contratando?
                    </p>
                </div>
            </div>

            {/* Formulário */}
            <div className="space-y-6">
                {/* Subcontratação */}
                <FormDropdown
                    label="Subcontratação"
                    value={formData.subcontratacao}
                    onChange={(value) => {
                        updateField('subcontratacao', value);
                        if (value === 'Não Pode Subcontratar') {
                            updateField('percentualSubcontratacao', '');
                        }
                    }}
                    options={['Não Pode Subcontratar', 'Pode Subcontratar']}
                    tooltip="Defina se a contratada poderá subcontratar parcialmente os serviços"
                />

                {/* Percentual de Subcontratação (Condicional) */}
                {formData.subcontratacao === 'Pode Subcontratar' && (
                    <FormNumber
                        label="Percentual Permitido para Subcontratação"
                        value={formData.percentualSubcontratacao}
                        onChange={(value) => updateField('percentualSubcontratacao', value)}
                        required={true}
                        tooltip="Informe o percentual máximo que poderá ser subcontratado"
                        placeholder="Ex: 30"
                        min={1}
                        max={100}
                    />
                )}

                {/* Sustentabilidade */}
                <div className="space-y-1">
                    <FormTextArea
                        label="Critérios de Sustentabilidade"
                        value={formData.sustentabilidade}
                        onChange={(value) => updateField('sustentabilidade', value)}
                        tooltip="Descreva critérios de sustentabilidade aplicáveis"
                        placeholder="Deixe em branco para usar o texto padrão..."
                        rows={4}
                    />
                    <p className="text-xs text-gray-500 ml-1">
                        * Os requisitos da contratação descrevem o que é essencial e suficiente para suprir a necessidade da unidade.
                    </p>
                </div>

                {/* Garantia */}
                <FormInput
                    label="Garantia"
                    value={formData.garantia}
                    onChange={(value) => updateField('garantia', value)}
                    required={true}
                    tooltip="Especifique o tipo e prazo de garantia exigido"
                    placeholder="Ex: Garantia de 12 meses contra defeitos de fabricação"
                />

                {/* Vedação de Marca */}
                <FormDropdown
                    label="Vedação de Marca"
                    value={formData.vedacaoMarca}
                    onChange={(value) => {
                        updateField('vedacaoMarca', value);
                        if (value === 'Não') {
                            updateField('justificativaVedacao', '');
                        }
                    }}
                    options={['Não', 'Sim']}
                    tooltip="Indica se haverá vedação de marca específica na contratação"
                />

                {/* Justificativa da Vedação (Condicional) */}
                {formData.vedacaoMarca === 'Sim' && (
                    <FormTextArea
                        label="Justificativa da Vedação de Marca"
                        value={formData.justificativaVedacao}
                        onChange={(value) => updateField('justificativaVedacao', value)}
                        required={true}
                        tooltip="Justifique tecnicamente a necessidade de vedação de marca"
                        placeholder="Explique os motivos técnicos que justificam a vedação de marca..."
                        rows={4}
                    />
                )}
            </div>

            {/* Botões de navegação */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                    onClick={previousSection}
                    className="btn-secondary flex items-center gap-2"
                >
                    <ChevronLeft className="w-5 h-5" />
                    Seção Anterior
                </button>
                <button
                    onClick={handleNext}
                    className="btn-primary flex items-center gap-2"
                >
                    Próxima Seção
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

export default Section03_Requisitos;
