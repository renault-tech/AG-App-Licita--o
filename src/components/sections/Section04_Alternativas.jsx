import { ChevronLeft, ChevronRight, GitBranch } from 'lucide-react';
import useETPStore from '../../store/etpStore';
import FormTextArea from '../forms/FormTextArea';

/**
 * Seção 4: Alternativas Consideradas
 * Análise de opções e justificativa da escolha
 */
function Section04_Alternativas() {
    const { formData, updateField, nextSection, previousSection, validateSection } = useETPStore();

    const handleNext = () => {
        if (validateSection(4)) {
            nextSection();
        }
    };

    return (
        <div className="card">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                        <GitBranch className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Seção 4: Alternativas Consideradas
                        </h2>
                        <p className="text-gray-600">
                            Análise de opções para atender a necessidade
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="text-sm text-gray-700">
                        <strong>Orientação:</strong> Liste as alternativas que foram consideradas
                        para atender a necessidade. A Opção 1 é obrigatória. As opções 2 e 3 são
                        facultativas. Ao final, justifique qual opção foi escolhida e por quê.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <FormTextArea
                    label="Opção 1"
                    value={formData.alternativa1}
                    onChange={(value) => updateField('alternativa1', value)}
                    required={true}
                    tooltip="Descreva a primeira alternativa considerada"
                    placeholder="Descreva a primeira alternativa..."
                    rows={4}
                    enableAI={true}
                    aiContext="Alternativa de solução em documento ETP"
                />

                <FormTextArea
                    label="Opção 2 (Opcional)"
                    value={formData.alternativa2}
                    onChange={(value) => updateField('alternativa2', value)}
                    tooltip="Descreva a segunda alternativa, se houver"
                    placeholder="Descreva a segunda alternativa (opcional)..."
                    rows={4}
                    enableAI={true}
                    aiContext="Alternativa de solução em documento ETP"
                />

                <FormTextArea
                    label="Opção 3 (Opcional)"
                    value={formData.alternativa3}
                    onChange={(value) => updateField('alternativa3', value)}
                    tooltip="Descreva a terceira alternativa, se houver"
                    placeholder="Descreva a terceira alternativa (opcional)..."
                    rows={4}
                    enableAI={true}
                    aiContext="Alternativa de solução em documento ETP"
                />

                <FormTextArea
                    label="Conclusão: Opção Escolhida e Motivo"
                    value={formData.conclusaoAlternativa}
                    onChange={(value) => updateField('conclusaoAlternativa', value)}
                    required={true}
                    tooltip="Justifique qual alternativa foi escolhida e os motivos da escolha"
                    placeholder="Explique qual opção foi escolhida e por que é a melhor alternativa..."
                    rows={5}
                    enableAI={true}
                    aiContext="Justificativa de escolha de alternativa em documento ETP"
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

export default Section04_Alternativas;
