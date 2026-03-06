import { useState, useRef, useCallback } from 'react';
import { Modal, Form, Input, Select, DatePicker, Button, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const COLUMN_CONFIG = [
    { key: 'todo', label: 'Todo', emoji: '📋' },
    { key: 'in-progress', label: 'In Progress', emoji: '🔧' },
    { key: 'review', label: 'Review', emoji: '👀' },
    { key: 'done', label: 'Done', emoji: '✅' },
];

// ── Task Card ────────────────────────────────────────────────────
const TaskCard = ({ task, onEdit, onDelete, onDragStart }) => {
    const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date(new Date().toDateString());

    return (
        <div
            className="task-card"
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('taskId', task.id);
                e.dataTransfer.setData('fromStatus', task.status);
                e.currentTarget.classList.add('dragging');
                onDragStart?.(task.id);
            }}
            onDragEnd={(e) => {
                e.currentTarget.classList.remove('dragging');
            }}
        >
            <div className="task-card-title">{task.title}</div>
            <div className="task-card-meta">
                <span className={`priority-badge ${task.priority}`}>
                    <span className={`priority-dot ${task.priority}`} />
                    {task.priority}
                </span>

                {isOverdue && (
                    <span className="overdue-badge">
                        <ClockCircleOutlined /> Overdue
                    </span>
                )}

                {task.dueDate && !isOverdue && (
                    <span style={{ fontSize: '0.625rem', color: '#64748b' }}>
                        📅 {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                )}

                {task.tags?.map((tag) => (
                    <span key={tag} className="tag-pill">{tag}</span>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit?.(task); }}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#94a3b8'}
                    onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
                >
                    <EditOutlined />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete?.(task.id); }}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#ff7875'}
                    onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
                >
                    <DeleteOutlined />
                </button>
            </div>
        </div>
    );
};

// ── Quick Add ────────────────────────────────────────────────────
const QuickAdd = ({ onAdd }) => {
    const [value, setValue] = useState('');
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && value.trim()) {
            onAdd(value.trim());
            setValue('');
        }
    };
    return (
        <div className="quick-add-input">
            <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="+ Quick add task…"
            />
        </div>
    );
};

// ── Kanban Column ────────────────────────────────────────────────
const KanbanColumn = ({ config, tasks, onMoveTask, onEditTask, onDeleteTask, onQuickAdd }) => {
    const [dragOver, setDragOver] = useState(false);

    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const taskId = e.dataTransfer.getData('taskId');
        const fromStatus = e.dataTransfer.getData('fromStatus');
        if (taskId && fromStatus !== config.key) {
            onMoveTask(taskId, config.key);
        }
    };

    return (
        <div
            className={`kanban-column ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="kanban-column-header">
                <span className="kanban-column-title">{config.emoji} {config.label}</span>
                <span className="kanban-column-count">{tasks.length}</span>
            </div>
            <div className="kanban-cards">
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                    />
                ))}
            </div>
            <QuickAdd onAdd={(title) => onQuickAdd(title, config.key)} />
        </div>
    );
};

// ── Main TaskBoard ──────────────────────────────────────────────
const TaskBoard = ({ projectId, taskController }) => {
    const { tasksByStatus, addTask, moveTask, updateTask, deleteTask } = taskController;
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [form] = Form.useForm();

    const handleQuickAdd = useCallback((title, status) => {
        addTask({ title, status });
        message.success('Task added');
    }, [addTask]);

    const handleEditTask = useCallback((task) => {
        setEditingTask(task);
        form.setFieldsValue({
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate ? task.dueDate : undefined,
            assignee: task.assignee,
            tags: task.tags?.join(', ') || '',
        });
        setModalOpen(true);
    }, [form]);

    const handleCreateNew = () => {
        setEditingTask(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleSubmit = (values) => {
        const data = {
            ...values,
            tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
            dueDate: values.dueDate || null,
        };

        if (editingTask) {
            updateTask(editingTask.id, data);
            message.success('Task updated');
        } else {
            addTask(data);
            message.success('Task created');
        }
        setModalOpen(false);
        form.resetFields();
        setEditingTask(null);
    };

    const handleDelete = (taskId) => {
        Modal.confirm({
            title: 'Delete Task',
            content: 'Are you sure you want to delete this task?',
            okText: 'Delete',
            okType: 'danger',
            onOk: () => {
                deleteTask(taskId);
                message.success('Task deleted');
            },
        });
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Task Board</h3>
                    <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                        Drag tasks between columns to update status
                    </p>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreateNew}
                    className="!bg-gradient-to-r !from-primary-500 !to-primary-600 !border-0"
                    size="small"
                >
                    New Task
                </Button>
            </div>

            {/* Kanban Board */}
            <div className="kanban-board">
                {COLUMN_CONFIG.map((col) => (
                    <KanbanColumn
                        key={col.key}
                        config={col}
                        tasks={tasksByStatus[col.key] || []}
                        onMoveTask={moveTask}
                        onEditTask={handleEditTask}
                        onDeleteTask={handleDelete}
                        onQuickAdd={handleQuickAdd}
                    />
                ))}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                title={<span style={{ color: 'white' }}>{editingTask ? 'Edit Task' : 'Create Task'}</span>}
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditingTask(null); form.resetFields(); }}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: '1rem' }}>
                    <Form.Item name="title" label={<span style={{ color: '#cbd5e1' }}>Title</span>} rules={[{ required: true, message: 'Please enter a title' }]}>
                        <Input placeholder="Task title" className="!bg-dark-700 !border-white/10 !text-white" />
                    </Form.Item>

                    <Form.Item name="description" label={<span style={{ color: '#cbd5e1' }}>Description</span>}>
                        <TextArea rows={2} placeholder="Brief description..." className="!bg-dark-700 !border-white/10 !text-white" />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Form.Item name="priority" label={<span style={{ color: '#cbd5e1' }}>Priority</span>} initialValue="medium">
                            <Select>
                                <Select.Option value="high">🔴 High</Select.Option>
                                <Select.Option value="medium">🟡 Medium</Select.Option>
                                <Select.Option value="low">⚪ Low</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item name="status" label={<span style={{ color: '#cbd5e1' }}>Status</span>} initialValue="todo">
                            <Select>
                                <Select.Option value="todo">📋 Todo</Select.Option>
                                <Select.Option value="in-progress">🔧 In Progress</Select.Option>
                                <Select.Option value="review">👀 Review</Select.Option>
                                <Select.Option value="done">✅ Done</Select.Option>
                            </Select>
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Form.Item name="dueDate" label={<span style={{ color: '#cbd5e1' }}>Due Date</span>}>
                            <Input type="date" className="!bg-dark-700 !border-white/10 !text-white" />
                        </Form.Item>

                        <Form.Item name="assignee" label={<span style={{ color: '#cbd5e1' }}>Assignee</span>}>
                            <Input placeholder="Name" className="!bg-dark-700 !border-white/10 !text-white" />
                        </Form.Item>
                    </div>

                    <Form.Item name="tags" label={<span style={{ color: '#cbd5e1' }}>Tags (comma-separated)</span>}>
                        <Input placeholder="e.g., foundation, mep" className="!bg-dark-700 !border-white/10 !text-white" />
                    </Form.Item>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                        <Button onClick={() => { setModalOpen(false); setEditingTask(null); form.resetFields(); }}>Cancel</Button>
                        <Button type="primary" htmlType="submit" className="!bg-gradient-to-r !from-primary-500 !to-primary-600 !border-0">
                            {editingTask ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default TaskBoard;
