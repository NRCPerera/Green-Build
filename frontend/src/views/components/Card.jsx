/**
 * =============================================================================
 * REUSABLE CARD COMPONENT
 * =============================================================================
 */

/**
 * Card Component with Tailwind CSS styling
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.title - Optional card title
 * @param {React.ReactNode} props.extra - Optional extra content for header
 * @param {string} props.className - Additional Tailwind classes
 * @param {'default'|'glass'|'bordered'} props.variant - Card style variant
 */
const Card = ({
    children,
    title,
    extra,
    className = '',
    variant = 'default'
}) => {
    const variants = {
        default: 'bg-dark-800/50 border border-white/5',
        glass: 'bg-white/5 backdrop-blur-xl border border-white/10',
        bordered: 'bg-transparent border border-white/10',
    };

    return (
        <div className={`rounded-2xl ${variants[variant]} ${className}`}>
            {(title || extra) && (
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
                    {extra && <div>{extra}</div>}
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
        </div>
    );
};

export default Card;
