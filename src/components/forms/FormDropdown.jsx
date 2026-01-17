import InfoTooltip from '../ui/InfoTooltip';

/**
 * Componente FormDropdown - Select/Dropdown reutilizável
 * Inclui label, tooltip e validação
 */
function FormDropdown({
    label,
    value,
    onChange,
    options = [],
    required = false,
    tooltip = '',
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
            <select
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`input-field ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
            >
                {options.map((option, index) => (
                    <option key={index} value={option}>
                        {option}
                    </option>
                ))}
            </select>
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}

export default FormDropdown;
