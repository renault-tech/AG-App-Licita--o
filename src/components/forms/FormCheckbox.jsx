import InfoTooltip from '../ui/InfoTooltip';

/**
 * Componente FormCheckbox - Checkbox reutilizável
 * Inclui label e tooltip
 */
function FormCheckbox({
    label,
    checked,
    onChange,
    tooltip = '',
    name = ''
}) {
    return (
        <div className="mb-6">
            <label className="flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    name={name}
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500 cursor-pointer"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                    {label}
                </span>
                {tooltip && (
                    <span className="ml-2">
                        <InfoTooltip content={tooltip} />
                    </span>
                )}
            </label>
        </div>
    );
}

export default FormCheckbox;
