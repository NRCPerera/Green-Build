import { useState } from 'react';
import { Modal, Form, Input, Button, message, Empty } from 'antd';
import { PlusOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined } from '@ant-design/icons';

const MilestoneTimeline = ({ projectId, taskController }) => {
    const { milestones, addMilestone, updateMilestone, deleteMilestone } = taskController;
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMs, setEditingMs] = useState(null);
    const [form] = Form.useForm();

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const sortedMilestones = [...milestones].sort((a, b) => {
        if (!a.targetDate) return 1;
        if (!b.targetDate) return -1;
        return new Date(a.targetDate) - new Date(b.targetDate);
    });

    const getMilestoneStatus = (ms) => {
        if (ms.status === 'complete') return 'complete';
        if (ms.targetDate && new Date(ms.targetDate) < now) return 'overdue';
        return 'pending';
    };

    const handleSubmit = (values) => {
        if (editingMs) {
            updateMilestone(editingMs.id, values);
            message.success('Milestone updated');
        } else {
            addMilestone(values);
            message.success('Milestone added');
        }
        setModalOpen(false);
        setEditingMs(null);
        form.resetFields();
    };

    const handleEdit = (ms) => {
        setEditingMs(ms);
        form.setFieldsValue({
            title: ms.title,
            targetDate: ms.targetDate,
            description: ms.description,
        });
        setModalOpen(true);
    };

    const handleToggleComplete = (ms) => {
        const newStatus = ms.status === 'complete' ? 'pending' : 'complete';
        updateMilestone(ms.id, { status: newStatus });
        message.success(newStatus === 'complete' ? 'Milestone completed!' : 'Milestone reopened');
    };

    const handleDelete = (msId) => {
        Modal.confirm({
            title: 'Delete Milestone',
            content: 'Are you sure?',
            okText: 'Delete',
            okType: 'danger',
            onOk: () => { deleteMilestone(msId); message.success('Milestone deleted'); },
        });
    };

    const completedCount = milestones.filter((m) => m.status === 'complete').length;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                        Milestones
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                        {completedCount}/{milestones.length} completed
                    </p>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => { setEditingMs(null); form.resetFields(); setModalOpen(true); }}
                    className="!bg-gradient-to-r !from-primary-500 !to-primary-600 !border-0"
                    size="small"
                >
                    Add Milestone
                </Button>
            </div>

            {/* Progress bar */}
            {milestones.length > 0 && (
                <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(30,41,59,0.5)', borderRadius: '0.625rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Milestone Progress</span>
                        <span style={{ fontSize: '0.6875rem', color: '#4ade80', fontWeight: 600 }}>
                            {milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0}%
                        </span>
                    </div>
                    <div style={{ width: '100%', height: '0.375rem', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0}%`,
                            background: 'linear-gradient(to right, #22c55e, #4ade80)',
                            borderRadius: '9999px',
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                </div>
            )}

            {/* Timeline */}
            {sortedMilestones.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<span style={{ color: '#64748b' }}>No milestones yet</span>}
                    />
                </div>
            ) : (
                <div className="milestone-timeline">
                    {sortedMilestones.map((ms) => {
                        const status = getMilestoneStatus(ms);
                        return (
                            <div key={ms.id} className="milestone-item">
                                <div className={`milestone-dot ${status}`} />
                                <div className={`milestone-card ${status}`}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <span style={{
                                                    color: status === 'complete' ? '#73d13d' : status === 'overdue' ? '#ff7875' : '#e2e8f0',
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem',
                                                    textDecoration: status === 'complete' ? 'line-through' : 'none',
                                                }}>
                                                    {ms.title}
                                                </span>
                                                {status === 'overdue' && (
                                                    <span className="overdue-badge">
                                                        <ClockCircleOutlined /> Overdue
                                                    </span>
                                                )}
                                            </div>
                                            {ms.targetDate && (
                                                <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                                    📅 {new Date(ms.targetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            )}
                                            {ms.description && (
                                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.375rem 0 0' }}>{ms.description}</p>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button
                                                onClick={() => handleToggleComplete(ms)}
                                                title={status === 'complete' ? 'Reopen' : 'Complete'}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                                                    color: status === 'complete' ? '#52c41a' : '#64748b', fontSize: '0.875rem',
                                                }}
                                            >
                                                <CheckCircleOutlined />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(ms)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#64748b', fontSize: '0.75rem' }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ms.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#64748b', fontSize: '0.75rem' }}
                                            >
                                                <DeleteOutlined />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            <Modal
                title={<span style={{ color: 'white' }}>{editingMs ? 'Edit Milestone' : 'Add Milestone'}</span>}
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditingMs(null); form.resetFields(); }}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: '1rem' }}>
                    <Form.Item name="title" label={<span style={{ color: '#cbd5e1' }}>Title</span>} rules={[{ required: true }]}>
                        <Input placeholder="Milestone title" className="!bg-dark-700 !border-white/10 !text-white" />
                    </Form.Item>
                    <Form.Item name="targetDate" label={<span style={{ color: '#cbd5e1' }}>Target Date</span>}>
                        <Input type="date" className="!bg-dark-700 !border-white/10 !text-white" />
                    </Form.Item>
                    <Form.Item name="description" label={<span style={{ color: '#cbd5e1' }}>Description (optional)</span>}>
                        <Input.TextArea rows={2} placeholder="Details..." className="!bg-dark-700 !border-white/10 !text-white" />
                    </Form.Item>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <Button onClick={() => { setModalOpen(false); setEditingMs(null); }}>Cancel</Button>
                        <Button type="primary" htmlType="submit" className="!bg-gradient-to-r !from-primary-500 !to-primary-600 !border-0">
                            {editingMs ? 'Update' : 'Add'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default MilestoneTimeline;
