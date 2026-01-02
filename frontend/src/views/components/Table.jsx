/**
 * =============================================================================
 * REUSABLE TABLE COMPONENT
 * =============================================================================
 */

/**
 * Table Component with Tailwind CSS styling
 * 
 * @param {Object} props
 * @param {Array} props.columns - Column definitions [{key, title, render?}]
 * @param {Array} props.data - Data array
 * @param {string} props.className - Additional Tailwind classes
 * @param {boolean} props.striped - Striped rows
 * @param {boolean} props.hoverable - Hover effect on rows
 */
const Table = ({
    columns = [],
    data = [],
    className = '',
    striped = false,
    hoverable = true,
    emptyText = 'No data available',
}) => {
    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="w-full">
                <thead className="bg-dark-700/50">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className={`
                  px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider
                  ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}
                `}
                            >
                                {column.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {data.length > 0 ? (
                        data.map((row, rowIndex) => (
                            <tr
                                key={row.id || rowIndex}
                                className={`
                  ${striped && rowIndex % 2 === 1 ? 'bg-white/[0.02]' : ''}
                  ${hoverable ? 'hover:bg-white/5' : ''}
                  transition-colors
                `}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={`
                      px-6 py-4 text-sm
                      ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}
                      ${column.className || 'text-white'}
                    `}
                                    >
                                        {column.render
                                            ? column.render(row[column.key], row, rowIndex)
                                            : row[column.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-6 py-12 text-center text-gray-500"
                            >
                                {emptyText}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
