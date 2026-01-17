import { Check } from 'lucide-react';

/**
 * Componente Stepper - Navegação visual entre as 13 seções do ETP
 * Mostra progresso e permite navegação entre seções
 */
function Stepper({ currentSection, onSectionChange, validation }) {
    const sections = [
        { num: 1, title: 'Identificação' },
        { num: 2, title: 'Dados do Processo' },
        { num: 3, title: 'Requisitos' },
        { num: 4, title: 'Alternativas' },
        { num: 5, title: 'Descrição da Solução' },
        { num: 6, title: 'Modalidade' },
        { num: 7, title: 'Valores' },
        { num: 8, title: 'Resultados' },
        { num: 9, title: 'Providências' },
        { num: 10, title: 'Correlatas' },
        { num: 11, title: 'Impactos' },
        { num: 12, title: 'Viabilidade' },
        { num: 13, title: 'Análise de Risco' },
    ];

    const getSectionStatus = (sectionNum) => {
        if (sectionNum === currentSection) return 'current';
        if (validation[sectionNum]) return 'completed';
        if (sectionNum < currentSection) return 'visited';
        return 'upcoming';
    };

    const getSectionClasses = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-secondary-500 text-white border-secondary-500';
            case 'current':
                return 'bg-primary-600 text-white border-primary-600 ring-4 ring-primary-200';
            case 'visited':
                return 'bg-gray-300 text-gray-600 border-gray-300';
            case 'upcoming':
                return 'bg-white text-gray-400 border-gray-300';
            default:
                return 'bg-white text-gray-400 border-gray-300';
        }
    };

    return (
        <div className="card bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">
                Progresso do ETP
            </h3>

            <div className="space-y-2">
                {sections.map((section, index) => {
                    const status = getSectionStatus(section.num);
                    const isClickable = validation[section.num] || section.num <= currentSection;

                    return (
                        <div key={section.num}>
                            <button
                                onClick={() => isClickable && onSectionChange(section.num)}
                                disabled={!isClickable}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isClickable ? 'hover:bg-white hover:shadow-md cursor-pointer' : 'cursor-not-allowed'
                                    }`}
                            >
                                {/* Número/Ícone */}
                                <div
                                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-all duration-200 ${getSectionClasses(
                                        status
                                    )}`}
                                >
                                    {status === 'completed' ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        section.num
                                    )}
                                </div>

                                {/* Título */}
                                <span
                                    className={`flex-1 text-left text-sm font-medium ${status === 'current'
                                            ? 'text-primary-700'
                                            : status === 'completed'
                                                ? 'text-secondary-700'
                                                : 'text-gray-600'
                                        }`}
                                >
                                    {section.title}
                                </span>
                            </button>

                            {/* Linha conectora */}
                            {index < sections.length - 1 && (
                                <div className="ml-4 pl-4 py-1">
                                    <div className={`w-0.5 h-4 ${getSectionStatus(section.num + 1) === 'completed' ||
                                            getSectionStatus(section.num + 1) === 'current'
                                            ? 'bg-primary-300'
                                            : 'bg-gray-300'
                                        }`} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Stepper;
