/**
 * Manual Input Panel Component
 * 
 * Collapsible panel for entering additional construction elements.
 */

import { Card, InputNumber, Row, Col, Typography, Collapse, Space, Divider, Statistic } from 'antd';
import {
    ThunderboltOutlined,
    ToolOutlined,
    HomeOutlined,
    AppstoreOutlined,
    PlusCircleOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Panel } = Collapse;

/**
 * Form section for a category of manual inputs.
 */
const InputSection = ({ title, icon, items, inputs, onUpdate }) => (
    <div style={{ marginBottom: '16px' }}>
        <Text strong style={{ color: '#00d9ff', marginBottom: '8px', display: 'block' }}>
            {icon} {title}
        </Text>
        <Row gutter={[12, 12]}>
            {items.map(({ field, label, unit }) => (
                <Col xs={12} sm={8} key={field}>
                    <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{label}</Text>
                        <InputNumber
                            value={inputs[field]}
                            onChange={(value) => onUpdate(field, value)}
                            min={0}
                            style={{ width: '100%' }}
                            placeholder="0"
                            addonAfter={unit}
                        />
                    </div>
                </Col>
            ))}
        </Row>
    </div>
);

/**
 * Panel for manually entering additional construction elements.
 */
const ManualInputPanel = ({ inputs, onUpdate, costs }) => {
    const electricalItems = [
        { field: 'outlets', label: 'Outlets', unit: 'nos' },
        { field: 'switches', label: 'Switches', unit: 'nos' },
        { field: 'lightFixtures', label: 'Light Fixtures', unit: 'nos' }
    ];

    const plumbingItems = [
        { field: 'sinks', label: 'Sinks', unit: 'nos' },
        { field: 'toilets', label: 'Toilets', unit: 'nos' },
        { field: 'showers', label: 'Showers', unit: 'nos' },
        { field: 'bathtubs', label: 'Bathtubs', unit: 'nos' }
    ];

    const otherItems = [
        { field: 'acUnits', label: 'AC Units', unit: 'nos' },
        { field: 'staircases', label: 'Staircases', unit: 'nos' }
    ];

    const flooringItems = [
        { field: 'flooringTileArea', label: 'Tile', unit: 'sqm' },
        { field: 'flooringWoodArea', label: 'Wood', unit: 'sqm' },
        { field: 'flooringCarpetArea', label: 'Carpet', unit: 'sqm' }
    ];

    const ceilingItems = [
        { field: 'ceilingPlainArea', label: 'Plain', unit: 'sqm' },
        { field: 'ceilingFalseArea', label: 'False', unit: 'sqm' }
    ];

    return (
        <Card
            className="manual-input-card glass-card"
            title={
                <Space>
                    <PlusCircleOutlined />
                    <span>Additional Items</span>
                </Space>
            }
            extra={
                costs.total > 0 && (
                    <Text strong style={{ color: '#52c41a' }}>
                        +${costs.total.toFixed(2)}
                    </Text>
                )
            }
            style={{ marginTop: '16px' }}
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                Add elements not detected by AI (electrical, plumbing, flooring, etc.)
            </Text>

            <Collapse
                ghost
                defaultActiveKey={[]}
                style={{ background: 'transparent' }}
            >
                <Panel
                    header={<><ThunderboltOutlined /> Electrical</>}
                    key="electrical"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                >
                    <InputSection
                        title=""
                        icon=""
                        items={electricalItems}
                        inputs={inputs}
                        onUpdate={onUpdate}
                    />
                </Panel>

                <Panel
                    header={<><ToolOutlined /> Plumbing</>}
                    key="plumbing"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                >
                    <InputSection
                        title=""
                        icon=""
                        items={plumbingItems}
                        inputs={inputs}
                        onUpdate={onUpdate}
                    />
                </Panel>

                <Panel
                    header={<><HomeOutlined /> Other Items</>}
                    key="other"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                >
                    <InputSection
                        title=""
                        icon=""
                        items={otherItems}
                        inputs={inputs}
                        onUpdate={onUpdate}
                    />
                </Panel>

                <Panel
                    header={<><AppstoreOutlined /> Flooring and Ceiling</>}
                    key="flooring"
                >
                    <InputSection
                        title="Flooring"
                        icon=""
                        items={flooringItems}
                        inputs={inputs}
                        onUpdate={onUpdate}
                    />
                    <Divider style={{ margin: '12px 0' }} />
                    <InputSection
                        title="Ceiling"
                        icon=""
                        items={ceilingItems}
                        inputs={inputs}
                        onUpdate={onUpdate}
                    />
                </Panel>
            </Collapse>

            {costs.total > 0 && (
                <>
                    <Divider />
                    <Row justify="end">
                        <Col>
                            <Statistic
                                title="Additional Items Total"
                                value={costs.total}
                                precision={2}
                                prefix="$"
                                valueStyle={{ color: '#52c41a', fontSize: '18px' }}
                            />
                        </Col>
                    </Row>
                </>
            )}
        </Card>
    );
};

export default ManualInputPanel;
