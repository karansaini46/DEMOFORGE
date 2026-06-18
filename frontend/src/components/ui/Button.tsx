import { Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-dark focus-visible:ring-primary',
  secondary:
    'bg-surface text-gray-700 border border-line hover:bg-gray-50 focus-visible:ring-primary',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus-visible:ring-primary',
  danger: 'bg-danger text-white hover:bg-red-600 focus-visible:ring-danger',
};

export function Button({
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5',
        'text-sm font-semibold transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        fullWidth ? 'w-full' : '',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
