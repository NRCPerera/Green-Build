import { useEffect, useState, useCallback } from 'react';
import {
    Card, Button, Tabs, Upload, Progress, message, Modal,
    Spin, Empty, Tag, Statistic, Row, Col, Descriptions, Table
} from 'antd';
import {
    ArrowLeftOutlined,
    UploadOutlined,
    FileImageOutlined,
    DeleteOutlined,
    EyeOutlined,
    SettingOutlined,
    BarChartOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import useProjectsController from '../../controllers/useProjectsController';
import { projectApi } from '../../services/projectService';

const { Dragger } = Upload;

const ProjectDetailView = ({ project, onBack, onSelectFloorPlan }) => {
    const [activeTab, setActiveTab] = useState('floorplans');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [boqReports, setBOQReports] = useState([]);
    const [selectedBOQ, setSelectedBOQ] = useState(null);
    const [boqModalVisible, setBOQModalVisible] = useState(false);
    const [boqLoading, setBOQLoading] = useState(false);

    const {
        floorPlans,
        loading,
        fetchFloorPlans,
        uploadFloorPlan,
        deleteFloorPlan,
        fetchFloorPlan
    } = useProjectsController();

    useEffect(() => {
        if (project?._id) {
            fetchFloorPlans(project._id);
            fetchBOQReports();
        }
    }, [project?._id, fetchFloorPlans]);

    const fetchBOQReports = async () => {
        if (!project?._id) return;
        setBOQLoading(true);
        try {
            const response = await projectApi.getBOQReports(project._id);
            if (response.success) {
                setBOQReports(response.data.reports);
            }
        } catch (error) {
            console.error('Failed to fetch BOQ reports:', error);
        } finally {
            setBOQLoading(false);
        }
    };

    const handleViewBOQ = async (reportId) => {
        try {
            const response = await projectApi.getBOQReport(project._id, reportId);
            if (response.success) {
                setSelectedBOQ(response.data.report);
                setBOQModalVisible(true);
            }
        } catch (error) {
            message.error('Failed to load BOQ report');
        }
    };

    const handleUpload = async (file) => {
        setUploading(true);
        setUploadProgress(0);

        try {
            const result = await uploadFloorPlan(project._id, file, {
                scale: 100,
                wallHeight: 2.7,
                onProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percent);
                }
            });

            if (result.success) {
                message.success('Floor plan uploaded and analyzed successfully!');
                fetchFloorPlans(project._id);
                fetchBOQReports(); // Refresh BOQ reports after new floor plan
            } else {
                message.error(result.error || 'Upload failed');
            }
        } catch (error) {
            message.error('Failed to upload floor plan');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }

        return false;
    };

    const handleDeleteFloorPlan = async (floorPlanId, floorPlanName) => {
        Modal.confirm({
            title: 'Delete Floor Plan',
            content: `Are you sure you want to delete "${floorPlanName}"?`,
            okText: 'Delete',
            okType: 'danger',
            onOk: async () => {
                const result = await deleteFloorPlan(project._id, floorPlanId);
                if (result.success) {
                    message.success('Floor plan deleted successfully');
                } else {
                    message.error(result.error || 'Failed to delete');
                }
            }
        });
    };

    const handleViewFloorPlan = async (floorPlan) => {
        const result = await fetchFloorPlan(project._id, floorPlan._id);
        if (result.success) {
            setSelectedFloorPlan(result.floorPlan);
            setViewModalVisible(true);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'uploaded': 'default',
            'processing': 'processing',
            'processed': 'success',
            'failed': 'error',
            'archived': 'default'
        };
        return colors[status] || 'default';
    };

    const calculateTotals = () => {
        let totalWallArea = 0;
        let totalDoors = 0;
        let totalWindows = 0;
        let totalRooms = 0;

        floorPlans.forEach(fp => {
            if (fp.mlAnalysis?.isProcessed) {
                totalWallArea += fp.mlAnalysis.walls?.netSurfaceArea || 0;
                totalDoors += fp.mlAnalysis.doors?.count || 0;
                totalWindows += fp.mlAnalysis.windows?.count || 0;
                totalRooms += fp.mlAnalysis.rooms?.length || 0;
            }
        });

        return { totalWallArea, totalDoors, totalWindows, totalRooms };
    };

    const totals = calculateTotals();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={onBack}
                    className="!text-gray-400 hover:!text-white"
                />
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                        <Tag color={project.status === 'in-progress' ? 'processing' : 'default'}>
                            {project.status?.replace('-', ' ').toUpperCase()}
                        </Tag>
                    </div>
                    {project.description && (
                        <p className="text-gray-400 mt-1">{project.description}</p>
                    )}
                </div>
            </div>

            {/* Summary Stats */}
            <Row gutter={16}>
                <Col span={6}>
                    <Card className="!bg-dark-800/50 !border-white/10">
                        <Statistic
                            title={<span className="text-gray-400">Floor Plans</span>}
                            value={floorPlans.length}
                            prefix={<FileImageOutlined className="text-primary-400" />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="!bg-dark-800/50 !border-white/10">
                        <Statistic
                            title={<span className="text-gray-400">Wall Area</span>}
                            value={totals.totalWallArea.toFixed(1)}
                            suffix="m²"
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="!bg-dark-800/50 !border-white/10">
                        <Statistic
                            title={<span className="text-gray-400">Doors</span>}
                            value={totals.totalDoors}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="!bg-dark-800/50 !border-white/10">
                        <Statistic
                            title={<span className="text-gray-400">Windows</span>}
                            value={totals.totalWindows}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Main Content */}
            <Card className="!bg-dark-800/50 !border-white/10">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'floorplans',
                            label: <span className="text-gray-300">📐 Floor Plans</span>,
                            children: (
                                <div className="space-y-6">
                                    {/* Upload Area */}
                                    <Dragger
                                        name="floorPlan"
                                        multiple={false}
                                        accept="image/*"
                                        showUploadList={false}
                                        beforeUpload={handleUpload}
                                        disabled={uploading}
                                        className="!bg-dark-700/50 !border-white/10 hover:!border-primary-500/50"
                                    >
                                        {uploading ? (
                                            <div className="py-8">
                                                <Spin size="large" />
                                                <p className="text-gray-400 mt-4">Analyzing floor plan...</p>
                                                <Progress
                                                    percent={uploadProgress}
                                                    status="active"
                                                    className="max-w-xs mx-auto mt-4"
                                                />
                                            </div>
                                        ) : (
                                            <div className="py-8">
                                                <p className="text-4xl mb-4">📤</p>
                                                <p className="text-white text-lg">
                                                    Click or drag floor plan to upload
                                                </p>
                                                <p className="text-gray-400 text-sm mt-2">
                                                    Supports JPG, PNG, WebP (max 50MB)
                                                </p>
                                            </div>
                                        )}
                                    </Dragger>

                                    {/* Floor Plans List */}
                                    {loading && floorPlans.length === 0 ? (
                                        <div className="flex justify-center py-8">
                                            <Spin size="large" />
                                        </div>
                                    ) : floorPlans.length === 0 ? (
                                        <Empty
                                            description={
                                                <span className="text-gray-400">
                                                    No floor plans yet. Upload one to start analysis.
                                                </span>
                                            }
                                        />
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {floorPlans.map((fp) => (
                                                <Card
                                                    key={fp._id}
                                                    className="!bg-dark-700/50 !border-white/10"
                                                    actions={[
                                                        <Button
                                                            type="text"
                                                            icon={<EyeOutlined />}
                                                            onClick={() => handleViewFloorPlan(fp)}
                                                        >
                                                            View
                                                        </Button>,
                                                        <Button
                                                            type="text"
                                                            icon={<DeleteOutlined />}
                                                            danger
                                                            onClick={() => handleDeleteFloorPlan(fp._id, fp.name)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    ]}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-16 h-16 bg-dark-600 rounded-lg flex items-center justify-center">
                                                            <FileImageOutlined className="text-2xl text-gray-400" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-white font-medium">{fp.name}</h4>
                                                                <Tag color={getStatusColor(fp.status)}>
                                                                    {fp.status}
                                                                </Tag>
                                                            </div>
                                                            {fp.mlAnalysis?.isProcessed && (
                                                                <div className="mt-2 flex gap-4 text-sm text-gray-400">
                                                                    <span>🧱 {fp.mlAnalysis.walls?.netSurfaceArea?.toFixed(1) || 0} m²</span>
                                                                    <span>🚪 {fp.mlAnalysis.doors?.count || 0}</span>
                                                                    <span>🪟 {fp.mlAnalysis.windows?.count || 0}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        },
                        {
                            key: 'details',
                            label: <span className="text-gray-300">⚙️ Project Details</span>,
                            children: (
                                <Descriptions
                                    column={2}
                                    className="!text-white"
                                    labelStyle={{ color: '#9ca3af' }}
                                    contentStyle={{ color: '#fff' }}
                                >
                                    <Descriptions.Item label="Project Type">
                                        {project.projectType?.replace('-', ' ')}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Status">
                                        {project.status?.replace('-', ' ')}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Created">
                                        {new Date(project.createdAt).toLocaleDateString()}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Last Updated">
                                        {new Date(project.updatedAt).toLocaleDateString()}
                                    </Descriptions.Item>
                                    {project.location?.city && (
                                        <Descriptions.Item label="Location">
                                            {project.location.city}, {project.location.country}
                                        </Descriptions.Item>
                                    )}
                                    {project.client?.name && (
                                        <Descriptions.Item label="Client">
                                            {project.client.name}
                                        </Descriptions.Item>
                                    )}
                                </Descriptions>
                            )
                        },
                        {
                            key: 'boq',
                            label: <span className="text-gray-300">📋 BOQ Reports</span>,
                            children: (
                                <div className="space-y-4">
                                    {boqLoading ? (
                                        <div className="flex justify-center py-8">
                                            <Spin size="large" />
                                        </div>
                                    ) : boqReports.length === 0 ? (
                                        <Empty
                                            description={
                                                <span className="text-gray-400">
                                                    No BOQ reports yet. Upload a floor plan to generate a BOQ.
                                                </span>
                                            }
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            {boqReports.map(report => (
                                                <Card
                                                    key={report._id}
                                                    className="!bg-dark-700/50 !border-white/10"
                                                    size="small"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <FileTextOutlined className="text-2xl text-primary-400" />
                                                            <div>
                                                                <h4 className="text-white font-medium">{report.title}</h4>
                                                                <p className="text-gray-400 text-sm">
                                                                    {report.reportNumber} • {new Date(report.createdAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <p className="text-gray-400 text-xs">Grand Total</p>
                                                                <p className="text-white font-bold">
                                                                    Rs. {report.summary?.grandTotal?.toLocaleString() || 0}
                                                                </p>
                                                            </div>
                                                            <Tag color={report.status === 'final' ? 'success' : 'default'}>
                                                                {report.status?.toUpperCase()}
                                                            </Tag>
                                                            <Button
                                                                type="primary"
                                                                icon={<EyeOutlined />}
                                                                onClick={() => handleViewBOQ(report._id)}
                                                            >
                                                                View Details
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        }
                    ]}
                />
            </Card>

            {/* Floor Plan View Modal */}
            <Modal
                title={selectedFloorPlan?.name || 'Floor Plan Details'}
                open={viewModalVisible}
                onCancel={() => setViewModalVisible(false)}
                footer={null}
                width={900}
            >
                {selectedFloorPlan && (
                    <div className="space-y-6">
                        {/* Visualizations */}
                        {selectedFloorPlan.visualizations?.detectionOverlay && (
                            <div>
                                <h4 className="text-gray-400 mb-2">Detection Results</h4>
                                <img
                                    src={`data:image/png;base64,${selectedFloorPlan.visualizations.detectionOverlay}`}
                                    alt="Detection Overlay"
                                    className="w-full rounded-lg"
                                />
                            </div>
                        )}

                        {/* Analysis Results */}
                        {selectedFloorPlan.mlAnalysis?.isProcessed && (
                            <Row gutter={16}>
                                <Col span={6}>
                                    <Statistic
                                        title="Wall Area"
                                        value={selectedFloorPlan.mlAnalysis.walls?.netSurfaceArea?.toFixed(1) || 0}
                                        suffix="m²"
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="Doors"
                                        value={selectedFloorPlan.mlAnalysis.doors?.count || 0}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="Windows"
                                        value={selectedFloorPlan.mlAnalysis.windows?.count || 0}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="Rooms"
                                        value={selectedFloorPlan.mlAnalysis.rooms?.length || 0}
                                    />
                                </Col>
                            </Row>
                        )}

                        {/* Cost Estimates */}
                        {selectedFloorPlan.costEstimates && (
                            <div>
                                <h4 className="text-gray-400 mb-3">Cost Estimates (LKR)</h4>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Card className="!bg-blue-500/10 !border-blue-500/20">
                                            <Statistic
                                                title="Basic Finish"
                                                value={selectedFloorPlan.costEstimates.basicFinish}
                                                prefix="Rs."
                                                valueStyle={{ color: '#60a5fa' }}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card className="!bg-green-500/10 !border-green-500/20">
                                            <Statistic
                                                title="Standard Finish"
                                                value={selectedFloorPlan.costEstimates.standardFinish}
                                                prefix="Rs."
                                                valueStyle={{ color: '#4ade80' }}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card className="!bg-purple-500/10 !border-purple-500/20">
                                            <Statistic
                                                title="Premium Finish"
                                                value={selectedFloorPlan.costEstimates.premiumFinish}
                                                prefix="Rs."
                                                valueStyle={{ color: '#a78bfa' }}
                                            />
                                        </Card>
                                    </Col>
                                </Row>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* BOQ Report Detail Modal */}
            <Modal
                title={selectedBOQ?.title || 'BOQ Report Details'}
                open={boqModalVisible}
                onCancel={() => setBOQModalVisible(false)}
                footer={null}
                width={1000}
            >
                {selectedBOQ && (
                    <div className="space-y-6">
                        {/* Report Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500">Report Number: {selectedBOQ.reportNumber}</p>
                                <p className="text-gray-500">Generated: {new Date(selectedBOQ.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Tag color={selectedBOQ.status === 'final' ? 'success' : 'default'} className="text-lg px-3 py-1">
                                {selectedBOQ.status?.toUpperCase()}
                            </Tag>
                        </div>

                        {/* Items Table */}
                        <Table
                            dataSource={selectedBOQ.items}
                            rowKey="_id"
                            pagination={false}
                            columns={[
                                {
                                    title: 'Category',
                                    dataIndex: 'category',
                                    key: 'category',
                                    render: (cat) => <Tag>{cat?.toUpperCase()}</Tag>
                                },
                                {
                                    title: 'Item',
                                    dataIndex: 'itemName',
                                    key: 'itemName',
                                },
                                {
                                    title: 'Description',
                                    dataIndex: 'description',
                                    key: 'description',
                                    ellipsis: true
                                },
                                {
                                    title: 'Qty',
                                    dataIndex: 'quantity',
                                    key: 'quantity',
                                    render: (qty, record) => `${qty?.toFixed(2)} ${record.unit}`
                                },
                                {
                                    title: 'Unit Rate',
                                    dataIndex: 'unitRate',
                                    key: 'unitRate',
                                    render: (rate) => `Rs. ${rate?.toLocaleString()}`
                                },
                                {
                                    title: 'Total Cost',
                                    dataIndex: 'totalCost',
                                    key: 'totalCost',
                                    render: (cost) => <strong>Rs. {cost?.toLocaleString()}</strong>
                                }
                            ]}
                        />

                        {/* Summary */}
                        <Card className="!bg-dark-100">
                            <Row gutter={16}>
                                <Col span={6}>
                                    <Statistic
                                        title="Subtotal"
                                        value={selectedBOQ.summary?.subtotal}
                                        prefix="Rs."
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title={`Contingency (${selectedBOQ.summary?.contingencyPercent}%)`}
                                        value={selectedBOQ.summary?.contingencyAmount}
                                        prefix="Rs."
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title={`Overhead (${selectedBOQ.summary?.overheadPercent}%)`}
                                        value={selectedBOQ.summary?.overheadAmount}
                                        prefix="Rs."
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="Grand Total"
                                        value={selectedBOQ.summary?.grandTotal}
                                        prefix="Rs."
                                        valueStyle={{ color: '#22c55e', fontWeight: 'bold' }}
                                    />
                                </Col>
                            </Row>
                        </Card>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ProjectDetailView;

