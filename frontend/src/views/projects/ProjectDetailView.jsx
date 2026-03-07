import { useEffect, useState, useMemo } from 'react';
import {
    Card, Button, Tabs, Upload, Progress, message, Modal,
    Spin, Empty, Tag, Statistic, Row, Col, Descriptions, Table, Select
} from 'antd';
import {
    ArrowLeftOutlined, FileImageOutlined, DeleteOutlined,
    EyeOutlined, FileTextOutlined, EditOutlined
} from '@ant-design/icons';
import useProjectsController from '../../controllers/useProjectsController';
import useTaskController from '../../controllers/useTaskController';
import usePMStore, { PROJECT_STATUSES, ROLES } from '../../models/usePMStore';
import { projectApi } from '../../services/projectService';

// PM Components
import TaskBoard from './TaskBoard';
import MilestoneTimeline from './MilestoneTimeline';
import ActivityFeed from './ActivityFeed';

const { Dragger } = Upload;

// ── Data Accessor Helpers ───────────────────────────────────────
const getClientName = (project) => project.clientName || project.client?.name || '';
const getLocationText = (project) => {
    if (typeof project.location === 'string') return project.location;
    const addressParts = [project.location?.address, project.location?.city, project.location?.district, project.location?.province].filter(Boolean);
    return addressParts.join(', ');
};
const getBudgetValue = (project) => {
    if (typeof project.budget === 'number') return project.budget;
    if (typeof project.budget?.estimated === 'number') return project.budget.estimated;
    return 0;
};

// ── Progress Ring Widget ─────────────────────────────────────────
const ProgressRing = ({ percentage }) => {
    const radius = 30;
    const stroke = 5;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    return (
        <div className="progress-ring">
            <svg width="72" height="72">
                <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
                <circle cx="36" cy="36" r={radius} fill="none" stroke="#4ade80" strokeWidth={stroke}
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
            </svg>
            <div className="progress-ring-text">{percentage}%</div>
        </div>
    );
};

