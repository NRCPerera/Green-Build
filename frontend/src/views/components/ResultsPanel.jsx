/**
 * Results Panel Component
 * 
 * Displays the analysis results including summary statistics,
 * BOQ table, and cost estimates.
 */

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
    Empty
} from 'antd';
import {
    BorderOutlined,
    AppstoreOutlined,
    HomeOutlined,
    AreaChartOutlined,
    CheckCircleOutlined,
    DollarOutlined,
    SafetyCertificateOutlined
} from '@ant-design/icons';
import { generateBOQData } from '../../models/boqModel';
import { getTableColumns } from './tableConfig.jsx';

const { Title, Text, Paragraph } = Typography;

/**
 * Panel showing analysis results, BOQ table, and cost estimates.
 * 
 * @param {Object} props - Component properties
 * @param {Object|null} props.results - Analysis results from API
 * @param {boolean} props.loading - Whether analysis is in progress
 * @param {string|null} props.error - Error message if analysis failed
 * @param {Function} props.onErrorClose - Handler for closing error alert
 */
const ResultsPanel = ({ results, loading, error, onErrorClose }) => {
    const columns = getTableColumns();

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
                            Our AI is analyzing walls, doors, and windows...
                        </Paragraph>
                    </div>
                </Card>
            )}

            {/* Results display */}
            {results && !loading && (
                <>
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
                                    suffix="m2"
                                    prefix={<AppstoreOutlined />}
                                    valueStyle={{ color: '#52c41a' }}
                                />
                            </Col>
                            <Col xs={12} sm={6}>
                                <Statistic
                                    title="Doors"
                                    value={results.quantities.item_counts.doors}
                                    prefix={<HomeOutlined />}
                                    valueStyle={{ color: '#faad14' }}
                                />
                            </Col>
                            <Col xs={12} sm={6}>
                                <Statistic
                                    title="Windows"
                                    value={results.quantities.item_counts.windows}
                                    prefix={<BorderOutlined />}
                                    valueStyle={{ color: '#1890ff' }}
                                />
                            </Col>
                        </Row>
                    </Card>

                    {/* BOQ table */}
                    <Card
                        className="boq-card glass-card"
                        title={
                            <Space>
                                <AreaChartOutlined />
                                <span>Bill of Quantities (BOQ)</span>
                            </Space>
                        }
                        extra={
                            <Tag color="green" icon={<CheckCircleOutlined />}>
                                Analysis Complete
                            </Tag>
                        }
                    >
                        <Table
                            columns={columns}
                            dataSource={generateBOQData(results)}
                            pagination={false}
                            size="middle"
                            className="boq-table"
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

                        {/* Cost estimate cards */}
                        <Divider />
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={8}>
                                <Card size="small" className="estimate-card basic">
                                    <Statistic
                                        title="Basic Finish"
                                        value={results.costs.estimates.basic_finish}
                                        precision={2}
                                        prefix="$"
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
                                        prefix="$"
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
                                        prefix="$"
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
                                    Upload a floor plan image and configure the parameters on the left to generate a Bill of Quantities.
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
