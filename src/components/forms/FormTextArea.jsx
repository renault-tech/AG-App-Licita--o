import { useRef, useEffect } from 'react';
import InfoTooltip from '../ui/InfoTooltip';
import AIEnhanceButton from '../ui/AIEnhanceButton';

/**
 * Componente FormTextArea - TextArea reutilizável com auto-resize
 * Inclui label, tooltip, contador de caracteres, validação e IA
 */
function FormTextArea({
    label,
    value,
    onChange,
    required = false,
    tooltip = '',
    placeholder = '',
    error = '',
    name = '',
    rows = 4,
    showCounter = false,
    maxLength = null,
    enableAI = false,
    aiContext = ''
}) {
    const textareaRef = useRef(null);

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [value]);

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                    {tooltip && (
                        <span className="ml-2">
                            <InfoTooltip content={tooltip} />
                        </span>
                    )}
                </label>
                {enableAI && (
                    <AIEnhanceButton
                        currentText={value}
                        onTextEnhanced={onChange}
                        context={aiContext || label}
                    />
                )}
            </div>
            <textarea
                ref={textareaRef}
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                maxLength={maxLength}
                className={`input-field resize-none ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            <div className="flex items-center justify-between mt-1">
                {error && <p className="text-sm text-red-600">{error}</p>}
                {showCounter && maxLength && (
                    <p className="text-xs text-gray-500 ml-auto">
                        {value.length}/{maxLength}
                    </p>
                )}
            </div>
        </div>
    );
}

export default FormTextArea;

