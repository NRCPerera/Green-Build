import { useState, useEffect, useRef, useCallback } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import usePMStore from '../../models/usePMStore';

const GlobalSearch = ({ isOpen, onClose, projects = [], onSelectProject, onSelectTask }) => {
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);
    const searchAll = usePMStore((s) => s.searchAll);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Ctrl+K handler is in parent (MainLayout), this is the UI only

    const results = (() => {
        if (!query || query.length < 2) return { projects: [], tasks: [] };

        const q = query.toLowerCase();

        // Search projects
        const matchedProjects = (projects || []).filter(
            (p) =>
                p.name?.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                p.clientName?.toLowerCase().includes(q) ||
                p.location?.toLowerCase().includes(q)
        );

        // Search tasks
        const { tasks: matchedTasks } = searchAll(query);

        return { projects: matchedProjects.slice(0, 5), tasks: matchedTasks.slice(0, 8) };
    })();

    const hasResults = results.projects.length > 0 || results.tasks.length > 0;

    if (!isOpen) return null;

    return (
        <div className="search-overlay" onClick={onClose}>
            <div className="search-modal" onClick={(e) => e.stopPropagation()}>
                {/* Search Input */}
                <div className="search-input-wrapper">
                    <SearchOutlined style={{ color: '#64748b', fontSize: '1.125rem' }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search projects, tasks…"
                    />
                    <span style={{ fontSize: '0.6875rem', color: '#475569', background: 'rgba(255,255,255,0.06)', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                        ESC
                    </span>
                </div>

                {/* Results */}
                <div className="search-results">
                    {query.length < 2 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.8125rem' }}>
                            Type at least 2 characters to search...
                        </div>
                    ) : !hasResults ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.8125rem' }}>
                            No results found for "{query}"
                        </div>
                    ) : (
                        <>
                            {/* Projects */}
                            {results.projects.length > 0 && (
                                <>
                                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.625rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Projects
                                    </div>
                                    {results.projects.map((project) => (
                                        <div
                                            key={project._id || project.id}
                                            className="search-result-item"
                                            onClick={() => { onSelectProject?.(project); onClose(); }}
                                        >
                                            <span style={{ fontSize: '1.25rem' }}>
                                                {project.projectType === 'residential' ? '🏠' : project.projectType === 'commercial' ? '🏢' : project.projectType === 'industrial' ? '🏭' : '📐'}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ color: '#e2e8f0', fontSize: '0.8125rem', fontWeight: 500 }}>{project.name}</div>
                                                {project.description && (
                                                    <div style={{ color: '#64748b', fontSize: '0.6875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {project.description}
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`status-badge ${project.status || 'draft'}`}>
                                                <span className="status-dot" />
                                                {(project.status || 'draft').replace('-', ' ')}
                                            </span>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Tasks */}
                            {results.tasks.length > 0 && (
                                <>
                                    <div style={{ padding: '0.75rem 0.75rem 0.5rem', fontSize: '0.625rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Tasks
                                    </div>
                                    {results.tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="search-result-item"
                                            onClick={() => { onSelectTask?.(task); onClose(); }}
                                        >
                                            <span className={`priority-dot ${task.priority}`} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ color: '#e2e8f0', fontSize: '0.8125rem', fontWeight: 500 }}>{task.title}</div>
                                                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.125rem' }}>
                                                    {task.tags?.slice(0, 3).map((tag) => (
                                                        <span key={tag} className="tag-pill">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '0.6875rem', color: '#475569' }}>
                                                {task.status?.replace('-', ' ')}
                                            </span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;
