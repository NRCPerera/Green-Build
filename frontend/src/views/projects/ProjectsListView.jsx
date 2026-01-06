import { useEffect, useState } from 'react';
import { Card, Button, Empty, Spin, Tag, Modal, Form, Input, Select, message, Dropdown } from 'antd';
import {
    PlusOutlined,
    FolderOutlined,
    MoreOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined
} from '@ant-design/icons';
import useProjectsController from '../../controllers/useProjectsController';

const { TextArea } = Input;
const { Option } = Select;

const ProjectsListView = ({ onSelectProject }) => {
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [form] = Form.useForm();
    const {
        projects,
        loading,
        error,
        fetchProjects,
        createProject,
        deleteProject
    } = useProjectsController();

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleCreateProject = async (values) => {
        const result = await createProject(values);
        if (result.success) {
            message.success('Project created successfully!');
            setCreateModalVisible(false);
            form.resetFields();
            onSelectProject?.(result.project);
        } else {
            message.error(result.error || 'Failed to create project');
        }
    };

    const handleDeleteProject = async (projectId, projectName) => {
        Modal.confirm({
            title: 'Delete Project',
            content: `Are you sure you want to delete "${projectName}"? This will also delete all floor plans and analysis data.`,
            okText: 'Delete',
            okType: 'danger',
            onOk: async () => {
                const result = await deleteProject(projectId);
                if (result.success) {
                    message.success('Project deleted successfully');
                } else {
                    message.error(result.error || 'Failed to delete project');
                }
            }
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            'draft': 'default',
            'in-progress': 'processing',
            'review': 'warning',
            'completed': 'success',
            'archived': 'default'
        };
        return colors[status] || 'default';
    };

    const getProjectTypeIcon = (type) => {
        const icons = {
            'residential': '🏠',
            'commercial': '🏢',
            'industrial': '🏭',
            'institutional': '🏛️',
            'mixed-use': '🏙️',
            'other': '📐'
        };
        return icons[type] || '📐';
    };

    const getProjectDropdownItems = (project) => ({
        items: [
            {
                key: 'view',
                icon: <EyeOutlined />,
                label: 'View Details',
                onClick: () => onSelectProject?.(project)
            },
            {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Edit Project',
                onClick: () => onSelectProject?.(project)
            },
            { type: 'divider' },
            {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Delete',
                danger: true,
                onClick: () => handleDeleteProject(project._id, project.name)
            }
        ]
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">My Projects</h1>
                    <p className="text-gray-400 mt-1">
                        Manage your construction projects and floor plans
                    </p>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => setCreateModalVisible(true)}
                    className="!bg-gradient-to-r !from-primary-500 !to-primary-600 !border-0"
                >
                    New Project
                </Button>
            </div>

            {/* Projects Grid */}
            {loading && projects.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                    <Spin size="large" />
                </div>
            ) : projects.length === 0 ? (
                <Card className="!bg-dark-800/50 !border-white/10">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <span className="text-gray-400">
                                No projects yet. Create your first project to get started!
                            </span>
                        }
                    >
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setCreateModalVisible(true)}
                        >
                            Create Project
                        </Button>
                    </Empty>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <Card
                            key={project._id}
                            className="!bg-dark-800/50 !border-white/10 hover:!border-primary-500/30 transition-all cursor-pointer"
                            onClick={() => onSelectProject?.(project)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">
                                        {getProjectTypeIcon(project.projectType)}
                                    </span>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {project.name}
                                        </h3>
                                        <Tag color={getStatusColor(project.status)}>
                                            {project.status?.replace('-', ' ').toUpperCase()}
                                        </Tag>
                                    </div>
                                </div>
                                <Dropdown
                                    menu={getProjectDropdownItems(project)}
                                    trigger={['click']}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Button
                                        type="text"
                                        icon={<MoreOutlined />}
                                        onClick={(e) => e.stopPropagation()}
                                        className="!text-gray-400"
                                    />
                                </Dropdown>
                            </div>

                            {project.description && (
                                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                    {project.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 text-gray-400">
                                    <FolderOutlined />
                                    <span className="text-sm">
                                        {project.floorPlans?.length || 0} floor plans
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {new Date(project.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Project Modal */}
            <Modal
                title={<span className="text-white">Create New Project</span>}
                open={createModalVisible}
                onCancel={() => {
                    setCreateModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                className="!bg-dark-800"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateProject}
                    className="mt-4"
                >
                    <Form.Item
                        name="name"
                        label={<span className="text-gray-300">Project Name</span>}
                        rules={[{ required: true, message: 'Please enter a project name' }]}
                    >
                        <Input
                            placeholder="e.g., Villa Construction - Phase 1"
                            size="large"
                            className="!bg-dark-700 !border-white/10 !text-white"
                        />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label={<span className="text-gray-300">Description</span>}
                    >
                        <TextArea
                            placeholder="Brief description of the project..."
                            rows={3}
                            className="!bg-dark-700 !border-white/10 !text-white"
                        />
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                            name="projectType"
                            label={<span className="text-gray-300">Project Type</span>}
                            initialValue="residential"
                        >
                            <Select size="large">
                                <Option value="residential">🏠 Residential</Option>
                                <Option value="commercial">🏢 Commercial</Option>
                                <Option value="industrial">🏭 Industrial</Option>
                                <Option value="institutional">🏛️ Institutional</Option>
                                <Option value="mixed-use">🏙️ Mixed Use</Option>
                                <Option value="other">📐 Other</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="status"
                            label={<span className="text-gray-300">Status</span>}
                            initialValue="draft"
                        >
                            <Select size="large">
                                <Option value="draft">Draft</Option>
                                <Option value="in-progress">In Progress</Option>
                                <Option value="review">Under Review</Option>
                            </Select>
                        </Form.Item>
                    </div>

                    <Form.Item className="mb-0 mt-6">
                        <div className="flex gap-3 justify-end">
                            <Button
                                onClick={() => {
                                    setCreateModalVisible(false);
                                    form.resetFields();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                className="!bg-gradient-to-r !from-primary-500 !to-primary-600 !border-0"
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
