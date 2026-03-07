/**
 * Detection Review Panel — Step 1 (REFACTORED)
 *
 * Shows ML-detected elements with editable overlays.
 * User can:
 *   - Approve/delete individual doors & windows
 *   - Adjust wall height and parameters
 *   - Select material types per element
 *   - View detection overlay & room map
 */

import { useState, useEffect } from 'react';
import {
    Card, Row, Col, Statistic, Divider, Typography, Space,
    Tag, Spin, Empty, Radio, Image, Alert, Table, Button,
    InputNumber, Select, Switch, Badge, Tooltip
} from 'antd';
import {
    BorderOutlined, AppstoreOutlined, HomeOutlined,
    BlockOutlined, PictureOutlined, CheckCircleOutlined,
    EyeOutlined, DeleteOutlined, EditOutlined,
    UndoOutlined, CheckOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const DOOR_TYPES = [
    { value: 'wooden', label: 'Wooden Door' },
    { value: 'flush', label: 'Flush Door' },
    { value: 'panel', label: 'Panel Door' },
    { value: 'sliding', label: 'Sliding Door' },
    { value: 'metal', label: 'Metal Door' },
];

const WINDOW_TYPES = [
    { value: 'aluminium', label: 'Aluminium Window' },
    { value: 'wooden', label: 'Wooden Window' },
    { value: 'upvc', label: 'UPVC Window' },
    { value: 'sliding', label: 'Sliding Window' },
    { value: 'casement', label: 'Casement Window' },
];

const FLOORING_TYPES = [
    { value: 'ceramic_tile', label: 'Ceramic Tile' },
    { value: 'porcelain_tile', label: 'Porcelain Tile' },
    { value: 'granite', label: 'Granite' },
    { value: 'marble', label: 'Marble' },
    { value: 'wood_laminate', label: 'Wood Laminate' },
    { value: 'vinyl', label: 'Vinyl' },
    { value: 'carpet', label: 'Carpet' },
];

const CEILING_TYPES = [
    { value: 'plain', label: 'Plain Plastered' },
    { value: 'false', label: 'False Ceiling' },
    { value: 'exposed', label: 'Exposed' },
];

const DetectionReviewPanel = ({ results, previewImage, loading, error, onErrorClose, onDetectionsUpdate }) => {
    const [viewMode, setViewMode] = useState('original');

    // ── Editable detection state ──────────────────────────────
    const [wallHeight, setWallHeight] = useState(2.7);
    const [doors, setDoors] = useState([]);
    const [windows, setWindows] = useState([]);
    const [rooms, setRooms] = useState([]);

    // Initialize editable state from ML results
    useEffect(() => {
        if (!results) return;

        const q = results.quantities || {};
        const d = results.detections || {};

        // Doors
        const doorCount = q.item_counts?.doors || d.doors || 0;
        setDoors(
            Array.from({ length: doorCount }, (_, i) => ({
                id: `d${i + 1}`,
                type: 'wooden',
                width: 0.9,
                height: 2.1,
                materialType: 'standard',
                status: 'approved',
            }))
        );

        // Windows
        const windowCount = q.item_counts?.windows || d.windows || 0;
        setWindows(
            Array.from({ length: windowCount }, (_, i) => ({
                id: `w${i + 1}`,
                type: 'aluminium',
                width: 1.2,
                height: 1.0,
                materialType: 'standard',
                status: 'approved',
            }))
        );

        // Rooms
        const roomData = results.room_detection?.rooms || d.rooms?.rooms || [];
        setRooms(
            roomData.map((r, i) => ({
                id: `r${i + 1}`,
                room_id: r.room_id || i + 1,
                type: 'general',
                area: r.area_m2 || r.area || 0,
                flooringMaterial: 'ceramic_tile',
                ceilingType: 'plain',
            }))
        );
    }, [results]);

    // Propagate changes back to parent
    useEffect(() => {
        if (onDetectionsUpdate) {
            onDetectionsUpdate({
                walls: {
                    totalLengthM: results?.quantities?.wall_total_length_m || results?.detections?.walls?.totalLengthM || 0,
                    grossAreaM2: results?.quantities?.wall_gross_surface_area_m2 || results?.detections?.walls?.grossAreaM2 || 0,
                    netAreaM2: results?.quantities?.wall_net_surface_area_m2 || results?.detections?.walls?.netAreaM2 || 0,
                    heightM: wallHeight,
                },
                doors,
                windows,
                rooms,
            });
        }
    }, [wallHeight, doors, windows, rooms]);

    // ── Door/Window handlers ─────────────────────────────────
    const toggleDoorStatus = (id) => {
        setDoors(prev =>
            prev.map(d =>
                d.id === id
                    ? { ...d, status: d.status === 'deleted' ? 'approved' : 'deleted' }
                    : d
            )
        );
    };

    const updateDoor = (id, field, value) => {
        setDoors(prev => prev.map(d => (d.id === id ? { ...d, [field]: value } : d)));
    };

    const toggleWindowStatus = (id) => {
        setWindows(prev =>
            prev.map(w =>
                w.id === id
                    ? { ...w, status: w.status === 'deleted' ? 'approved' : 'deleted' }
                    : w
            )
        );
    };

    const updateWindow = (id, field, value) => {
        setWindows(prev => prev.map(w => (w.id === id ? { ...w, [field]: value } : w)));
    };

    const updateRoom = (id, field, value) => {
        setRooms(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
    };

    // ── Render guards ────────────────────────────────────────
    if (loading) {
        return (
            <Card className="glass-card" style={{ minHeight: 400 }}>
                <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <Spin size="large" />
                    <Title level={4} style={{ marginTop: 24, color: '#00d9ff' }}>
                        Processing Floor Plan
                    </Title>
                    <Paragraph type="secondary">
                        Our AI is analyzing walls, doors, windows, and detecting rooms...
                    </Paragraph>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert
                message="Processing Error"
                description={error}
                type="error"
                showIcon
                closable
                onClose={onErrorClose}
            />
        );
    }

    if (!results) {
        return (
            <Card className="glass-card" style={{ minHeight: 400 }}>
                <Empty description="No detection results yet. Please go back and upload a floor plan." />
            </Card>
        );
    }

    const activeDoors = doors.filter(d => d.status !== 'deleted');
    const activeWindows = windows.filter(w => w.status !== 'deleted');

    // ── Door columns ────────────────────────────────────────
    const doorColumns = [
        {
            title: 'ID',
            dataIndex: 'id',
            width: 60,
            render: (id, record) => (
                <Badge
                    status={record.status === 'deleted' ? 'error' : 'success'}
                    text={<Text delete={record.status === 'deleted'}>{id}</Text>}
                />
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            width: 160,
            render: (type, record) => (
                <Select
                    value={type}
                    onChange={(val) => updateDoor(record.id, 'type', val)}
                    size="small"
                    style={{ width: '100%' }}
                    disabled={record.status === 'deleted'}
                >
                    {DOOR_TYPES.map(t => (
                        <Option key={t.value} value={t.value}>{t.label}</Option>
                    ))}
                </Select>
            ),
        },
        {
            title: 'W (m)',
            dataIndex: 'width',
            width: 80,
            render: (val, record) => (
                <InputNumber
                    value={val}
                    onChange={(v) => updateDoor(record.id, 'width', v)}
                    min={0.3}
                    max={5}
                    step={0.1}
                    size="small"
                    style={{ width: '100%' }}
                    disabled={record.status === 'deleted'}
                />
            ),
        },
        {
            title: 'H (m)',
            dataIndex: 'height',
            width: 80,
            render: (val, record) => (
                <InputNumber
                    value={val}
                    onChange={(v) => updateDoor(record.id, 'height', v)}
                    min={0.5}
                    max={4}
                    step={0.1}
                    size="small"
                    style={{ width: '100%' }}
                    disabled={record.status === 'deleted'}
                />
            ),
        },
        {
            title: '',
            width: 50,
            render: (_, record) => (
                <Tooltip title={record.status === 'deleted' ? 'Restore' : 'Remove'}>
                    <Button
                        type="text"
                        danger={record.status !== 'deleted'}
                        icon={record.status === 'deleted' ? <UndoOutlined /> : <DeleteOutlined />}
                        size="small"
                        onClick={() => toggleDoorStatus(record.id)}
                    />
                </Tooltip>
            ),
        },
    ];

    // ── Window columns ──────────────────────────────────────
    const windowColumns = [
        {
            title: 'ID',
            dataIndex: 'id',
            width: 60,
            render: (id, record) => (
                <Badge
                    status={record.status === 'deleted' ? 'error' : 'success'}
                    text={<Text delete={record.status === 'deleted'}>{id}</Text>}
                />
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            width: 160,
            render: (type, record) => (
                <Select
                    value={type}
                    onChange={(val) => updateWindow(record.id, 'type', val)}
                    size="small"
                    style={{ width: '100%' }}
                    disabled={record.status === 'deleted'}
                >
                    {WINDOW_TYPES.map(t => (
                        <Option key={t.value} value={t.value}>{t.label}</Option>
                    ))}
                </Select>
            ),
        },
        {
            title: 'W (m)',
            dataIndex: 'width',
            width: 80,
            render: (val, record) => (
                <InputNumber
                    value={val}
                    onChange={(v) => updateWindow(record.id, 'width', v)}
                    min={0.2}
                    max={5}
                    step={0.1}
                    size="small"
                    style={{ width: '100%' }}
                    disabled={record.status === 'deleted'}
                />
            ),
        },
        {
            title: 'H (m)',
            dataIndex: 'height',
            width: 80,
            render: (val, record) => (
                <InputNumber
                    value={val}
                    onChange={(v) => updateWindow(record.id, 'height', v)}
                    min={0.2}
                    max={4}
                    step={0.1}
                    size="small"
                    style={{ width: '100%' }}
                    disabled={record.status === 'deleted'}
                />
            ),
        },
        {
            title: '',
            width: 50,
            render: (_, record) => (
                <Tooltip title={record.status === 'deleted' ? 'Restore' : 'Remove'}>
                    <Button
                        type="text"
                        danger={record.status !== 'deleted'}
                        icon={record.status === 'deleted' ? <UndoOutlined /> : <DeleteOutlined />}
                        size="small"
                        onClick={() => toggleWindowStatus(record.id)}
                    />
                </Tooltip>
            ),
        },
    ];

    // ── Room columns ────────────────────────────────────────
    const roomColumns = [
        {
            title: 'Room',
            dataIndex: 'room_id',
            width: 80,
            render: (id) => <Tag color="blue">Room {id}</Tag>,
        },
        {
            title: 'Area (m²)',
            dataIndex: 'area',
            width: 100,
            render: (area, record) => (
                <InputNumber
                    value={area}
                    onChange={(v) => updateRoom(record.id, 'area', v)}
                    min={0}
                    step={0.1}
                    size="small"
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Flooring',
            dataIndex: 'flooringMaterial',
            width: 160,
            render: (val, record) => (
                <Select
                    value={val}
                    onChange={(v) => updateRoom(record.id, 'flooringMaterial', v)}
                    size="small"
                    style={{ width: '100%' }}
                >
                    {FLOORING_TYPES.map(t => (
                        <Option key={t.value} value={t.value}>{t.label}</Option>
                    ))}
                </Select>
            ),
        },
        {
            title: 'Ceiling',
            dataIndex: 'ceilingType',
            width: 140,
            render: (val, record) => (
                <Select
                    value={val}
                    onChange={(v) => updateRoom(record.id, 'ceilingType', v)}
                    size="small"
                    style={{ width: '100%' }}
                >
                    {CEILING_TYPES.map(t => (
                        <Option key={t.value} value={t.value}>{t.label}</Option>
                    ))}
                </Select>
            ),
        },
    ];

    return (
        <>
            {/* Validation warning */}
            {(results.quantities?.warning || results.detections?.warning) && (
                <Alert
                    message="Image Validation Warning"
                    description={results.quantities?.warning || results.detections?.warning}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 24 }}
                />
            )}

            {/* Header */}
            <Card className="glass-card" style={{ marginBottom: 24 }}>
                <Space style={{ marginBottom: 16 }}>
                    <EyeOutlined style={{ color: '#00d9ff', fontSize: 20 }} />
                    <Title level={4} style={{ margin: 0, color: '#00d9ff' }}>
                        Review & Edit Detections
                    </Title>
                    <Tag color="green" icon={<CheckCircleOutlined />}>Detection Complete</Tag>
                </Space>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Review AI-detected elements below. You can <strong>edit types, dimensions, and materials</strong>,
                    or <strong>remove false detections</strong> before generating the BOQ.
                </Paragraph>
            </Card>

            {/* Summary statistics + Wall Height control */}
            <Card className="glass-card" style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={12} sm={5}>
                        <Statistic
                            title="Wall Length"
                            value={results.quantities?.wall_total_length_m || results.detections?.walls?.totalLengthM || 0}
                            precision={2}
                            suffix="m"
                            prefix={<BorderOutlined />}
                            valueStyle={{ color: '#00d9ff' }}
                        />
                    </Col>
                    <Col xs={12} sm={5}>
                        <Statistic
                            title="Net Wall Area"
                            value={results.quantities?.wall_net_surface_area_m2 || results.detections?.walls?.netAreaM2 || 0}
                            precision={2}
                            suffix="m²"
                            prefix={<AppstoreOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Col>
                    <Col xs={12} sm={5}>
                        <Statistic
                            title="Floor Area"
                            value={results.room_detection?.total_floor_area_m2 || 0}
                            precision={2}
                            suffix="m²"
                            prefix={<BlockOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Col>
                    <Col xs={12} sm={4}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                            Wall Height
                        </Text>
                        <InputNumber
                            value={wallHeight}
                            onChange={setWallHeight}
                            min={2.0}
                            max={6.0}
                            step={0.1}
                            addonAfter="m"
                            style={{ width: '100%' }}
                        />
                    </Col>
                    <Col xs={12} sm={5}>
                        <Space direction="vertical" size={0}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Active Elements</Text>
                            <Space size={4}>
                                <Tag color="green">{activeDoors.length} Doors</Tag>
                                <Tag color="blue">{activeWindows.length} Windows</Tag>
                                <Tag color="gold">{rooms.length} Rooms</Tag>
                            </Space>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Row gutter={[24, 24]}>
                {/* Image View Toggle — left side */}
                <Col xs={24} lg={12}>
                    <Card className="glass-card" style={{ marginBottom: 24 }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Text strong style={{ color: '#00d9ff' }}>
                                <PictureOutlined style={{ marginRight: 8 }} />
                                View Options
                            </Text>
                            <Radio.Group
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value)}
                                buttonStyle="solid"
                                style={{ marginBottom: 16 }}
                            >
                                <Radio.Button value="original">
                                    <PictureOutlined /> Original
                                </Radio.Button>
                                <Radio.Button
                                    value="detections"
                                    disabled={!results.detection_overlay_base64 && !results.overlays?.detectionOverlay}
                                >
                                    <AppstoreOutlined /> Detections
                                </Radio.Button>
                                <Radio.Button
                                    value="roomMap"
                                    disabled={!results.room_detection?.room_map_base64 && !results.overlays?.roomMap}
                                >
                                    <BlockOutlined /> Room Map
                                </Radio.Button>
                            </Radio.Group>

                            <div style={{
                                textAlign: 'center',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: 8,
                                padding: 16,
                                minHeight: 250,
                            }}>
                                {viewMode === 'original' && previewImage && (
                                    <Image
                                        src={previewImage}
                                        alt="Original Floor Plan"
                                        style={{ maxWidth: '100%', maxHeight: 350, borderRadius: 8 }}
                                        placeholder={<Spin />}
                                    />
                                )}
                                {viewMode === 'detections' && (results.detection_overlay_base64 || results.overlays?.detectionOverlay) && (
                                    <Image
                                        src={`data:image/png;base64,${results.detection_overlay_base64 || results.overlays?.detectionOverlay}`}
                                        alt="Detection Overlay"
                                        style={{ maxWidth: '100%', maxHeight: 350, borderRadius: 8 }}
                                        placeholder={<Spin />}
                                    />
                                )}
                                {viewMode === 'roomMap' && (results.room_detection?.room_map_base64 || results.overlays?.roomMap) && (
                                    <Image
                                        src={`data:image/png;base64,${results.room_detection?.room_map_base64 || results.overlays?.roomMap}`}
                                        alt="Room Detection Map"
                                        style={{ maxWidth: '100%', maxHeight: 350, borderRadius: 8 }}
                                        placeholder={<Spin />}
                                    />
                                )}
                                {viewMode === 'original' && !previewImage && (
                                    <Empty description="No original image available" />
                                )}
                            </div>
                        </Space>
                    </Card>
                </Col>

                {/* Editable Doors & Windows — right side */}
                <Col xs={24} lg={12}>
                    {/* Doors Table */}
                    <Card
                        className="glass-card"
                        style={{ marginBottom: 24 }}
                        title={
                            <Space>
                                <HomeOutlined style={{ color: '#faad14' }} />
                                <span>Doors</span>
                                <Tag color="green">{activeDoors.length} active</Tag>
                                {doors.length - activeDoors.length > 0 && (
                                    <Tag color="red">{doors.length - activeDoors.length} removed</Tag>
                                )}
                            </Space>
                        }
                        size="small"
                    >
                        {doors.length > 0 ? (
                            <Table
                                columns={doorColumns}
                                dataSource={doors.map(d => ({ ...d, key: d.id }))}
                                pagination={false}
                                size="small"
                                className="boq-table"
                            />
                        ) : (
                            <Empty description="No doors detected" />
                        )}
                    </Card>

                    {/* Windows Table */}
                    <Card
                        className="glass-card"
                        style={{ marginBottom: 24 }}
                        title={
                            <Space>
                                <BorderOutlined style={{ color: '#1890ff' }} />
                                <span>Windows</span>
                                <Tag color="blue">{activeWindows.length} active</Tag>
                                {windows.length - activeWindows.length > 0 && (
                                    <Tag color="red">{windows.length - activeWindows.length} removed</Tag>
                                )}
                            </Space>
                        }
                        size="small"
                    >
                        {windows.length > 0 ? (
                            <Table
                                columns={windowColumns}
                                dataSource={windows.map(w => ({ ...w, key: w.id }))}
                                pagination={false}
                                size="small"
                                className="boq-table"
                            />
                        ) : (
                            <Empty description="No windows detected" />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Room Schedule — editable */}
            <Card
                className="glass-card"
                title={
                    <Space>
                        <BlockOutlined style={{ color: '#faad14' }} />
                        <span>Room Schedule</span>
                        <Tag color="gold">{rooms.length} Rooms</Tag>
                    </Space>
                }
            >
                {rooms.length > 0 ? (
                    <Table
                        columns={roomColumns}
                        dataSource={rooms.map(r => ({ ...r, key: r.id }))}
                        pagination={false}
                        size="small"
                        className="boq-table"
                        summary={() => (
                            <Table.Summary>
                                <Table.Summary.Row>
                                    <Table.Summary.Cell index={0}>
                                        <Text strong>TOTAL</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={1}>
                                        <Text strong style={{ color: '#52c41a' }}>
                                            {rooms.reduce((s, r) => s + (r.area || 0), 0).toFixed(2)} m²
                                        </Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={2} colSpan={2} />
                                </Table.Summary.Row>
                            </Table.Summary>
                        )}
                    />
                ) : (
                    <Empty description={
                        <Text type="secondary">
                            No rooms detected. Room data helps generate accurate finishes and flooring quantities.
                        </Text>
                    } />
                )}
            </Card>
        </>
    );
};

export default DetectionReviewPanel;
