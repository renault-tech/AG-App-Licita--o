import { ArrowLeft, Download, Save } from 'lucide-react';
import { useEffect } from 'react';
import useETPStore from '../store/etpStore';
import Stepper from '../components/navigation/Stepper';
import ProgressBar from '../components/navigation/ProgressBar';

// Importar todas as seções
import Section01 from '../components/sections/Section01_Identificacao';
import Section02 from '../components/sections/Section02_DadosProcesso';
import Section03 from '../components/sections/Section03_Requisitos';
import Section04 from '../components/sections/Section04_Alternativas';
import Section05 from '../components/sections/Section05_DescricaoSolucao';
import Section06 from '../components/sections/Section06_Modalidade';
import Section07 from '../components/sections/Section07_Valores';
import Section08 from '../components/sections/Section08_Resultados';
import Section09 from '../components/sections/Section09_Providencias';
import Section10 from '../components/sections/Section10_Correlatas';
import Section11 from '../components/sections/Section11_Impactos';
import Section12 from '../components/sections/Section12_Viabilidade';
import Section13 from '../components/sections/Section13_Riscos';

/**
 * Página principal do módulo ETP
 * Gerencia navegação entre seções e exportação de documentos
 */
function ETPModule({ onBack }) {
    const {
        currentSection,
        setCurrentSection,
        sectionValidation,
        validateSection,
        formData
    } = useETPStore();

    // Validar seção atual sempre que mudar
    useEffect(() => {
        validateSection(currentSection);
    }, [currentSection, formData, validateSection]);

    const sections = [
        { component: Section01, title: 'Identificação' },
        { component: Section02, title: 'Dados do Processo' },
        { component: Section03, title: 'Requisitos da Contratação' },
        { component: Section04, title: 'Alternativas Consideradas' },
        { component: Section05, title: 'Descrição da Solução' },
        { component: Section06, title: 'Estimativa de Quantidades e Modalidade' },
        { component: Section07, title: 'Estimativa de Valores' },
        { component: Section08, title: 'Resultados Pretendidos' },
        { component: Section09, title: 'Providências' },
        { component: Section10, title: 'Contratações Correlatas' },
        { component: Section11, title: 'Impactos Ambientais' },
        { component: Section12, title: 'Viabilidade' },
        { component: Section13, title: 'Análise de Risco' },
    ];

    const CurrentSectionComponent = sections[currentSection - 1]?.component;
    const allSectionsCompleted = Object.values(sectionValidation).every(Boolean);

    const handleExport = (format) => {
        // TODO: Implementar exportação
        alert(`Exportação em ${format} será implementada em breve!`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-md sticky top-0 z-40">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">
                                    Estudo Técnico Preliminar (ETP)
                                </h1>
                                <p className="text-sm text-gray-600">
                                    Seção {currentSection} de 13: {sections[currentSection - 1]?.title}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => handleExport('pdf')}
                                disabled={!allSectionsCompleted}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                PDF
                            </button>
                            <button
                                onClick={() => handleExport('docx')}
                                disabled={!allSectionsCompleted}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                DOCX
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar - Stepper e Progress */}
                    <div className="lg:col-span-1 space-y-6">
                        <ProgressBar validation={sectionValidation} />
                        <Stepper
                            currentSection={currentSection}
                            onSectionChange={setCurrentSection}
                            validation={sectionValidation}
                        />
                    </div>

                    {/* Área principal - Seção atual */}
                    <div className="lg:col-span-3">
                        {CurrentSectionComponent && <CurrentSectionComponent />}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ETPModule;
