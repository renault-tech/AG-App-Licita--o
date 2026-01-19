import { ChevronLeft, ChevronRight, Wrench } from 'lucide-react';
import useETPStore from '../../store/etpStore';
import FormCheckbox from '../forms/FormCheckbox';
import FormTextArea from '../forms/FormTextArea';

function Section09_Providencias() {
    const { formData, updateField, nextSection, previousSection, validateSection } = useETPStore();

    const handleNext = () => {
        if (validateSection(9)) {
            nextSection();
        }
    };

    const handleCheckboxChange = (checked) => {
        updateField('haProvidencias', checked);
        if (!checked) {
            updateField('descricaoProvidencias', 'Para esta solução não há necessidade de ajustes de qualquer natureza, a serem adotados pela Administração Pública');
        } else {
            updateField('descricaoProvidencias', '');
        }
    };

    return (
        <div className="card">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <Wrench className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 9: Providências
                        </h2>
                        <p className="text-gray-600">
                            Ações necessárias pela Administração
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="text-sm text-gray-700">
                        <strong>Orientação:</strong> Indique se há providências ou ajustes que precisam
                        ser adotados pela Administração Pública antes ou durante a contratação.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <FormCheckbox
                    label="Há providências a serem adotadas?"
                    checked={formData.haProvidencias}
                    onChange={handleCheckboxChange}
                    tooltip="Marque se houver providências necessárias"
                />

                {formData.haProvidencias ? (
                    <FormTextArea
                        label="Descrição das Providências"
                        value={formData.descricaoProvidencias}
                        onChange={(value) => updateField('descricaoProvidencias', value)}
                        required={true}
                        tooltip="Descreva as providências necessárias"
                        placeholder="Descreva as providências..."
                        rows={6}
                    />
                ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                            Texto Padrão:
                        </p>
                        <p className="text-sm text-gray-600 italic">
                            "Para esta solução não há necessidade de ajustes de qualquer natureza, a serem adotados pela Administração Pública."
                        </p>
                    </div>
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

export default Section09_Providencias;
