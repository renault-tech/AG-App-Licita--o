import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import useETPStore from '../../store/etpStore';
import FormDropdown from '../forms/FormDropdown';
import FormNumber from '../forms/FormNumber';
import { currencyToExtendedText } from '../../utils/numberToText';

/**
 * Seção 7: Estimativa de Valores
 * Método de precificação e valor total com conversão para extenso
 */
function Section07_Valores() {
    const { formData, updateField, nextSection, previousSection, validateSection } = useETPStore();

    const handleNext = () => {
        if (validateSection(7)) {
            nextSection();
        }
    };

    const valorExtenso = formData.valorTotal ? currencyToExtendedText(parseFloat(formData.valorTotal)) : '';

    return (
        <div className="card">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <DollarSign className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 7: Estimativa de Valores
                        </h2>
                        <p className="text-gray-600">
                            Método de precificação e valor estimado
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="text-sm text-gray-700">
                        <strong>Orientação:</strong> A pesquisa de preços foi realizada em conformidade
                        com o disposto no art. 23, §1º, inciso IV da Lei Federal nº 14.133/21, regulamentada
                        pela IN 65/2021. Selecione o método utilizado e informe o valor total estimado.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <FormDropdown
                    label="Método de Precificação"
                    value={formData.metodoPrecificacao}
                    onChange={(value) => updateField('metodoPrecificacao', value)}
                    options={['Média Aritmética', 'Menor dos Preços', 'Painel de Preços']}
                    tooltip="Selecione o método utilizado para estimar o valor"
                />

                <FormNumber
                    label="Valor Total Estimado (R$)"
                    value={formData.valorTotal}
                    onChange={(value) => updateField('valorTotal', value)}
                    required={true}
                    tooltip="Informe o valor total estimado da contratação"
                    placeholder="Ex: 100000.00"
                    min={0}
                />

                {valorExtenso && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-green-800 mb-1">
                            Valor por extenso:
                        </p>
                        <p className="text-sm text-green-700 italic">
                            {valorExtenso}
                        </p>
                    </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600">
                        <strong>Texto que será incluído no documento:</strong><br />
                        "Dessa forma, considerando as quantidades pretendidas (descritas no Anexo 02),
                        a aquisição terá o valor estimado de R$ {formData.valorTotal || '____'} ({valorExtenso || '____'})."
                    </p>
                </div>
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

export default Section07_Valores;
