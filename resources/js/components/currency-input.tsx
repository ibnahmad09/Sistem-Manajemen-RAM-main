import { useMemo } from 'react';
import { formatCurrencyDisplay, sanitizeCurrencyInput } from '@/lib/utils';

interface CurrencyInputProps {
    value: number | string;
    onChange: (raw: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
    label?: string;
    error?: string;
}

export default function CurrencyInput({
    value,
    onChange,
    placeholder = '0',
    required = false,
    className = '',
    label,
    error,
}: CurrencyInputProps) {
    const raw = useMemo(() => {
        if (typeof value === 'number') {
            return value ? String(value) : '';
        }

        return value;
    }, [value]);

    const display = useMemo(() => formatCurrencyDisplay(raw), [raw]);

    return (
        <div className={label ? 'space-y-1.5' : undefined}>
            {label && (
                <label className="text-sm font-semibold text-foreground">
                    {label}{' '}
                    {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                type="text"
                inputMode="decimal"
                value={display}
                onChange={(e) =>
                    onChange(sanitizeCurrencyInput(e.target.value))
                }
                placeholder={placeholder}
                className={`h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 font-mono text-sm transition outline-none focus:ring-2 focus:ring-primary ${className}`}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}
