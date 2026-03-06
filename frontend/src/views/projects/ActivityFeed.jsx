import { useState, useMemo } from 'react';
import { Empty } from 'antd';
import { CheckCircleOutlined, SwapOutlined, PlusCircleOutlined, EditOutlined, DeleteOutlined, FlagOutlined } from '@ant-design/icons';

const ActivityFeed = ({ activity, filterTypes }) => {
    const [activeFilter, setActiveFilter] = useState('all');

    const filters = [
        { key: 'all', label: 'All' },
        { key: 'task', label: 'Tasks' },
        { key: 'milestone', label: 'Milestones' },
        { key: 'project', label: 'Project' },
    ];

    const filteredActivity = useMemo(() => {
        if (activeFilter === 'all') return activity;
        return activity.filter((e) => e.type === activeFilter);
    }, [activity, activeFilter]);

    const getIcon = (event) => {
        const msg = event.message.toLowerCase();
        if (msg.includes('created') || msg.includes('added')) return <PlusCircleOutlined />;
        if (msg.includes('moved')) return <SwapOutlined />;
        if (msg.includes('completed')) return <CheckCircleOutlined />;
        if (msg.includes('updated') || msg.includes('edited')) return <EditOutlined />;
        if (msg.includes('deleted')) return <DeleteOutlined />;
        return <FlagOutlined />;
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div>
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', padding: '0.25rem', background: 'rgba(15,23,42,0.5)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                {filters.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setActiveFilter(f.key)}
                        style={{
                            flex: 1,
                            padding: '0.375rem 0.5rem',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            background: activeFilter === f.key ? 'rgba(34,197,94,0.15)' : 'transparent',
                            color: activeFilter === f.key ? '#4ade80' : '#64748b',
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Event list */}
            {filteredActivity.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<span style={{ color: '#64748b' }}>No activity yet</span>}
                    />
                </div>
            ) : (
                <div className="activity-feed">
                    {filteredActivity.map((event) => (
                        <div key={event.id} className="activity-item">
                            <div className={`activity-icon ${event.type}`}>
                                {getIcon(event)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ color: '#cbd5e1', fontSize: '0.8125rem', margin: 0, lineHeight: 1.4 }}>
                                    {event.message}
                                </p>
                                <span style={{ color: '#475569', fontSize: '0.6875rem' }}>
                                    {formatTime(event.timestamp)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActivityFeed;
