/**
 * Table Configuration
 * 
 * Defines the column structure for the BOQ table display.
 * Includes custom rendering for different data types.
 */

import { Typography } from 'antd';

const { Text } = Typography;

/**
 * Returns the column configuration for the BOQ table.
 * Each column includes custom rendering based on data type.
 * 
 * @returns {Array} Column definitions for Ant Design Table
 */
export const getTableColumns = () => [
    {
        title: 'S.No',
        dataIndex: 'key',
        key: 'key',
        width: 60,
        align: 'center',
        render: (text, record) => (
            <span style={{
                color: record.type === 'subtotal' ? '#00d9ff' : 'inherit',
                fontWeight: record.type === 'subtotal' ? 600 : 400
            }}>
                {text}
            </span>
        )
    },
    {
        title: 'Item Description',
        dataIndex: 'item',
        key: 'item',
        render: (text, record) => (
            <div>
                <Text strong style={{
                    color: record.type === 'subtotal' ? '#00d9ff' :
                        record.type === 'deduction' ? '#ff6b6b' : 'inherit'
                }}>
                    {text}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                    {record.description}
                </Text>
            </div>
        )
    },
    {
        title: 'Quantity',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 100,
        align: 'right',
        render: (val, record) => (
            <Text strong style={{
                color: record.type === 'deduction' ? '#ff6b6b' :
                    record.type === 'subtotal' ? '#00d9ff' : '#52c41a'
            }}>
                {typeof val === 'number' ? val.toFixed(2) : val}
            </Text>
        )
    },
    {
        title: 'Unit',
        dataIndex: 'unit',
        key: 'unit',
        width: 60,
        align: 'center'
    },
    {
        title: 'Rate',
        dataIndex: 'rate',
        key: 'rate',
        width: 100,
        align: 'right'
    },
    {
        title: 'Amount',
        dataIndex: 'total',
        key: 'total',
        width: 120,
        align: 'right',
        render: (text) => (
            <Text strong style={{ color: text !== '-' ? '#52c41a' : 'inherit' }}>
                {text}
            </Text>
        )
    }
];

export default { getTableColumns };
