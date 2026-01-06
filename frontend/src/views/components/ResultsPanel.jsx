import { useState } from 'react';
import {
    Card,
    Alert,
    Row,
    Col,
    Statistic,
    Table,
    Divider,
    Typography,
    Space,
    Tag,
    Spin,
    Empty,
    Tabs,
    Radio,
    Image
} from 'antd';
import {
    BorderOutlined,
    AppstoreOutlined,
    HomeOutlined,
    AreaChartOutlined,
    CheckCircleOutlined,
    DollarOutlined,
    SafetyCertificateOutlined,
    BlockOutlined,
    PictureOutlined,
    TableOutlined
} from '@ant-design/icons';
import { generateBOQData } from '../../models/boqModel';
import { generateManualBOQData } from '../../models/manualInputModel';
import { getTableColumns } from './tableConfig.jsx';

const { Title, Text, Paragraph } = Typography;

const getRoomScheduleColumns = () => [
    {
        title: 'Room ID',
        dataIndex: 'room_id',
        key: 'room_id',
        width: 100,
        render: (id) => (
            <Tag color="blue">Room {id}</Tag>
        )
    },
    {
        title: 'Net Area',
        dataIndex: 'area_m2',
        key: 'area_m2',
        width: 150,
        render: (area) => (
            <Text strong style={{ color: '#52c41a' }}>
                {area.toFixed(2)} m²
            </Text>
        )
    },
    {
        title: 'Flooring Cost Estimate',
        dataIndex: 'flooring_cost_estimate',
        key: 'flooring_cost_estimate',
        width: 180,
        render: (cost) => (
            <Text strong style={{ color: '#faad14' }}>
                Rs. {cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
        )
    }
];

/**
 * Panel showing analysis results, BOQ table, and cost estimates.
 * 
 * @param {Object} props - Component properties
 * @param {Object|null} props.results - Analysis results from API
 * @param {boolean} props.loading - Whether analysis is in progress
 * @param {string|null} props.error - Error message if analysis failed
 * @param {Function} props.onErrorClose - Handler for closing error alert
 */
const ResultsPanel = ({ results, loading, error, onErrorClose, manualInputs, manualCosts, hasManualInputs, previewImage }) => {
    const [viewMode, setViewMode] = useState('original');
    const columns = getTableColumns();
    const roomColumns = getRoomScheduleColumns();

    // Combine ML-detected items with manually-input items
    const getCombinedBOQData = () => {
        const mlItems = results ? generateBOQData(results) : [];
        const manualItems = hasManualInputs ? generateManualBOQData(manualInputs) : [];
        return [...mlItems, ...manualItems];
    };

    // Calculate combined total
    const getCombinedTotal = () => {
        const mlTotal = results?.costs?.estimates?.basic_finish || 0;
        const manualTotal = manualCosts?.total || 0;
        return mlTotal + manualTotal;
    };

    // Get room data with keys for table
    const getRoomData = () => {
        if (!results?.room_detection?.rooms) return [];
        return results.room_detection.rooms.map((room, index) => ({
            ...room,
            key: `room-${room.room_id}`
        }));
    };

    // Calculate total flooring cost
    const getTotalFlooringCost = () => {
        if (!results?.room_detection?.rooms) return 0;
        return results.room_detection.rooms.reduce(
            (sum, room) => sum + room.flooring_cost_estimate,
            0
        );
    };

    return (
        <>
            {/* Error display */}
            {error && (
                <Alert
                    message="Processing Error"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    onClose={onErrorClose}
                    style={{ marginBottom: '24px' }}
                />
            )}

            {/* Loading state */}
            {loading && (
                <Card className="results-card glass-card loading-card">
                    <div className="loading-container">
                        <Spin size="large" />
                        <Title level={4} style={{ marginTop: '24px', color: '#00d9ff' }}>
                            Processing Floor Plan
                        </Title>
                        <Paragraph type="secondary">
                            Our AI is analyzing walls, doors, windows, and detecting rooms...
                        </Paragraph>
                    </div>
                </Card>
            )}

            {/* Results display */}
            {results && !loading && (
                <>
                    {/* Warning if image may not be a valid floor plan */}
                    {results.quantities.warning && (
                        <Alert
                            message="Image Validation Warning"
                            description={results.quantities.warning}
                            type="warning"
                            showIcon
                            style={{ marginBottom: '24px' }}
                        />
                    )}

                    {/* Summary statistics cards */}
                    <Card className="summary-card glass-card" style={{ marginBottom: '24px' }}>
                        <Row gutter={[16, 16]}>
                            <Col xs={12} sm={6}>
                                <Statistic
                                    title="Wall Length"
                                    value={results.quantities.wall_total_length_m}
                                    precision={2}
                                    suffix="m"
                                    prefix={<BorderOutlined />}
                                    valueStyle={{ color: '#00d9ff' }}
                                />
                            </Col>
                            <Col xs={12} sm={6}>
                                <Statistic
                                    title="Net Wall Area"
                                    value={results.quantities.wall_net_surface_area_m2}
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
                                    value={results.room_detection?.rooms?.length || 0}
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
                                    value={results.quantities.item_counts.doors}
                                    prefix={<HomeOutlined />}
                                    valueStyle={{ color: '#faad14', fontSize: '20px' }}
                                />
                            </Col>
                            <Col xs={8} sm={6}>
                                <Statistic
                                    title="Windows"
                                    value={results.quantities.item_counts.windows}
                                    prefix={<BorderOutlined />}
                                    valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                                />
                            </Col>
                        </Row>
                    </Card>

                    {/* View Options Toggle */}
                    {(previewImage || results.room_detection?.room_map_base64) && (
                        <Card className="view-options-card glass-card" style={{ marginBottom: '24px' }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Text strong style={{ color: '#00d9ff' }}>
                                    <PictureOutlined style={{ marginRight: 8 }} />
                                    View Options
                                </Text>
                                <Radio.Group
                                    value={viewMode}
                                    onChange={(e) => setViewMode(e.target.value)}
                                    buttonStyle="solid"
                                    style={{ marginBottom: '16px' }}
                                >
                                    <Radio.Button value="original">
                                        <PictureOutlined /> Original
                                    </Radio.Button>
                                    <Radio.Button
                                        value="detections"
                                        disabled={!results.detection_overlay_base64}
                                    >
                                        <AppstoreOutlined /> Detections
                                    </Radio.Button>
                                    <Radio.Button
                                        value="roomMap"
                                        disabled={!results.room_detection?.room_map_base64}
                                    >
                                        <BlockOutlined /> Room Map
                                    </Radio.Button>
                                </Radio.Group>

                                <div className="image-preview-container" style={{
                                    textAlign: 'center',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    borderRadius: '8px',
                                    padding: '16px'
                                }}>
                                    {viewMode === 'original' && previewImage && (
                                        <Image
                                            src={previewImage}
                                            alt="Original Floor Plan"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '400px',
                                                borderRadius: '8px'
                                            }}
                                            placeholder={
                                                <div style={{
                                                    width: '100%',
                                                    height: '200px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'rgba(0,0,0,0.2)'
                                                }}>
                                                    <Spin />
                                                </div>
                                            }
                                        />
                                    )}
                                    {viewMode === 'detections' && results.detection_overlay_base64 && (
                                        <Image
                                            src={`data:image/png;base64,${results.detection_overlay_base64}`}
                                            alt="Detection Overlay"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '400px',
                                                borderRadius: '8px'
                                            }}
                                            placeholder={
                                                <div style={{
                                                    width: '100%',
                                                    height: '200px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'rgba(0,0,0,0.2)'
                                                }}>
                                                    <Spin />
                                                </div>
                                            }
                                        />
                                    )}
                                    {viewMode === 'roomMap' && results.room_detection?.room_map_base64 && (
                                        <Image
                                            src={`data:image/png;base64,${results.room_detection.room_map_base64}`}
                                            alt="Room Detection Map"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '400px',
                                                borderRadius: '8px'
                                            }}
                                            placeholder={
                                                <div style={{
                                                    width: '100%',
                                                    height: '200px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'rgba(0,0,0,0.2)'
                                                }}>
                                                    <Spin />
                                                </div>
                                            }
                                        />
                                    )}
                                    {viewMode === 'original' && !previewImage && (
                                        <Empty description="No original image available" />
                                    )}
                                </div>

                                {viewMode === 'detections' && (
                                    <div style={{ marginTop: '12px' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            Green boxes: Doors | Red boxes: Windows | Labels show confidence scores
                                        </Text>
                                    </div>
                                )}
                                {viewMode === 'roomMap' && (
                                    <div style={{ marginTop: '12px' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            Each color represents a distinct room. White areas are walls, cyan rectangles indicate doors, yellow rectangles indicate windows.
                                        </Text>
                                    </div>
                                )}
                            </Space>
                        </Card>
                    )}

                    {/* BOQ and Room Schedule Tabs */}
                    <Card
                        className="boq-card glass-card"
                        style={{ marginBottom: '24px' }}
                    >
                        <Tabs
                            defaultActiveKey="boq"
                            type="card"
                            items={[
                                {
                                    key: 'boq',
                                    label: (
                                        <span>
                                            <AreaChartOutlined />
                                            Bill of Quantities
                                        </span>
                                    ),
                                    children: (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                <Space>
                                                    <AreaChartOutlined style={{ color: '#00d9ff' }} />
                                                    <Text strong style={{ color: '#00d9ff' }}>BOQ Summary</Text>
                                                </Space>
                                                <Tag color="green" icon={<CheckCircleOutlined />}>
                                                    Analysis Complete
                                                </Tag>
                                            </div>
                                            <Table
                                                columns={columns}
                                                dataSource={getCombinedBOQData()}
                                                pagination={false}
                                                size="middle"
                                                className="boq-table"
                                                rowClassName={(record) => record.type === 'manual' ? 'manual-item-row' : ''}
                                                summary={() => (
                                                    <Table.Summary fixed>
                                                        <Table.Summary.Row className="summary-row">
                                                            <Table.Summary.Cell index={0} colSpan={5}>
                                                                <Text strong style={{ fontSize: '16px' }}>
                                                                    <DollarOutlined /> Estimated Project Costs
                                                                </Text>
                                                            </Table.Summary.Cell>
                                                            <Table.Summary.Cell index={1}>
                                                                <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                                                                </Text>
                                                            </Table.Summary.Cell>
                                                        </Table.Summary.Row>
                                                    </Table.Summary>
                                                )}
                                            />
                                        </>
                                    )
                                },
                                {
                                    key: 'rooms',
                                    label: (
                                        <span>
                                            <TableOutlined />
                                            Room Schedule
                                        </span>
                                    ),
                                    children: (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                <Space>
                                                    <BlockOutlined style={{ color: '#faad14' }} />
                                                    <Text strong style={{ color: '#faad14' }}>Room Schedule</Text>
                                                </Space>
                                                <Tag color="gold">
                                                    {results.room_detection?.rooms?.length || 0} Rooms Detected
                                                </Tag>
                                            </div>

                                            {results.room_detection?.rooms?.length > 0 ? (
                                                <>
                                                    <Table
                                                        columns={roomColumns}
                                                        dataSource={getRoomData()}
                                                        pagination={false}
                                                        size="middle"
                                                        className="boq-table room-schedule-table"
                                                        summary={() => (
                                                            <Table.Summary fixed>
                                                                <Table.Summary.Row className="summary-row">
                                                                    <Table.Summary.Cell index={0}>
                                                                        <Text strong>TOTAL</Text>
                                                                    </Table.Summary.Cell>
                                                                    <Table.Summary.Cell index={1}>
                                                                        <Text strong style={{ color: '#52c41a' }}>
                                                                            {results.room_detection.total_floor_area_m2.toFixed(2)} m²
                                                                        </Text>
                                                                    </Table.Summary.Cell>
                                                                    <Table.Summary.Cell index={2}>
                                                                        <Text strong style={{ color: '#faad14' }}>
                                                                            Rs. {getTotalFlooringCost().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </Text>
                                                                    </Table.Summary.Cell>
                                                                </Table.Summary.Row>
                                                            </Table.Summary>
                                                        )}
                                                    />
                                                    <Divider />
                                                    <Row gutter={[16, 16]}>
                                                        <Col xs={24} sm={12}>
                                                            <Card size="small" className="estimate-card basic">
                                                                <Statistic
                                                                    title="Total Net Floor Area"
                                                                    value={results.room_detection.total_floor_area_m2}
                                                                    precision={2}
                                                                    suffix="m²"
                                                                    valueStyle={{ color: '#52c41a' }}
                                                                />
                                                            </Card>
                                                        </Col>
                                                        <Col xs={24} sm={12}>
                                                            <Card size="small" className="estimate-card premium">
                                                                <Statistic
                                                                    title="Total Flooring Cost"
                                                                    value={getTotalFlooringCost()}
                                                                    precision={2}
                                                                    prefix="Rs. "
                                                                    valueStyle={{ color: '#faad14' }}
                                                                />
                                                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                                                    Rate: Rs. 20,000.00/m²
                                                                </Text>
                                                            </Card>
                                                        </Col>
                                                    </Row>
                                                </>
                                            ) : (
                                                <Empty
                                                    description={
                                                        <Text type="secondary">
                                                            No rooms detected. This may happen if the floor plan doesn't have clearly defined wall boundaries.
                                                        </Text>
                                                    }
                                                />
                                            )}
                                        </>
                                    )
                                }
                            ]}
                        />

                        {/* Cost estimate cards */}
                        <Divider />
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={8}>
                                <Card size="small" className="estimate-card basic">
                                    <Statistic
                                        title="Basic Finish"
                                        value={results.costs.estimates.basic_finish}
                                        precision={2}
                                        prefix="Rs. "
                                        valueStyle={{ color: '#52c41a' }}
                                    />
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                        Painting + Doors/Windows
                                    </Text>
                                </Card>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Card size="small" className="estimate-card standard">
                                    <Statistic
                                        title="Standard Finish"
                                        value={results.costs.estimates.standard_finish}
                                        precision={2}
                                        prefix="Rs. "
                                        valueStyle={{ color: '#1890ff' }}
                                    />
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                        Plastering + Doors/Windows
                                    </Text>
                                </Card>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Card size="small" className="estimate-card premium">
                                    <Statistic
                                        title="Premium Finish"
                                        value={results.costs.estimates.premium_finish}
                                        precision={2}
                                        prefix="Rs. "
                                        valueStyle={{ color: '#faad14' }}
                                    />
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                        Tiling + Doors/Windows
                                    </Text>
                                </Card>
                            </Col>
                        </Row>

                        {/* Processing information footer */}
                        <Divider />
                        <Row justify="space-between" align="middle">
                            <Col>
                                <Space>
                                    <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                                    <Text type="secondary">
                                        Processed in {results.input_parameters?.file_size_kb?.toFixed(1) || 'N/A'} KB -
                                        Scale: {results.input_parameters?.scale_ppm} px/m -
                                        Height: {results.input_parameters?.wall_height_m}m
                                    </Text>
                                </Space>
                            </Col>
                            <Col>
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                    {new Date().toLocaleString()}
                                </Text>
                            </Col>
                        </Row>
                    </Card>
                </>
            )}

            {/* Empty state when no results yet */}
            {!results && !loading && !error && (
                <Card className="empty-card glass-card">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div>
                                <Title level={4} style={{ color: '#64748b' }}>
                                    Ready to Analyze
                                </Title>
                                <Paragraph type="secondary">
                                    Upload a floor plan image and configure the parameters on the left to generate a Bill of Quantities and Room Schedule.
                                </Paragraph>
                            </div>
                        }
                    />
                </Card>
            )}
        </>
    );
};

export default ResultsPanel;
