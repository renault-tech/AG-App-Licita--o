import { FileText, ScrollText, Info } from 'lucide-react';

/**
 * Página inicial da aplicação
 * Exibe os dois módulos principais: ETP e TR
 */
function Home({ onSelectModule }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
            {/* Header */}
            <header className="bg-primary-800 text-white shadow-lg">
                <div className="container mx-auto px-6 py-8">
                    <h1 className="text-4xl font-bold mb-2">
                        Gerador de Peças Licitatórias
                    </h1>
                    <p className="text-primary-200 text-lg">
                        Lei Federal nº 14.133/2021
                    </p>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-12">
                <div className="max-w-5xl mx-auto">
                    {/* Descrição */}
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">
                            Bem-vindo à Plataforma Legal Tech
                        </h2>
                        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                            Gere documentos profissionais de licitação de forma rápida e
                            conforme a legislação vigente. Escolha o tipo de documento que deseja criar:
                        </p>
                    </div>

                    {/* Cards de Módulos */}
                    <div className="grid md:grid-cols-2 gap-8 mb-12">
                        {/* Card ETP */}
                        <div
                            onClick={() => onSelectModule('etp')}
                            className="card hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border-2 border-transparent hover:border-primary-500"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="bg-primary-100 p-6 rounded-full mb-6">
                                    <FileText className="w-16 h-16 text-primary-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                                    Estudo Técnico Preliminar (ETP)
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Crie um Estudo Técnico Preliminar completo em 13 etapas
                                    estruturadas, com validação automática e exportação em DOCX e PDF.
                                </p>
                                <button className="btn-primary w-full">
                                    Iniciar ETP
                                </button>
                            </div>
                        </div>

                        {/* Card TR */}
                        <div className="card opacity-60 border-2 border-gray-200">
                            <div className="flex flex-col items-center text-center">
                                <div className="bg-gray-100 p-6 rounded-full mb-6">
                                    <ScrollText className="w-16 h-16 text-gray-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-500 mb-4">
                                    Termo de Referência (TR)
                                </h3>
                                <p className="text-gray-500 mb-6">
                                    Módulo em desenvolvimento. Em breve você poderá gerar
                                    Termos de Referência completos e profissionais.
                                </p>
                                <button className="btn-secondary w-full" disabled>
                                    Em Breve
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Status da Legislação */}
                    <div className="card bg-blue-50 border-l-4 border-primary-600">
                        <div className="flex items-start gap-4">
                            <Info className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">
                                    Status da Legislação
                                </h4>
                                <p className="text-gray-600 text-sm">
                                    Lei nº 14.133/2021 - Nova Lei de Licitações e Contratos Administrativos
                                </p>
                                <p className="text-gray-500 text-xs mt-2">
                                    <strong>Status:</strong> Vigente |
                                    <strong> Última Atualização:</strong> Sistema atualizado conforme IN 65/2021
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 text-gray-300 py-8 mt-20">
                <div className="container mx-auto px-6 text-center">
                    <p className="text-sm">
                        © 2024 Legal Tech - ETP & TR Generator | v1.0.0
                    </p>
                    <p className="text-xs mt-2 text-gray-400">
                        Desenvolvido em conformidade com a Lei 14.133/2021
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default Home;
