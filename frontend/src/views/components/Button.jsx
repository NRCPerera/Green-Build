/**
 * =============================================================================
 * REUSABLE BUTTON COMPONENT
 * =============================================================================
 */

/**
 * Button Component with Tailwind CSS styling
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {'primary'|'secondary'|'danger'|'ghost'} props.variant - Button style
 * @param {'sm'|'md'|'lg'} props.size - Button size
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.fullWidth - Full width button
 * @param {string} props.className - Additional Tailwind classes
 * @param {Function} props.onClick - Click handler
 */
const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    onClick,
    type = 'button',
    ...rest
}) => {
    const variants = {
        primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500',
        secondary: 'border border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20',
        danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500',
        ghost: 'text-gray-400 hover:text-white hover:bg-white/5',
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            className={`
        ${sizes[size]}
        ${variants[variant]}
        ${fullWidth ? 'w-full' : ''}
        font-semibold rounded-xl
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
            {...rest}
        >
            {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
            {children}
        </button>
    );
};

export default Button;
