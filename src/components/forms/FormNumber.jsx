import InfoTooltip from '../ui/InfoTooltip';

/**
 * Componente FormNumber - Input numérico com formatação
 * Suporta formatação de moeda e percentual
 */
function FormNumber({
    label,
    value,
    onChange,
    required = false,
    tooltip = '',
    placeholder = '',
    error = '',
    name = '',
    type = 'number', // 'number', 'currency', 'percentage'
    min = null,
    max = null
}) {
    const formatValue = (val) => {
        if (!val) return '';

        if (type === 'currency') {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
            }).format(val);
        }

        if (type === 'percentage') {
            return `${val}%`;
        }

        return val;
    };

    const parseValue = (val) => {
        if (type === 'currency') {
            return val.replace(/[^\d,]/g, '').replace(',', '.');
        }

        if (type === 'percentage') {
            return val.replace('%', '');
        }

        return val;
    };

    const handleChange = (e) => {
        const parsed = parseValue(e.target.value);
        onChange(parsed);
    };

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
                type={type === 'number' ? 'number' : 'text'}
                name={name}
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                min={min}
                max={max}
                className={`input-field ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}

export default FormNumber;
