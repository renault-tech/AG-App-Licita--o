import { ChevronRight, Info } from 'lucide-react';
import useETPStore from '../../store/etpStore';
import FormInput from '../forms/FormInput';

/**
 * Seção 1: Identificação
 * Campos básicos de identificação do ETP
 */
function Section01_Identificacao() {
    const { formData, updateField, nextSection, validateSection } = useETPStore();

    const handleNext = () => {
        if (validateSection(1)) {
            nextSection();
        }
    };

    return (
        <div className="card">
            {/* Header da Seção */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <Info className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 1: Identificação
                        </h2>
                        <p className="text-gray-600">
                            Informações básicas da contratação
                        </p>
                    </div>
                </div>

                {/* Card informativo */}
                <div className="bg-blue-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="text-sm text-gray-700">
                        <strong>Orientação:</strong> Preencha os campos abaixo com as informações
                        básicas da contratação. A secretaria requisitante é o órgão solicitante e o
                        responsável pela elaboração é o servidor que está criando este ETP.
                    </p>
                </div>
            </div>

            {/* Formulário */}
            <div className="space-y-6">
                <FormInput
                    label="Secretaria Requisitante"
                    value={formData.secretariaRequisitante}
                    onChange={(value) => updateField('secretariaRequisitante', value)}
                    required={true}
                    tooltip="Nome completo da secretaria ou órgão que está solicitando a contratação"
                    placeholder="Ex: Secretaria Municipal de Saúde"
                />

                <FormInput
                    label="Responsável pela Elaboração"
                    value={formData.responsavelElaboracao}
                    onChange={(value) => updateField('responsavelElaboracao', value)}
                    required={true}
                    tooltip="Nome completo do servidor responsável pela elaboração deste ETP"
                    placeholder="Ex: João Silva - Matrícula 12345"
                />
            </div>

            {/* Botões de navegação */}
            <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
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

export default Section01_Identificacao;
