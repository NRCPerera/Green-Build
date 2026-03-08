import { useEffect, useState, useMemo } from 'react';
import { Card, Button, Empty, Spin, Modal, Form, Input, Select, message, Dropdown } from 'antd';
import {
    PlusOutlined, FolderOutlined, MoreOutlined,
    EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined,
    UserOutlined, EnvironmentOutlined, WalletOutlined, CalendarOutlined,
    HomeOutlined, ShopOutlined, BuildOutlined, BankOutlined,
    ApartmentOutlined, DeploymentUnitOutlined
} from '@ant-design/icons';
import useProjectsController from '../../controllers/useProjectsController';
import usePMStore, { PROJECT_STATUSES, PROJECT_TEMPLATES, PRIORITIES } from '../../models/usePMStore';

const { TextArea } = Input;
const { Option } = Select;

const provinceDistrictMap = {
    'Western': ['Colombo', 'Gampaha', 'Kalutara'],
    'Central': ['Kandy', 'Matale', 'Nuwara Eliya'],
    'Southern': ['Galle', 'Matara', 'Hambantota'],
    'Eastern': ['Trincomalee', 'Batticaloa', 'Ampara'],
    'Northern': ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'],
    'North Western': ['Kurunegala', 'Puttalam'],
    'North Central': ['Anuradhapura', 'Polonnaruwa'],
    'Uva': ['Badulla', 'Monaragala'],
    'Sabaragamuwa': ['Ratnapura', 'Kegalle']
};

const getClientName = (project) => {
    return project.clientName || project.client?.name || '';
};

const getLocationText = (project) => {
    if (typeof project.location === 'string') return project.location;

    const addressParts = [
        project.location?.address,
        project.location?.city,
        project.location?.district,
        project.location?.province,
    ].filter(Boolean);

    return addressParts.join(', ');
};

const getBudgetValue = (project) => {
    if (typeof project.budget === 'number') return project.budget;
    if (typeof project.budget?.estimated === 'number') return project.budget.estimated;
    return 0;
};

