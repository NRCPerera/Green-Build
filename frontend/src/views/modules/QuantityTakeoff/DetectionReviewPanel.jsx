/**
 * Detection Review Panel — Step 1
 *
 * Shows ML-detected elements (walls, doors, windows, rooms) with
 * original image, detection overlay, and room map toggles.
 * User reviews before proceeding to manual inputs.
 */

import { useState } from 'react';
import {
    Card, Row, Col, Statistic, Divider, Typography, Space,
    Tag, Spin, Empty, Radio, Image, Alert, Table
} from 'antd';
import {
    BorderOutlined, AppstoreOutlined, HomeOutlined,
    BlockOutlined, PictureOutlined, CheckCircleOutlined,
    EyeOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const getRoomColumns = () => [
    {
        title: 'Room ID',
        dataIndex: 'room_id',
        key: 'room_id',
        width: 100,
        render: (id) => <Tag color="blue">Room {id}</Tag>
    },
    {
        title: 'Net Area',
        dataIndex: 'area_m2',
        key: 'area_m2',
        width: 150,
        render: (area) => (
            <Text strong style={{ color: '#52c41a' }}>
                {area?.toFixed(2)} m²
            </Text>
        )
    }
];

const DetectionReviewPanel = ({ results, previewImage, loading, error, onErrorClose }) => {
    const [viewMode, setViewMode] = useState('original');
    const roomColumns = getRoomColumns();

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

    const rooms = results.room_detection?.rooms || [];
    const roomData = rooms.map((room) => ({ ...room, key: `room-${room.room_id}` }));

    return (
        <>
            {/* Validation warning */}
            {results.quantities?.warning && (
                <Alert
                    message="Image Validation Warning"
                    description={results.quantities.warning}
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
                        AI Detection Results
                    </Title>
                    <Tag color="green" icon={<CheckCircleOutlined />}>Detection Complete</Tag>
                </Space>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Review the elements detected by AI below. These values will be used to generate your BOQ.
                    You can adjust them in the next step.
                </Paragraph>
            </Card>

            {/* Summary statistics */}
            <Card className="glass-card" style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Wall Length"
                            value={results.quantities?.wall_total_length_m || 0}
                            precision={2}
                            suffix="m"
                            prefix={<BorderOutlined />}
                            valueStyle={{ color: '#00d9ff' }}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Net Wall Area"
                            value={results.quantities?.wall_net_surface_area_m2 || 0}
                            precision={2}
                            suffix="m²"
                            prefix={<AppstoreOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Total Floor Area"
                            value={results.room_detection?.total_floor_area_m2 || 0}
                            precision={2}
                            suffix="m²"
                            prefix={<BlockOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Rooms Detected"
                            value={rooms.length}
                            prefix={<HomeOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Col>
                </Row>
                <Divider style={{ margin: '16px 0' }} />
                <Row gutter={[16, 16]}>
                    <Col xs={8} sm={6}>
                        <Statistic
                            title="Doors"
                            value={results.quantities?.item_counts?.doors || 0}
                            prefix={<HomeOutlined />}
                            valueStyle={{ color: '#faad14', fontSize: 20 }}
                        />
                    </Col>
                    <Col xs={8} sm={6}>
                        <Statistic
                            title="Windows"
                            value={results.quantities?.item_counts?.windows || 0}
                            prefix={<BorderOutlined />}
                            valueStyle={{ color: '#1890ff', fontSize: 20 }}
                        />
                    </Col>
                </Row>
            </Card>

            {/* Image View Toggle */}
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={14}>
                    <Card className="glass-card">
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
                                <Radio.Button value="detections" disabled={!results.detection_overlay_base64}>
                                    <AppstoreOutlined /> Detections
                                </Radio.Button>
                                <Radio.Button value="roomMap" disabled={!results.room_detection?.room_map_base64}>
                                    <BlockOutlined /> Room Map
                                </Radio.Button>
                            </Radio.Group>

                            <div style={{
                                textAlign: 'center',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: 8,
                                padding: 16
                            }}>
                                {viewMode === 'original' && previewImage && (
                                    <Image
                                        src={previewImage}
                                        alt="Original Floor Plan"
                                        style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8 }}
                                        placeholder={<Spin />}
                                    />
                                )}
                                {viewMode === 'detections' && results.detection_overlay_base64 && (
                                    <Image
                                        src={`data:image/png;base64,${results.detection_overlay_base64}`}
                                        alt="Detection Overlay"
                                        style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8 }}
                                        placeholder={<Spin />}
                                    />
                                )}
                                {viewMode === 'roomMap' && results.room_detection?.room_map_base64 && (
                                    <Image
                                        src={`data:image/png;base64,${results.room_detection.room_map_base64}`}
                                        alt="Room Detection Map"
                                        style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8 }}
                                        placeholder={<Spin />}
                                    />
                                )}
                                {viewMode === 'original' && !previewImage && (
                                    <Empty description="No original image available" />
                                )}
                            </div>

                            {viewMode === 'detections' && (
                                <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                                    Green boxes: Doors | Red boxes: Windows | Labels show confidence scores
                                </Text>
                            )}
                            {viewMode === 'roomMap' && (
                                <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                                    Each color = distinct room. White = walls, Cyan = doors, Yellow = windows.
                                </Text>
                            )}
                        </Space>
                    </Card>
                </Col>

                {/* Room Schedule */}
                <Col xs={24} lg={10}>
                    <Card className="glass-card" title={
                        <Space>
                            <BlockOutlined style={{ color: '#faad14' }} />
                            <span>Room Schedule</span>
                            <Tag color="gold">{rooms.length} Rooms</Tag>
                        </Space>
                    }>
                        {roomData.length > 0 ? (
                            <>
                                <Table
                                    columns={roomColumns}
                                    dataSource={roomData}
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
                                                        {(results.room_detection?.total_floor_area_m2 || 0).toFixed(2)} m²
                                                    </Text>
                                                </Table.Summary.Cell>
                                            </Table.Summary.Row>
                                        </Table.Summary>
                                    )}
                                />
                            </>
                        ) : (
                            <Empty description={
                                <Text type="secondary">
                                    No rooms detected. This may happen if the floor plan doesn't have clearly defined wall boundaries.
                                </Text>
                            } />
                        )}
                    </Card>
                </Col>
            </Row>
        </>
    );
};

export default DetectionReviewPanel;
