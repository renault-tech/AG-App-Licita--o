import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import useETPStore from '../../store/etpStore';
import FormTextArea from '../forms/FormTextArea';

function Section12_Viabilidade() {
    const { formData, updateField, nextSection, previousSection, validateSection } = useETPStore();

    const handleNext = () => {
        if (validateSection(12)) {
            nextSection();
        }
    };

    return (
        <div className="card">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 12: Viabilidade
                        </h2>
                        <p className="text-gray-600">
                            Conclusão sobre a viabilidade da contratação
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="text-sm text-gray-700">
                        <strong>Orientação:</strong> Apresente a conclusão sobre a viabilidade da
                        contratação. Um texto padrão está disponível, mas você pode editá-lo conforme necessário.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <FormTextArea
                    label="Conclusão sobre Viabilidade"
                    value={formData.viabilidade}
                    onChange={(value) => updateField('viabilidade', value)}
                    required={true}
                    tooltip="Edite o texto padrão ou escreva sua própria conclusão"
                    placeholder="Conclusão sobre viabilidade..."
                    rows={6}
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

export default Section12_Viabilidade;