const ProjectsListView = ({ onSelectProject }) => {
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [templateModalVisible, setTemplateModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [availableDistricts, setAvailableDistricts] = useState([]);
    const [form] = Form.useForm();

    const { projects, loading, error, fetchProjects, createProject, deleteProject } = useProjectsController();
    const { applyTemplate, computeProgress, tasksByProject, logProjectEvent } = usePMStore();

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    // Watch province changes to update district dropdown
    const handleProvinceChange = (province) => {
        const districts = province ? provinceDistrictMap[province] || [] : [];
        setAvailableDistricts(districts);
        form.setFieldsValue({ district: undefined });
    };

    // Filtered projects
    const filteredProjects = useMemo(() => {
        let result = projects || [];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((p) =>
                p.name?.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                getClientName(p)?.toLowerCase().includes(q) ||
                getLocationText(p)?.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== 'all') result = result.filter((p) => (p.status || 'draft') === statusFilter);
        if (priorityFilter !== 'all') result = result.filter((p) => (p.priority || 'medium') === priorityFilter);
        return result;
    }, [projects, searchQuery, statusFilter, priorityFilter]);

    const handleCreateProject = async (values) => {
        const projectPayload = {
            name: values.projectName,
            projectCode: values.projectCode,
            projectType: values.typeOfProject,
            description: values.description,
            location: {
                city: values.location,
                province: values.province,
                district: values.district,
                address: values.siteAddress,
            },
            client: {
                name: values.clientName,
                phone: values.clientContact,
                company: values.clientCompany,
            },
            budget: {
                estimated: Number(values.initialContractValue || 0),
                currency: 'LKR',
            },
            startDate: values.plannedStartDate,
            expectedEndDate: values.plannedEndDate,
            constructionPeriod: values.initialConstructionPeriod,
            contractorGrade: values.contractorGrade,
            floors: values.floors,
            areaSQFT: values.areaSQFT,
            priority: values.priority,
        };

        const result = await createProject(projectPayload);
        if (result.success) {
            // Apply template if selected
            if (values.template && values.template !== 'none') {
                applyTemplate(result.project._id || result.project.id, values.template);
            }
            logProjectEvent(result.project._id || result.project.id, `Project "${result.project.name}" created`);
            message.success('Project created successfully!');
            setCreateModalVisible(false);
            form.resetFields();
            setAvailableDistricts([]);
            onSelectProject?.(result.project);
        } else {
            message.error(result.error || 'Failed to create project');
        }
    };

    const handleCreateFromTemplate = (templateKey) => {
        setTemplateModalVisible(false);
        const tpl = PROJECT_TEMPLATES[templateKey];
        form.setFieldsValue({
            typeOfProject: tpl.projectType,
            template: templateKey,
            description: tpl.description,
        });
        setCreateModalVisible(true);
    };

    const handleDeleteProject = async (projectId, projectName) => {
        Modal.confirm({
            title: 'Delete Project',
            content: `Are you sure you want to delete "${projectName}"? This will also delete all tasks, milestones, and analysis data.`,
            okText: 'Delete', okType: 'danger',
            onOk: async () => {
                const result = await deleteProject(projectId);
                if (result.success) {
                    usePMStore.getState().removeProjectData(projectId);
                    message.success('Project deleted successfully');
                } else {
                    message.error(result.error || 'Failed to delete project');
                }
            },
        });
    };

    const getProjectTypeIcon = (type) => {
        const iconClass = 'text-slate-200 text-[1.35rem]';
        const icons = {
            residential: <HomeOutlined className={iconClass} />,
            commercial: <ShopOutlined className={iconClass} />,
            industrial: <BuildOutlined className={iconClass} />,
            institutional: <BankOutlined className={iconClass} />,
            'mixed-use': <ApartmentOutlined className={iconClass} />,
            apartment: <ApartmentOutlined className={iconClass} />,
            infrastructure: <DeploymentUnitOutlined className={iconClass} />,
            other: <FolderOutlined className={iconClass} />,
        };
        return icons[type] || <FolderOutlined className={iconClass} />;
    };

    const getProjectDropdownItems = (project) => ({
        items: [
            { key: 'view', icon: <EyeOutlined />, label: 'View Details', onClick: () => onSelectProject?.(project) },
            { key: 'edit', icon: <EditOutlined />, label: 'Edit Project', onClick: () => onSelectProject?.(project) },
            { type: 'divider' },
            { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true, onClick: () => handleDeleteProject(project._id, project.name) },
        ],
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Projects</h1>
                    <p className="text-gray-400 mt-1">{filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                        icon={<PlusOutlined />}
                        onClick={() => setTemplateModalVisible(true)}
                        style={{ borderColor: 'rgba(255,255,255,0.15)', color: '#94a3b8', background: 'transparent' }}
                    >
                        From Template
                    </Button>
                    <Button
                        type="primary" icon={<PlusOutlined />}
                        onClick={() => { form.resetFields(); setAvailableDistricts([]); setCreateModalVisible(true); }}
                        className="!bg-gradient-to-r !from-primary-500 !to-primary-600 !border-0"
                    >
                        New Project
                    </Button>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', padding: '0.75rem', background: 'rgba(15,23,42,0.5)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem', padding: '0 0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <SearchOutlined style={{ color: '#64748b' }} />
                    <input
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search projects..."
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '0.8125rem', padding: '0.5rem 0' }}
                    />
                </div>
                <Select value={statusFilter} onChange={setStatusFilter} style={{ minWidth: 140 }} size="middle">
                    <Option value="all">All Status</Option>
                    {PROJECT_STATUSES.map((s) => <Option key={s.key} value={s.key}>{s.label}</Option>)}
                </Select>
                <Select value={priorityFilter} onChange={setPriorityFilter} style={{ minWidth: 130 }} size="middle">
                    <Option value="all">All Priority</Option>
                    {PRIORITIES.map((p) => <Option key={p.key} value={p.key}>{p.label}</Option>)}
                </Select>
            </div>

            {/* Projects Grid */}
            {loading && projects.length === 0 ? (
                <div className="flex justify-center items-center h-64"><Spin size="large" /></div>
            ) : filteredProjects.length === 0 ? (
                <Card className="!bg-dark-800/50 !border-white/10">
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<span className="text-gray-400">{searchQuery || statusFilter !== 'all' ? 'No matching projects' : 'No projects yet. Create your first project!'}</span>}
                    >
                        {!searchQuery && statusFilter === 'all' && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>Create Project</Button>
                        )}
                    </Empty>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => {
                        const progress = computeProgress(project._id || project.id);
                        const projectBudget = getBudgetValue(project);
                        return (
                            <Card
                                key={project._id || project.id}
                                className="group relative overflow-hidden !bg-dark-800/55 !border-white/10 hover:!border-primary-400/40 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(2,6,23,0.55)]"
                                onClick={() => onSelectProject?.(project)}
                            >
                                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at top right, rgba(14,165,233,0.16), transparent 50%), radial-gradient(circle at bottom left, rgba(34,197,94,0.14), transparent 45%)' }} />

                                <div className="relative flex justify-between items-start mb-4 gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                            {getProjectTypeIcon(project.projectType)}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-semibold text-white truncate">{project.name}</h3>
                                            <div className="flex gap-2 mt-2 flex-wrap">
                                                <span className={`status-badge ${project.status || 'draft'}`}>
                                                    <span className="status-dot" />
                                                    {(project.status || 'draft').replace('-', ' ')}
                                                </span>
                                                {project.priority && project.priority !== 'medium' && (
                                                    <span className={`priority-badge ${project.priority}`}>
                                                        {project.priority} priority
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Dropdown
                                        menu={getProjectDropdownItems(project)} trigger={['click']}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Button
                                            type="text"
                                            icon={<MoreOutlined />}
                                            onClick={(e) => e.stopPropagation()}
                                            className="!text-gray-400 hover:!text-gray-200"
                                        />
                                    </Dropdown>
                                </div>

                                {project.description && (
                                    <p className="relative text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">{project.description}</p>
                                )}

                                {/* Extra info row */}
                                <div className="relative grid grid-cols-1 gap-2 mb-4">
                                    {getClientName(project) && (
                                        <div className="inline-flex items-center gap-2 text-xs text-slate-300 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                                            <UserOutlined className="text-slate-400" />
                                            <span className="truncate">{getClientName(project)}</span>
                                        </div>
                                    )}
                                    {getLocationText(project) && (
                                        <div className="inline-flex items-center gap-2 text-xs text-slate-300 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                                            <EnvironmentOutlined className="text-slate-400" />
                                            <span className="truncate">{getLocationText(project)}</span>
                                        </div>
                                    )}
                                    {projectBudget > 0 && (
                                        <div className="inline-flex items-center gap-2 text-xs text-slate-300 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                                            <WalletOutlined className="text-emerald-400" />
                                            <span>
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(projectBudget)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Progress */}
                                {progress.total > 0 && (
                                    <div className="relative mb-4 rounded-xl border border-emerald-400/15 bg-emerald-500/5 px-3 py-2.5">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[11px] text-slate-300 font-medium">Execution Progress</span>
                                            <span className="text-[11px] text-emerald-300 font-semibold">{progress.percentage}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '0.3125rem', background: 'rgba(255,255,255,0.07)', borderRadius: '9999px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${progress.percentage}%`, background: 'linear-gradient(to right, #22c55e, #86efac)', borderRadius: '9999px', transition: 'width 0.3s' }} />
                                        </div>
                                        <span className="text-[11px] text-slate-400 mt-1.5 inline-block">{progress.done}/{progress.total} tasks completed</span>
                                    </div>
                                )}

                                <div className="relative flex items-center justify-between pt-3 border-t border-white/10">
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <FolderOutlined />
                                        <span className="text-sm">{project.floorPlans?.length || 0} floor plans</span>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                                        <CalendarOutlined />
                                        {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Template Selection Modal */}
            <Modal
                title={<span style={{ color: 'white' }}>Create from Template</span>}
                open={templateModalVisible}
                onCancel={() => setTemplateModalVisible(false)}
                footer={null}
                width={600}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    {Object.entries(PROJECT_TEMPLATES).map(([key, tpl]) => (
                        <div
                            key={key}
                            onClick={() => handleCreateFromTemplate(key)}
                            style={{
                                padding: '1.25rem', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)'; e.currentTarget.style.background = 'rgba(34,197,94,0.05)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(30,41,59,0.5)'; }}
                        >
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{tpl.icon}</div>
                            <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.875rem' }}>{tpl.name}</div>
                            <div style={{ color: '#64748b', fontSize: '0.6875rem', marginTop: '0.25rem' }}>
                                {tpl.tasks.length} tasks â€¢ {tpl.milestones.length} milestones
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Create Project Modal */}
            <Modal
                title={<span style={{ color: 'white', fontSize: '1.125rem', fontWeight: 600 }}>Create New Project</span>}
                open={createModalVisible}
                onCancel={() => { setCreateModalVisible(false); form.resetFields(); setAvailableDistricts([]); }}
                footer={null}
                width={720}
                bodyStyle={{ background: 'rgba(15,23,42,0.8)', padding: '1.5rem' }}
            >
                <Form form={form} layout="vertical" onFinish={handleCreateProject} className="mt-4">
                    {/* Project Basic Info Section */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(34,197,94,0.05))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ color: '#60a5fa', fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <span>Project Basic Information</span>
                        </h3>

                        <Form.Item name="projectName" label={<span className="text-gray-300 font-medium">Project Name</span>} rules={[{ required: true, message: 'Please enter a project name' }]}>
                            <Input placeholder="e.g., Villa Construction - Phase 1" size="large" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                        </Form.Item>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item name="projectCode" label={<span className="text-gray-300 font-medium">Project Code / ID</span>}>
                                <Input placeholder="e.g., PRJ-2026-001" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                            </Form.Item>
                            <Form.Item name="typeOfProject" label={<span className="text-gray-300 font-medium">Project Type</span>} initialValue="residential">
                                <Select className="!text-white" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                                    <Option value="residential">Residential</Option>
                                    <Option value="apartment">Apartment</Option>
                                    <Option value="industrial">Industrial</Option>
                                    <Option value="commercial">Commercial</Option>
                                    <Option value="infrastructure">Infrastructure</Option>
                                    <Option value="mixed-use">Mixed Use</Option>
                                    <Option value="other">Other</Option>
                                </Select>
                            </Form.Item>
                        </div>

                        <Form.Item name="description" label={<span className="text-gray-300 font-medium">Description</span>}>
                            <TextArea placeholder="Brief description of the project..." rows={2} className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                        </Form.Item>
                    </div>

                    {/* Location Section */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.05))', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ color: '#4ade80', fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <span>Location Details</span>
                        </h3>

                        <div className="grid grid-cols-3 gap-4">
                            <Form.Item name="province" label={<span className="text-gray-300 font-medium">Province</span>}>
                                <Select
                                    placeholder="Select Province"
                                    className="!text-white"
                                    style={{ borderColor: 'rgba(255,255,255,0.15)' }}
                                    onChange={handleProvinceChange}
                                    allowClear
                                >
                                    {Object.keys(provinceDistrictMap).map(province => (
                                        <Option key={province} value={province}>{province}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item name="district" label={<span className="text-gray-300 font-medium">District</span>}>
                                <Select
                                    placeholder="Select District"
                                    className="!text-white"
                                    style={{ borderColor: 'rgba(255,255,255,0.15)' }}
                                    disabled={availableDistricts.length === 0}
                                    allowClear
                                >
                                    {availableDistricts.map(district => (
                                        <Option key={district} value={district}>{district}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item name="location" label={<span className="text-gray-300 font-medium">City / Area</span>}>
                                <Input placeholder="City name" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                            </Form.Item>
                        </div>

                        <Form.Item name="siteAddress" label={<span className="text-gray-300 font-medium">Full Site Address <span style={{ color: '#64748b', fontWeight: 'normal' }}>(optional)</span></span>}>
                            <Input placeholder="Complete site address" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                        </Form.Item>
                    </div>

                    {/* Client Details Section */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(34,197,94,0.05))', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ color: '#d8b4fe', fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <span>Client Information</span>
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item name="clientName" label={<span className="text-gray-300 font-medium">Client Name</span>}>
                                <Input placeholder="Full client name" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                            </Form.Item>
                            <Form.Item name="clientContact" label={<span className="text-gray-300 font-medium">Contact</span>}>
                                <Input placeholder="Phone or email" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                            </Form.Item>
                        </div>

                        <Form.Item name="clientCompany" label={<span className="text-gray-300 font-medium">Company</span>}>
                            <Input placeholder="Client company name" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                        </Form.Item>
                    </div>

                    {/* Budget & Timeline Section */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(235,158,52,0.1), rgba(34,197,94,0.05))', border: '1px solid rgba(235,158,52,0.2)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ color: '#fbbf24', fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <span>Budget & Timeline</span>
                        </h3>

                        <div className="grid grid-cols-3 gap-4">
                            <Form.Item name="initialContractValue" label={<span className="text-gray-300 font-medium">Contract Value (LKR)</span>}>
                                <Input type="number" placeholder="0" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                            </Form.Item>
                            <Form.Item name="plannedStartDate" label={<span className="text-gray-300 font-medium">Start Date</span>}>
                                <Input type="date" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                            </Form.Item>
                            <Form.Item name="plannedEndDate" label={<span className="text-gray-300 font-medium">End Date</span>}>
                                <Input type="date" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                            </Form.Item>
                        </div>

                        <Form.Item name="initialConstructionPeriod" label={<span className="text-gray-300 font-medium">Construction Period (months)</span>}>
                            <Input type="number" min={0} placeholder="e.g., 12" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                        </Form.Item>
                    </div>

                    {/* Project Settings Section */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(34,197,94,0.05))', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ color: '#f87171', fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <span>Project Settings</span>
                        </h3>

                        <div className="grid grid-cols-3 gap-4">
                            <Form.Item name="contractorGrade" label={<span className="text-gray-300 font-medium">CIDA Contractor Grade</span>}>
                                <Select placeholder="Select Grade" className="!text-white" style={{ borderColor: 'rgba(255,255,255,0.15)' }} allowClear>
                                    <Option value="C1">C1</Option>
                                    <Option value="C2">C2</Option>
                                    <Option value="C3">C3</Option>
                                    <Option value="C4">C4</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="floors" label={<span className="text-gray-300 font-medium">Number of Floors</span>}>
                                <Input type="number" min={1} placeholder="e.g., 2" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                            </Form.Item>
                            <Form.Item name="areaSQFT" label={<span className="text-gray-300 font-medium">Area (SQFT)</span>}>
                                <Input type="number" min={1} placeholder="e.g., 2500" className="!bg-dark-700/70 !border-white/15 !text-white hover:!border-primary-400/50 focus:!border-primary-400 focus:!ring-1 focus:!ring-primary-400/30" />
                            </Form.Item>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item name="priority" label={<span className="text-gray-300 font-medium">Priority Level</span>} initialValue="medium">
                                <Select className="!text-white" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                                    <Option value="high">ðŸ”´ High Priority</Option>
                                    <Option value="medium">ðŸŸ¡ Medium Priority</Option>
                                    <Option value="low">âšª Low Priority</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="template" label={<span className="text-gray-300 font-medium">Use Template <span style={{ color: '#64748b', fontWeight: 'normal' }}>(optional)</span></span>} initialValue="none">
                                <Select className="!text-white" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                                    <Option value="none">â€” No Template â€”</Option>
                                    {Object.entries(PROJECT_TEMPLATES).map(([key, tpl]) => (
                                        <Option key={key} value={key}>{tpl.name} ({tpl.tasks.length} tasks)</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <Form.Item className="mb-0 mt-6">
                        <div className="flex gap-3 justify-end">
                            <Button
                                onClick={() => { setCreateModalVisible(false); form.resetFields(); setAvailableDistricts([]); }}
                                style={{
                                    borderColor: 'rgba(255,255,255,0.15)',
                                    color: '#94a3b8',
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '0.5rem 1.5rem'
                                }}
                                className="hover:!border-white/30 hover:!text-white transition-all"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                className="!bg-gradient-to-r !from-primary-500 !to-primary-600 !border-0 !text-white !font-semibold hover:!from-primary-600 hover:!to-primary-700 transition-all"
                                style={{ padding: '0.5rem 2rem' }}
                            >
                                Create Project
                            </Button>
                        </div>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProjectsListView;
