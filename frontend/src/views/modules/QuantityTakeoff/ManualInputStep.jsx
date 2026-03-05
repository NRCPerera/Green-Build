import { useState, useEffect } from 'react';
import {
    Card, InputNumber, Row, Col, Typography, Collapse,
    Space, Divider, Statistic, Alert, Tag, Select, Tooltip
} from 'antd';
import {
    ThunderboltOutlined,
    ToolOutlined,
    HomeOutlined,
    AppstoreOutlined,
    BuildOutlined,
    FormatPainterOutlined,
    EditOutlined,
    BulbOutlined,
    DollarOutlined
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

const MASONRY_MATERIALS = [
    { value: 'standard', label: 'Standard Block' },
    { value: 'aac_block', label: 'AAC Block' },
    { value: 'clay_brick', label: 'Clay Brick' },
    { value: 'cement_block', label: 'Cement Block' },
    { value: 'laterite', label: 'Laterite Stone' },
];

const DOOR_MATERIALS = [
    { value: 'standard', label: 'Standard Wooden' },
    { value: 'flush', label: 'Flush Door' },
    { value: 'teak', label: 'Teak Wood' },
    { value: 'metal', label: 'Metal Door' },
    { value: 'pvc', label: 'PVC Door' },
];

const WINDOW_MATERIALS = [
    { value: 'standard', label: 'Standard Aluminium' },
    { value: 'upvc', label: 'UPVC' },
    { value: 'wooden', label: 'Wooden' },
    { value: 'powder_coated', label: 'Powder Coated Aluminium' },
];

/**
 * Reusable input row
 */
const InputRow = ({ items, inputs, onUpdate }) => (
    <Row gutter={[12, 12]}>
        {items.map(({ field, label, unit, placeholder, tooltip, type, options }) => (
            <Col xs={12} sm={8} lg={6} key={field}>
                <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        {label}
                        {tooltip && (
                            <Tooltip title={tooltip}>
                                <BulbOutlined style={{ marginLeft: 4, color: '#faad14' }} />
                            </Tooltip>
                        )}
                    </Text>
                    {type === 'select' ? (
                        <Select
                            value={inputs[field] || options?.[0]?.value}
                            onChange={(value) => onUpdate(field, value)}
                            style={{ width: '100%' }}
                            placeholder="Select..."
                        >
                            {options?.map(o => (
                                <Option key={o.value} value={o.value}>{o.label}</Option>
                            ))}
                        </Select>
                    ) : (
                        <InputNumber
                            value={inputs[field]}
                            onChange={(value) => onUpdate(field, value)}
                            min={0}
                            step={field.includes('Area') || field.includes('Vol') || field.includes('Length') || field.includes('Depth') ? 0.1 : 1}
                            style={{ width: '100%' }}
                            placeholder={placeholder || '0'}
                            addonAfter={unit}
                        />
                    )}
                </div>
            </Col>
        ))}
    </Row>
);

const ManualInputStep = ({ mlResults, manualInputs, onUpdate, materialSelections, onMaterialUpdate }) => {
    // Pre-computed ML values for display
    const mlFloorArea = mlResults?.room_detection?.total_floor_area_m2 ||
        mlResults?.detections?.rooms?.total_floor_area_m2 || 0;
    const mlNetWallArea = mlResults?.quantities?.wall_net_surface_area_m2 ||
        mlResults?.detections?.walls?.netAreaM2 || 0;
    const mlDoors = mlResults?.quantities?.item_counts?.doors ||
        mlResults?.detections?.doors || 0;
    const mlWindows = mlResults?.quantities?.item_counts?.windows ||
        mlResults?.detections?.windows || 0;

    // Safe material update handler
    const handleMaterialUpdate = (key, value) => {
        if (onMaterialUpdate) onMaterialUpdate(key, value);
        else onUpdate(key, value);
    };

    const collapseItems = [
        {
            key: 'earthworks',
            label: (
                <Space>
                    <BuildOutlined />
                    <span>A. Earthworks</span>
                    <Tag color="orange">Auto-calculated from floor area</Tag>
                </Space>
            ),
            children: (
                <>
                    <Alert
                        type="info"
                        showIcon
                        message={`Auto-calculated based on detected floor area: ${mlFloorArea.toFixed(2)} m²`}
                        style={{ marginBottom: 16 }}
                    />
                    <InputRow
                        items={[
                            {
                                field: 'excavationDepth', label: 'Excavation Depth', unit: 'm', placeholder: '1.2',
                                tooltip: 'Foundation excavation depth. Default 1.2m for standard residential.'
                            },
                        ]}
                        inputs={manualInputs}
                        onUpdate={onUpdate}
                    />
                </>
            ),
        },
        {
            key: 'concrete',
            label: (
                <Space>
                    <BuildOutlined />
                    <span>B. Concrete Works</span>
                    <Tag color="orange">Optional overrides</Tag>
                </Space>
            ),
            children: (
                <>
                    <Alert
                        type="info"
                        showIcon
                        message="PCC, RCC, formwork & steel are auto-estimated from floor area. Override below if needed."
                        style={{ marginBottom: 16 }}
                    />
                    <InputRow
                        items={[
                            {
                                field: 'rccVolume', label: 'RCC Volume', unit: 'm³', placeholder: 'auto',
                                tooltip: 'Reinforced concrete volume. Default = floor area × 0.30'
                            },
                            {
                                field: 'formworkArea', label: 'Formwork Area', unit: 'm²', placeholder: 'auto',
                                tooltip: 'Formwork surface area. Default = floor area × 0.80'
                            },
                            {
                                field: 'steelKg', label: 'Reinforcement Steel', unit: 'kg', placeholder: 'auto',
                                tooltip: 'Steel weight. Default = RCC volume × 78 kg/m³'
                            },
                        ]}
                        inputs={manualInputs}
                        onUpdate={onUpdate}
                    />
                </>
            ),
        },
        {
            key: 'masonry',
            label: (
                <Space>
                    <AppstoreOutlined />
                    <span>C. Masonry Works</span>
                    <Tag color="green">Pre-filled from ML</Tag>
                </Space>
            ),
            children: (
                <>
                    <Alert
                        type="info"
                        showIcon
                        message={`ML detected net wall area: ${mlNetWallArea.toFixed(2)} m² — defaulting to blockwork`}
                        style={{ marginBottom: 16 }}
                    />
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        <Col xs={24} sm={8}>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                <DollarOutlined style={{ marginRight: 4 }} />
                                Masonry Material Type
                            </Text>
                            <Select
                                value={manualInputs.masonryType || 'standard'}
                                onChange={(v) => handleMaterialUpdate('masonryType', v)}
                                style={{ width: '100%' }}
                            >
                                {MASONRY_MATERIALS.map(m => (
                                    <Option key={m.value} value={m.value}>{m.label}</Option>
                                ))}
                            </Select>
                        </Col>
                    </Row>
                    <InputRow
                        items={[
                            { field: 'blockworkArea', label: 'Block Masonry Area', unit: 'm²', placeholder: `${mlNetWallArea.toFixed(1)}` },
                            { field: 'brickworkArea', label: 'Brick Masonry Area', unit: 'm²', placeholder: '0' },
                            { field: 'stoneMasonryVolume', label: 'Stone Masonry Vol', unit: 'm³', placeholder: '0' },
                        ]}
                        inputs={manualInputs}
                        onUpdate={onUpdate}
                    />
                </>
            ),
        },
        {
            key: 'finishes',
            label: (
                <Space>
                    <FormatPainterOutlined />
                    <span>D. Finishes</span>
                    <Tag color="green">Pre-filled from ML</Tag>
                </Space>
            ),
            children: (
                <>
                    <Alert
                        type="info"
                        showIcon
                        message="Plastering & painting default to 2× wall area. Floor tiling defaults to total floor area."
                        style={{ marginBottom: 16 }}
                    />
                    <Text strong style={{ color: '#00d9ff', display: 'block', marginBottom: 8 }}>
                        Walls
                    </Text>
                    <InputRow
                        items={[
                            { field: 'plasterArea', label: 'Plaster Area', unit: 'm²', placeholder: `${(mlNetWallArea * 2).toFixed(1)}` },
                            { field: 'paintArea', label: 'Paint Area', unit: 'm²', placeholder: 'auto' },
                            { field: 'wallTileArea', label: 'Wall Tile Area', unit: 'm²', placeholder: '0' },
                        ]}
                        inputs={manualInputs}
                        onUpdate={onUpdate}
                    />
                    <Divider style={{ margin: '12px 0' }} />
                    <Text strong style={{ color: '#00d9ff', display: 'block', marginBottom: 8 }}>
                        Flooring
                    </Text>
                    <InputRow
                        items={[
                            { field: 'floorTileArea', label: 'Floor Tile Area', unit: 'm²', placeholder: `${mlFloorArea.toFixed(1)}` },
                            { field: 'woodFloorArea', label: 'Wood Flooring', unit: 'm²', placeholder: '0' },
                            { field: 'carpetFloorArea', label: 'Carpet Flooring', unit: 'm²', placeholder: '0' },
                        ]}
                        inputs={manualInputs}
                        onUpdate={onUpdate}
                    />
                    <Divider style={{ margin: '12px 0' }} />
                    <Text strong style={{ color: '#00d9ff', display: 'block', marginBottom: 8 }}>
                        Ceiling
                    </Text>
                    <InputRow
                        items={[
                            { field: 'plainCeilingArea', label: 'Plain Ceiling', unit: 'm²', placeholder: `${mlFloorArea.toFixed(1)}` },
                            { field: 'falseCeilingArea', label: 'False Ceiling', unit: 'm²', placeholder: '0' },
                        ]}
                        inputs={manualInputs}
                        onUpdate={onUpdate}
                    />
                </>
            ),
        },
        {
            key: 'doorsWindows',
            label: (
                <Space>
                    <HomeOutlined />
                    <span>E. Doors & Windows</span>
                    <Tag color="green">Pre-filled from ML</Tag>
                </Space>
            ),
            children: (
                <>
                    <Alert
                        type="info"
                        showIcon
                        message={`ML detected ${mlDoors} door(s) and ${mlWindows} window(s). Override or add more below.`}
                        style={{ marginBottom: 16 }}
                    />
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        <Col xs={12} sm={8}>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                <DollarOutlined style={{ marginRight: 4 }} />
                                Door Material
                            </Text>
                            <Select
                                value={manualInputs.doorType || 'standard'}
                                onChange={(v) => handleMaterialUpdate('doorType', v)}
                                style={{ width: '100%' }}
                            >
                                {DOOR_MATERIALS.map(m => (
                                    <Option key={m.value} value={m.value}>{m.label}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={12} sm={8}>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                <DollarOutlined style={{ marginRight: 4 }} />
                                Window Material
                            </Text>
                            <Select
                                value={manualInputs.windowType || 'standard'}
                                onChange={(v) => handleMaterialUpdate('windowType', v)}
                                style={{ width: '100%' }}
                            >
                                {WINDOW_MATERIALS.map(m => (
                                    <Option key={m.value} value={m.value}>{m.label}</Option>
                                ))}
                            </Select>
                        </Col>
                    </Row>
                    <InputRow
                        items={[
                            {
                                field: 'doors', label: 'Total Doors', unit: 'No.', placeholder: `${mlDoors}`,
                                tooltip: 'Override the ML-detected door count'
                            },
                            {
                                field: 'windows', label: 'Total Windows', unit: 'No.', placeholder: `${mlWindows}`,
                                tooltip: 'Override the ML-detected window count'
                            },
                            { field: 'glassArea', label: 'Glass Installation', unit: 'm²', placeholder: '0' },
                            { field: 'ironmongerySets', label: 'Ironmongery Sets', unit: 'set', placeholder: `${mlDoors}` },
                        ]}
                        inputs={manualInputs}
                        onUpdate={onUpdate}
                    />
                </>
            ),
        },
        {
            key: 'mep',
            label: (
                <Space>
                    <ThunderboltOutlined />
                    <span>F. MEP Works</span>
                    <Tag color="red">Manual entry required</Tag>
                </Space>
            ),
            children: (
                <>
                    <Text strong style={{ color: '#00d9ff', display: 'block', marginBottom: 8 }}>
                        ⚡ Electrical
                    </Text>
                    <InputRow
                        items={[
                            {
                                field: 'wiringLength', label: 'Wiring Length', unit: 'm', placeholder: 'auto',
                                tooltip: 'Default = floor area × 1.5'
                            },
                            { field: 'lightFixtures', label: 'Light Fixtures', unit: 'No.', placeholder: '0' },
                            { field: 'switchboards', label: 'Switchboards / DB', unit: 'No.', placeholder: '0' },
                            { field: 'outlets', label: 'Outlets', unit: 'No.', placeholder: '0' },
                            { field: 'switches', label: 'Switches', unit: 'No.', placeholder: '0' },
                        ]}
                        inputs={manualInputs}
                        onUpdate={onUpdate}
                    />
                    <Divider style={{ margin: '12px 0' }} />
                    <Text strong style={{ color: '#00d9ff', display: 'block', marginBottom: 8 }}>
                        ❄️ HVAC
                    </Text>
                    <InputRow
                        items={[
                            { field: 'acUnits', label: 'AC Units', unit: 'No.', placeholder: '0' },
                        ]}
                        inputs={manualInputs}
                        onUpdate={onUpdate}
                    />
                    <Divider style={{ margin: '12px 0' }} />
                    <Text strong style={{ color: '#00d9ff', display: 'block', marginBottom: 8 }}>
                        🔧 Plumbing
                    </Text>
                    <InputRow
                        items={[
                            { field: 'plumbingPipeLength', label: 'Pipe Length', unit: 'm', placeholder: '0' },
                            { field: 'plumbingFittings', label: 'Fittings', unit: 'No.', placeholder: '0' },
                        ]}
                        inputs={manualInputs}
                        onUpdate={onUpdate}
                    />
                    <Divider style={{ margin: '12px 0' }} />
                    <Text strong style={{ color: '#00d9ff', display: 'block', marginBottom: 8 }}>
                        🚿 Sanitary Fixtures
                    </Text>
                    <InputRow
                        items={[
                            { field: 'sinks', label: 'Sinks', unit: 'No.', placeholder: '0' },
                            { field: 'toilets', label: 'Toilets', unit: 'No.', placeholder: '0' },
                            { field: 'showers', label: 'Showers', unit: 'No.', placeholder: '0' },
                            { field: 'bathtubs', label: 'Bathtubs', unit: 'No.', placeholder: '0' },
                        ]}
                        inputs={manualInputs}
                        onUpdate={onUpdate}
                    />
                    <Divider style={{ margin: '12px 0' }} />
                    <Text strong style={{ color: '#00d9ff', display: 'block', marginBottom: 8 }}>
                        🏗️ Structural Misc
                    </Text>
                    <InputRow
                        items={[
                            { field: 'staircases', label: 'Staircases', unit: 'No.', placeholder: '0' },
                        ]}
                        inputs={manualInputs}
                        onUpdate={onUpdate}
                    />
                </>
            ),
        },
    ];

    return (
        <>
            {/* Header */}
            <Card className="glass-card" style={{ marginBottom: 24 }}>
                <Space style={{ marginBottom: 8 }}>
                    <EditOutlined style={{ color: '#00d9ff', fontSize: 20 }} />
                    <Title level={4} style={{ margin: 0, color: '#00d9ff' }}>
                        Additional Construction Inputs
                    </Title>
                </Space>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Review and adjust quantities for each BOQ section. ML-detected values are pre-filled where available.
                    <strong> Select material types</strong> to get accurate rates. Leave blank to use auto-calculated defaults.
                </Paragraph>
            </Card>

            {/* Quick Summary */}
            <Card className="glass-card" style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Floor Area (ML)"
                            value={mlFloorArea}
                            precision={2}
                            suffix="m²"
                            valueStyle={{ color: '#52c41a', fontSize: 18 }}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Net Wall Area (ML)"
                            value={mlNetWallArea}
                            precision={2}
                            suffix="m²"
                            valueStyle={{ color: '#00d9ff', fontSize: 18 }}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Doors (ML)"
                            value={mlDoors}
                            valueStyle={{ color: '#faad14', fontSize: 18 }}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Windows (ML)"
                            value={mlWindows}
                            valueStyle={{ color: '#1890ff', fontSize: 18 }}
                        />
                    </Col>
                </Row>
            </Card>

            {/* Collapsible sections */}
            <Card className="glass-card">
                <Collapse
                    defaultActiveKey={['masonry', 'finishes', 'doorsWindows', 'mep']}
                    items={collapseItems}
                    style={{ background: 'transparent' }}
                    ghost
                />
            </Card>
        </>
    );
};

export default ManualInputStep;
