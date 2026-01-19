import { ChevronLeft, ChevronRight, Target } from 'lucide-react';
import useETPStore from '../../store/etpStore';
import FormTextArea from '../forms/FormTextArea';

function Section08_Resultados() {
    const { formData, updateField, nextSection, previousSection, validateSection } = useETPStore();

    const handleNext = () => {
        if (validateSection(8)) {
            nextSection();
        }
    };

    return (
        <div className="card">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <Target className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 8: Resultados Pretendidos
                        </h2>
                        <p className="text-gray-600">
                            Objetivos esperados com a contratação
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="text-sm text-gray-700">
                        <strong>Orientação:</strong> Descreva quais resultados são esperados com esta contratação.
                        Quais benefícios ela trará para a administração pública?
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <FormTextArea
                    label="Resultados Pretendidos"
                    value={formData.resultadosPretendidos}
                    onChange={(value) => updateField('resultadosPretendidos', value)}
                    required={true}
                    tooltip="Descreva os resultados esperados"
                    placeholder="Descreva os resultados e benefícios esperados..."
                    rows={6}
                    enableAI={true}
                    aiContext="Resultados pretendidos com a contratação em documento ETP"
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

export default Section08_Resultados;
