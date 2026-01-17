import { ChevronLeft, ChevronRight, Leaf } from 'lucide-react';
import useETPStore from '../../store/etpStore';
import FormDropdown from '../forms/FormDropdown';
import FormTextArea from '../forms/FormTextArea';

function Section11_Impactos() {
    const { formData, updateField, nextSection, previousSection, validateSection } = useETPStore();

    const handleNext = () => {
        if (validateSection(11)) {
            nextSection();
        }
    };

    return (
        <div className="card">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <Leaf className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 11: Impactos Ambientais
                        </h2>
                        <p className="text-gray-600">
                            Avaliação de impactos ao meio ambiente
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="text-sm text-gray-700">
                        <strong>Orientação:</strong> Indique se a contratação apresenta impactos
                        ambientais significativos e, se sim, descreva-os.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <FormDropdown
                    label="Há Impactos Ambientais?"
                    value={formData.impactosAmbientais}
                    onChange={(value) => {
                        updateField('impactosAmbientais', value);
                        if (value === 'Não') {
                            updateField('descricaoImpactos', '');
                        }
                    }}
                    options={['Não', 'Sim']}
                    tooltip="Indique se há impactos ambientais relevantes"
                />

                {formData.impactosAmbientais === 'Sim' && (
                    <FormTextArea
                        label="Descrição dos Impactos Ambientais"
                        value={formData.descricaoImpactos}
                        onChange={(value) => updateField('descricaoImpactos', value)}
                        required={true}
                        tooltip="Descreva os impactos ambientais identificados"
                        placeholder="Descreva os impactos ambientais..."
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

export default Section11_Impactos;
