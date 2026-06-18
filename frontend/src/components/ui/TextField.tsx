import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, icon, id, className = '', ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              {icon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={[
              'w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-gray-900',
              'placeholder:text-gray-400 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
              icon ? 'pl-10' : '',
              error ? 'border-danger' : 'border-line',
              className,
            ].join(' ')}
            aria-invalid={Boolean(error)}
            {...rest}
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);

TextField.displayName = 'TextField';
