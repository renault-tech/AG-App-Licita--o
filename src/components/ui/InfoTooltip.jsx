import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

/**
 * Componente InfoTooltip - Tooltip de ajuda contextual
 * Exibe dicas e orientações ao passar o mouse
 */
function InfoTooltip({ content }) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                className="info-tooltip"
            >
                <HelpCircle className="w-4 h-4" />
            </button>

            {isVisible && (
                <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64">
                    <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
                        {content}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InfoTooltip;