const ProjectDetailView = ({ project, onBack, onNavigate }) => {
    const projectId = project?._id || project?.id;

    const userRole = usePMStore((s) => s.userRole);
    const defaultTab = ROLES.find((r) => r.key === userRole)?.defaultTab || 'overview';

    const [activeTab, setActiveTab] = useState(defaultTab);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [boqReports, setBOQReports] = useState([]);
    const [selectedBOQ, setSelectedBOQ] = useState(null);
    const [boqModalVisible, setBOQModalVisible] = useState(false);
    const [boqLoading, setBOQLoading] = useState(false);
    const [projectStatus, setProjectStatus] = useState(project?.status || 'draft');

    const { floorPlans, loading, fetchFloorPlans, uploadFloorPlan, deleteFloorPlan, fetchFloorPlan } = useProjectsController();
    const taskController = useTaskController(projectId);
    const { progress, overdueTasks, upcomingTasks, activity, tasks, milestones } = taskController;
    const logProjectEvent = usePMStore((s) => s.logProjectEvent);
    const trackRecentProject = usePMStore((s) => s.trackRecentProject);

    useEffect(() => {
        if (projectId) {
            fetchFloorPlans(projectId);
            fetchBOQReports();
            trackRecentProject(projectId);
        }
    }, [projectId]);


    const fetchBOQReports = async () => {
        if (!projectId) return;
        setBOQLoading(true);
        try {
            const response = await projectApi.getBOQReports(projectId);
            if (response.success) setBOQReports(response.data.reports);
        } catch (error) {
            console.error('Failed to fetch BOQ reports:', error);
        } finally { setBOQLoading(false); }
    };

    const handleViewBOQ = async (reportId) => {
        try {
            const response = await projectApi.getBOQReport(projectId, reportId);
            if (response.success) { setSelectedBOQ(response.data.report); setBOQModalVisible(true); }
        } catch (error) { message.error('Failed to load BOQ report'); }
    };

    const handleUpload = async (file) => {
        setUploading(true); setUploadProgress(0);
        try {
            const result = await uploadFloorPlan(projectId, file, {
                scale: 100, wallHeight: 2.7,
                onProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total)),
            });
            if (result.success) {
                message.success('Floor plan uploaded and analyzed!');
                fetchFloorPlans(projectId);
                fetchBOQReports();
                logProjectEvent(projectId, 'Floor plan uploaded');
            } else { message.error(result.error || 'Upload failed'); }
        } catch { message.error('Failed to upload floor plan'); }
        finally { setUploading(false); setUploadProgress(0); }
        return false;
    };

    const handleDeleteFloorPlan = async (fpId, fpName) => {
        Modal.confirm({
            title: 'Delete Floor Plan', content: `Delete "${fpName}"?`, okText: 'Delete', okType: 'danger',
            onOk: async () => {
                const result = await deleteFloorPlan(projectId, fpId);
                if (result.success) message.success('Floor plan deleted');
                else message.error(result.error || 'Failed to delete');
            },
        });
    };

    const handleViewFloorPlan = async (fp) => {
        const result = await fetchFloorPlan(projectId, fp._id);
        if (result.success) { setSelectedFloorPlan(result.floorPlan); setViewModalVisible(true); }
    };

    const getStatusColor = (status) => ({ uploaded: 'default', processing: 'processing', processed: 'success', failed: 'error', archived: 'default' }[status] || 'default');

    const calculateTotals = () => {
        let totalWallArea = 0, totalDoors = 0, totalWindows = 0, totalRooms = 0;
        floorPlans.forEach((fp) => {
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

    const handleStatusChange = (newStatus) => {
        setProjectStatus(newStatus);
        logProjectEvent(projectId, `Project status changed to "${PROJECT_STATUSES.find((s) => s.key === newStatus)?.label || newStatus}"`);
    };

    const tabItems = [
        {
            key: 'overview',
            label: <span className="text-gray-300">📊 Overview</span>,
            children: (
                <div className="space-y-6">

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div style={{ gridColumn: 'span 2', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                            <h3 style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '0.75rem' }}>Project Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Type', value: project.projectType?.replace('-', ' ') },
                                    { label: 'Client', value: getClientName(project) || '—' },
                                    { label: 'Location', value: getLocationText(project) || '—' },
                                    { label: 'Budget', value: getBudgetValue(project) ? `Rs. ${getBudgetValue(project).toLocaleString()}` : '—' },
                                    { label: 'Start Date', value: project.startDate ? new Date(project.startDate).toLocaleDateString() : '—' },
                                    { label: 'End Date', value: project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString() : '—' },
                                    { label: 'Created', value: new Date(project.createdAt).toLocaleDateString() },
                                    { label: 'Updated', value: new Date(project.updatedAt).toLocaleDateString() },
                                ].map((item, i) => (
                                    <div key={i}>
                                        <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block' }}>{item.label}</span>
                                        <span style={{ fontSize: '0.8125rem', color: '#e2e8f0' }}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Progress Widget */}
                        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <ProgressRing percentage={progress.percentage} />
                            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                                <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{progress.done}/{progress.total} Tasks</div>
                                <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.125rem' }}>
                                    Weighted: {progress.weighted}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary stats row */}
                    <Row gutter={16}>
                        <Col span={6}><Card className="!bg-dark-800/50 !border-white/10"><Statistic title={<span className="text-gray-400">Floor Plans</span>} value={floorPlans.length} prefix={<FileImageOutlined className="text-primary-400" />} valueStyle={{ color: '#fff' }} /></Card></Col>
                        <Col span={6}><Card className="!bg-dark-800/50 !border-white/10"><Statistic title={<span className="text-gray-400">Wall Area</span>} value={totals.totalWallArea.toFixed(1)} suffix="m²" valueStyle={{ color: '#fff' }} /></Card></Col>
                        <Col span={6}><Card className="!bg-dark-800/50 !border-white/10"><Statistic title={<span className="text-gray-400">Doors</span>} value={totals.totalDoors} valueStyle={{ color: '#fff' }} /></Card></Col>
                        <Col span={6}><Card className="!bg-dark-800/50 !border-white/10"><Statistic title={<span className="text-gray-400">Windows</span>} value={totals.totalWindows} valueStyle={{ color: '#fff' }} /></Card></Col>
                    </Row>

                    {/* Prediction Tools Navigation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,193,7,0.2)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} className="hover:border-yellow-500/40 transition-all">
                            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>💰</div>
                            <h4 style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Cost Overrun Prediction</h4>
                            <p style={{ color: '#64748b', fontSize: '0.8125rem', textAlign: 'center', marginBottom: '1rem' }}>Predict cost overruns and identify risk factors with ANN-based analysis</p>
                            <Button
                                type="primary"
                                style={{ background: 'linear-gradient(to right, #fbbf24, #f97316)', border: 'none' }}
                                onClick={() => onNavigate?.('cost', project)}
                            >
                                Go to Cost Prediction
                            </Button>
                        </div>

                        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} className="hover:border-red-500/40 transition-all">
                            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏱️</div>
                            <h4 style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Delay Prediction</h4>
                            <p style={{ color: '#64748b', fontSize: '0.8125rem', textAlign: 'center', marginBottom: '1rem' }}>Forecast construction delays and risk categories using ML models</p>
                            <Button
                                type="primary"
                                style={{ background: 'linear-gradient(to right, #f87171, #dc2626)', border: 'none' }}
                                onClick={() => onNavigate?.('delay', project)}
                            >
                                Go to Delay Prediction
                            </Button>
                        </div>
                    </div>

                    {/* Overdue + Upcoming */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div style={{ background: 'rgba(30,41,59,0.5)', border: `1px solid ${overdueTasks.length > 0 ? 'rgba(255,77,79,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '0.75rem', padding: '1.25rem' }}>
                            <h3 style={{ color: overdueTasks.length > 0 ? '#ff7875' : '#e2e8f0', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>⚠️ Overdue Tasks ({overdueTasks.length})</h3>
                            {overdueTasks.length === 0 ? (
                                <p style={{ color: '#52c41a', fontSize: '0.8125rem' }}>✅ No overdue tasks</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    {overdueTasks.slice(0, 5).map((t) => (
                                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', background: 'rgba(255,77,79,0.05)', borderRadius: '0.375rem' }}>
                                            <span className={`priority-dot ${t.priority}`} />
                                            <span style={{ flex: 1, fontSize: '0.75rem', color: '#e2e8f0' }}>{t.title}</span>
                                            <span style={{ fontSize: '0.625rem', color: '#ff7875' }}>{new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                            <h3 style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>📅 Upcoming (7 days) ({upcomingTasks.length})</h3>
                            {upcomingTasks.length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>No upcoming deadlines</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    {upcomingTasks.slice(0, 5).map((t) => (
                                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.375rem' }}>
                                            <span className={`priority-dot ${t.priority}`} />
                                            <span style={{ flex: 1, fontSize: '0.75rem', color: '#e2e8f0' }}>{t.title}</span>
                                            <span style={{ fontSize: '0.625rem', color: '#94a3b8' }}>{new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'tasks',
            label: <span className="text-gray-300">📋 Tasks {tasks.length > 0 ? `(${tasks.length})` : ''}</span>,
            children: <TaskBoard projectId={projectId} taskController={taskController} />,
        },
        {
            key: 'milestones',
            label: <span className="text-gray-300">🎯 Milestones {milestones.length > 0 ? `(${milestones.length})` : ''}</span>,
            children: <MilestoneTimeline projectId={projectId} taskController={taskController} />,
        },
        {
            key: 'floorplans',
            label: <span className="text-gray-300">📐 Floor Plans ({floorPlans.length})</span>,
            children: (
                <div className="space-y-6">
                    <Dragger
                        name="floorPlan" multiple={false} accept="image/*" showUploadList={false}
                        beforeUpload={handleUpload} disabled={uploading}
                        className="!bg-dark-700/50 !border-white/10 hover:!border-primary-500/50"
                    >
                        {uploading ? (
                            <div className="py-8">
                                <Spin size="large" /><p className="text-gray-400 mt-4">Analyzing floor plan...</p>
                                <Progress percent={uploadProgress} status="active" className="max-w-xs mx-auto mt-4" />
                            </div>
                        ) : (
                            <div className="py-8">
                                <p className="text-4xl mb-4">📤</p>
                                <p className="text-white text-lg">Click or drag floor plan to upload</p>
                                <p className="text-gray-400 text-sm mt-2">Supports JPG, PNG, WebP (max 50MB)</p>
                            </div>
                        )}
                    </Dragger>
                    {loading && floorPlans.length === 0 ? (
                        <div className="flex justify-center py-8"><Spin size="large" /></div>
                    ) : floorPlans.length === 0 ? (
                        <Empty description={<span className="text-gray-400">No floor plans yet. Upload one to start.</span>} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {floorPlans.map((fp) => (
                                <Card key={fp._id} className="!bg-dark-700/50 !border-white/10"
                                    actions={[
                                        <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewFloorPlan(fp)}>View</Button>,
                                        <Button type="text" icon={<DeleteOutlined />} danger onClick={() => handleDeleteFloorPlan(fp._id, fp.name)}>Delete</Button>,
                                    ]}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 bg-dark-600 rounded-lg flex items-center justify-center">
                                            <FileImageOutlined className="text-2xl text-gray-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-white font-medium">{fp.name}</h4>
                                                <Tag color={getStatusColor(fp.status)}>{fp.status}</Tag>
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
            ),
        },
        {
            key: 'analysis',
            label: <span className="text-gray-300">📋 BOQ Reports</span>,
            children: (
                <div className="space-y-4">
                    {boqLoading ? (
                        <div className="flex justify-center py-8"><Spin size="large" /></div>
                    ) : boqReports.length === 0 ? (
                        <Empty description={<span className="text-gray-400">No BOQ reports yet. Upload a floor plan first.</span>} />
                    ) : (
                        boqReports.map((report) => (
                            <Card key={report._id} className="!bg-dark-700/50 !border-white/10" size="small">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <FileTextOutlined className="text-2xl text-primary-400" />
                                        <div>
                                            <h4 className="text-white font-medium">{report.title}</h4>
                                            <p className="text-gray-400 text-sm">{report.reportNumber} • {new Date(report.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-gray-400 text-xs">Grand Total</p>
                                            <p className="text-white font-bold">Rs. {report.summary?.grandTotal?.toLocaleString() || 0}</p>
                                        </div>
                                        <Tag color={report.status === 'final' ? 'success' : 'default'}>{report.status?.toUpperCase()}</Tag>
                                        <Button type="primary" icon={<EyeOutlined />} onClick={() => handleViewBOQ(report._id)}>View</Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            ),
        },
        {
            key: 'activity',
            label: <span className="text-gray-300">📝 Activity ({activity.length})</span>,
            children: <ActivityFeed activity={activity} />,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} className="!text-gray-400 hover:!text-white" />
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                        <span className={`status-badge ${projectStatus}`}>
                            <span className="status-dot" />
                            {(projectStatus).replace('-', ' ')}
                        </span>
                        {project.priority && project.priority !== 'medium' && (
                            <span className={`priority-badge ${project.priority}`}>{project.priority}</span>
                        )}
                    </div>
                    {project.description && <p className="text-gray-400 mt-1">{project.description}</p>}
                </div>

                {/* Status changer */}
                <Select
                    value={projectStatus}
                    onChange={handleStatusChange}
                    style={{ minWidth: 140 }}
                    size="small"
                >
                    {PROJECT_STATUSES.map((s) => (
                        <Select.Option key={s.key} value={s.key}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: s.color, display: 'inline-block' }} />
                                {s.label}
                            </span>
                        </Select.Option>
                    ))}
                </Select>
            </div>

            <div className="flex gap-3 flex-wrap">
                <Button
                    type="primary"
                    onClick={() => onNavigate && onNavigate('cost', project)}
                    className="!bg-gradient-to-r !from-blue-500 !to-blue-600 !border-0"
                >
                    💰 Cost Overrun Prediction
                </Button>
                <Button
                    type="primary"
                    onClick={() => onNavigate && onNavigate('delay', project)}
                    className="!bg-gradient-to-r !from-orange-500 !to-orange-600 !border-0"
                >
                    ⏱️ Delay Prediction
                </Button>
            </div>

            {/* Main Tabs */}
            <Card className="!bg-dark-800/50 !border-white/10">
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
            </Card>

            {/* Floor Plan View Modal — preserved */}
            <Modal title={selectedFloorPlan?.name || 'Floor Plan Details'} open={viewModalVisible} onCancel={() => setViewModalVisible(false)} footer={null} width={900}>
                {selectedFloorPlan && (
                    <div className="space-y-6">
                        {selectedFloorPlan.visualizations?.detectionOverlay && (
                            <div>
                                <h4 className="text-gray-400 mb-2">Detection Results</h4>
                                <img src={`data:image/png;base64,${selectedFloorPlan.visualizations.detectionOverlay}`} alt="Detection Overlay" className="w-full rounded-lg" />
                            </div>
                        )}
                        {selectedFloorPlan.mlAnalysis?.isProcessed && (
                            <Row gutter={16}>
                                <Col span={6}><Statistic title="Wall Area" value={selectedFloorPlan.mlAnalysis.walls?.netSurfaceArea?.toFixed(1) || 0} suffix="m²" /></Col>
                                <Col span={6}><Statistic title="Doors" value={selectedFloorPlan.mlAnalysis.doors?.count || 0} /></Col>
                                <Col span={6}><Statistic title="Windows" value={selectedFloorPlan.mlAnalysis.windows?.count || 0} /></Col>
                                <Col span={6}><Statistic title="Rooms" value={selectedFloorPlan.mlAnalysis.rooms?.length || 0} /></Col>
                            </Row>
                        )}
                        {selectedFloorPlan.costEstimates && (
                            <div>
                                <h4 className="text-gray-400 mb-3">Cost Estimates (LKR)</h4>
                                <Row gutter={16}>
                                    <Col span={8}><Card className="!bg-blue-500/10 !border-blue-500/20"><Statistic title="Basic" value={selectedFloorPlan.costEstimates.basicFinish} prefix="Rs." valueStyle={{ color: '#60a5fa' }} /></Card></Col>
                                    <Col span={8}><Card className="!bg-green-500/10 !border-green-500/20"><Statistic title="Standard" value={selectedFloorPlan.costEstimates.standardFinish} prefix="Rs." valueStyle={{ color: '#4ade80' }} /></Card></Col>
                                    <Col span={8}><Card className="!bg-purple-500/10 !border-purple-500/20"><Statistic title="Premium" value={selectedFloorPlan.costEstimates.premiumFinish} prefix="Rs." valueStyle={{ color: '#a78bfa' }} /></Card></Col>
                                </Row>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* BOQ Report Detail Modal — preserved */}
            <Modal title={selectedBOQ?.title || 'BOQ Report Details'} open={boqModalVisible} onCancel={() => setBOQModalVisible(false)} footer={null} width={1000}>
                {selectedBOQ && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500">Report Number: {selectedBOQ.reportNumber}</p>
                                <p className="text-gray-500">Generated: {new Date(selectedBOQ.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Tag color={selectedBOQ.status === 'final' ? 'success' : 'default'} className="text-lg px-3 py-1">{selectedBOQ.status?.toUpperCase()}</Tag>
                        </div>
                        <Table
                            dataSource={selectedBOQ.items} rowKey="_id" pagination={false}
                            columns={[
                                { title: 'Category', dataIndex: 'category', key: 'category', render: (cat) => <Tag>{cat?.toUpperCase()}</Tag> },
                                { title: 'Item', dataIndex: 'itemName', key: 'itemName' },
                                { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
                                { title: 'Qty', dataIndex: 'quantity', key: 'quantity', render: (qty, record) => `${qty?.toFixed(2)} ${record.unit}` },
                                { title: 'Unit Rate', dataIndex: 'unitRate', key: 'unitRate', render: (rate) => `Rs. ${rate?.toLocaleString()}` },
                                { title: 'Total Cost', dataIndex: 'totalCost', key: 'totalCost', render: (cost) => <strong>Rs. {cost?.toLocaleString()}</strong> },
                            ]}
                        />
                        <Card className="!bg-dark-100">
                            <Row gutter={16}>
                                <Col span={6}><Statistic title="Subtotal" value={selectedBOQ.summary?.subtotal} prefix="Rs." /></Col>
                                <Col span={6}><Statistic title={`Contingency (${selectedBOQ.summary?.contingencyPercent}%)`} value={selectedBOQ.summary?.contingencyAmount} prefix="Rs." /></Col>
                                <Col span={6}><Statistic title={`Overhead (${selectedBOQ.summary?.overheadPercent}%)`} value={selectedBOQ.summary?.overheadAmount} prefix="Rs." /></Col>
                                <Col span={6}><Statistic title="Grand Total" value={selectedBOQ.summary?.grandTotal} prefix="Rs." valueStyle={{ color: '#22c55e', fontWeight: 'bold' }} /></Col>
                            </Row>
                        </Card>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ProjectDetailView;
