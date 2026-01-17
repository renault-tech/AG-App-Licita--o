/**
 * Componente ProgressBar - Barra de progresso percentual
 * Mostra visualmente o progresso total do formulário
 */
function ProgressBar({ validation }) {
    const totalSections = 13;
    const completedSections = Object.values(validation).filter(Boolean).length;
    const progressPercentage = Math.round((completedSections / totalSections) * 100);

    return (
        <div className="card bg-gradient-to-r from-primary-50 to-secondary-50">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                    Progresso Geral
                </h3>
                <span className="text-2xl font-bold text-primary-700">
                    {progressPercentage}%
                </span>
            </div>

            {/* Barra de Progresso */}
            <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                />
            </div>

            {/* Texto informativo */}
            <p className="text-xs text-gray-600 mt-3">
                {completedSections} de {totalSections} seções concluídas
            </p>
        </div>
    );
}

export default ProgressBar;
