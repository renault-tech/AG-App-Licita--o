import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import useETPStore from '../../store/etpStore';
import FormTextArea from '../forms/FormTextArea';

/**
 * Seção 2: Dados do Processo
 * Descrição da necessidade da contratação
 */
function Section02_DadosProcesso() {
    const { formData, updateField, nextSection, previousSection, validateSection } = useETPStore();

    const handleNext = () => {
        if (validateSection(2)) {
            nextSection();
        }
    };

    return (
        <div className="card">
            {/* Header da Seção */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <FileText className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 2: Dados do Processo
                        </h2>
                        <p className="text-gray-600">
                            Descrição da necessidade da contratação
                        </p>
                    </div>
                </div>

                {/* Card informativo */}
                <div className="bg-blue-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="text-sm text-gray-700">
                        <strong>Orientação:</strong> Descreva de forma clara e objetiva qual é a
                        necessidade que motivou esta contratação. Explique o problema ou demanda que
                        será atendida e sua importância para a administração pública.
                    </p>
                </div>
            </div>

            {/* Formulário */}
            <div className="space-y-6">
                <FormTextArea
                    label="Descrição da Necessidade"
                    value={formData.descricaoNecessidade}
                    onChange={(value) => updateField('descricaoNecessidade', value)}
                    required={true}
                    tooltip="Descreva detalhadamente a necessidade que justifica esta contratação"
                    placeholder="Descreva qual necessidade será atendida com esta contratação, sua relevância e impacto..."
                    rows={6}
                    enableAI={true}
                    aiContext="Descrição da necessidade de contratação em documento ETP"
                />
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

export default Section02_DadosProcesso;
