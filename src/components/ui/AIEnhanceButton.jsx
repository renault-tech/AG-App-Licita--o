import { useState } from 'react';
import { Sparkles, Loader2, Undo2 } from 'lucide-react';
import { enhanceTextWithAI } from '../../lib/aiService';

/**
 * Botão de IA para aprimorar texto
 * Aparece ao lado de textareas e transforma o texto em linguagem formal
 */
function AIEnhanceButton({
    currentText,
    onTextEnhanced,
    context = '',
    disabled = false
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [originalText, setOriginalText] = useState(null);

    const handleEnhance = async () => {
        if (!currentText || currentText.trim().length < 10) {
            setError('Digite pelo menos algumas palavras');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setLoading(true);
        setError(null);
        setOriginalText(currentText);

        try {
            const enhanced = await enhanceTextWithAI(currentText, context);
            onTextEnhanced(enhanced);
        } catch (err) {
            setError(err.message || 'Erro ao processar');
            setTimeout(() => setError(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleUndo = () => {
        if (originalText) {
            onTextEnhanced(originalText);
            setOriginalText(null);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {/* Botão principal de IA */}
            <button
                type="button"
                onClick={handleEnhance}
                disabled={disabled || loading || !currentText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Usar IA para adequar o texto à linguagem formal de licitações"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processando...</span>
                    </>
                ) : (
                    <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Aprimorar com IA</span>
                    </>
                )}
            </button>

            {/* Botão de desfazer */}
            {originalText && !loading && (
                <button
                    type="button"
                    onClick={handleUndo}
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
                    title="Desfazer e restaurar texto original"
                >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Desfazer</span>
                </button>
            )}

            {/* Mensagem de erro */}
            {error && (
                <span className="text-xs text-red-600 ml-2">
                    {error}
                </span>
            )}
        </div>
    );
}

export default AIEnhanceButton;
