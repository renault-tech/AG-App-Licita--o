import { ChevronLeft, AlertTriangle } from 'lucide-react';
import useETPStore from '../../store/etpStore';
import FormTextArea from '../forms/FormTextArea';

function Section13_Riscos() {
    const { formData, updateField, previousSection, validateSection } = useETPStore();

    const handleFinish = () => {
        if (validateSection(13)) {
            alert('Todas as seções foram preenchidas! Você pode agora exportar o documento.');
        }
    };

    return (
        <div className="card">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 13: Análise de Risco
                        </h2>
                        <p className="text-gray-600">
                            Identificação e avaliação de riscos
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="text-sm text-gray-700">
                        <strong>Orientação:</strong> Esta é a última seção! Identifique os principais
                        riscos da contratação e apresente a conclusão da análise.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Tabela de Riscos - Placeholder */}
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Tabela de Análise de Risco
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Identifique e classifique os riscos conforme matriz padrão:
                    </p>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Risco</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Probabilidade</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Impacto</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Mitigação</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-500 italic" colSpan="4">
                                        Tabela de riscos será implementada no documento exportado
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <FormTextArea
                    label="Conclusão da Análise de Risco"
                    value={formData.conclusaoRisco}
                    onChange={(value) => updateField('conclusaoRisco', value)}
                    required={true}
                    tooltip="Apresente a conclusão da análise de riscos"
                    placeholder="Apresente a conclusão sobre os riscos identificados e as medidas de mitigação..."
                    rows={6}
                />
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button onClick={previousSection} className="btn-secondary flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5" />
                    Seção Anterior
                </button>
                <button onClick={handleFinish} className="btn-primary flex items-center gap-2">
                    Concluir Preenchimento
                </button>
            </div>
        </div>
    );
}

export default Section13_Riscos;
