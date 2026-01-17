import InfoTooltip from '../ui/InfoTooltip';

/**
 * Componente FormInput - Input de texto reutilizável
 * Inclui label, tooltip, validação e mensagem de erro
 */
function FormInput({
    label,
    value,
    onChange,
    required = false,
    tooltip = '',
    placeholder = '',
    error = '',
    name = ''
}) {
    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
                {tooltip && (
                    <span className="ml-2">
                        <InfoTooltip content={tooltip} />
                    </span>
                )}
            </label>
            <input
                type="text"
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`input-field ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}

export default FormInput;
