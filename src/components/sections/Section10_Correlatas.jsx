import { ChevronLeft, ChevronRight, Link } from 'lucide-react';
import useETPStore from '../../store/etpStore';
import FormDropdown from '../forms/FormDropdown';
import FormTextArea from '../forms/FormTextArea';

function Section10_Correlatas() {
    const { formData, updateField, nextSection, previousSection, validateSection } = useETPStore();

    const handleNext = () => {
        if (validateSection(10)) {
            nextSection();
        }
    };

    return (
        <div className="card">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <Link className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 10: Contratações Correlatas
                        </h2>
                        <p className="text-gray-600">
                            Outras contratações relacionadas
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="text-sm text-gray-700">
                        <strong>Orientação:</strong> Indique se existem outras contratações correlatas
                        ou interdependentes que devem ser consideradas.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <FormDropdown
                    label="Existem Contratações Correlatas?"
                    value={formData.contratacoesCorrelatas}
                    onChange={(value) => {
                        updateField('contratacoesCorrelatas', value);
                        if (value === 'Não') {
                            updateField('descricaoCorrelatas', '');
                        }
                    }}
                    options={['Não', 'Sim']}
                    tooltip="Indique se há contratações relacionadas"
                />

                {formData.contratacoesCorrelatas === 'Sim' && (
                    <FormTextArea
                        label="Descrição das Contratações Correlatas"
                        value={formData.descricaoCorrelatas}
                        onChange={(value) => updateField('descricaoCorrelatas', value)}
                        required={true}
                        tooltip="Descreva as contratações correlatas"
                        placeholder="Descreva as contratações relacionadas..."
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

export default Section10_Correlatas;
