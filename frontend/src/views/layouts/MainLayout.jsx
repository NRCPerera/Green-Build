import { useState, useEffect, useMemo } from 'react';
import { Dropdown, Avatar, Select } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined, LoginOutlined, SearchOutlined } from '@ant-design/icons';
import useAuthStore from '../../models/useAuthStore';
import usePMStore, { ROLES } from '../../models/usePMStore';
import GlobalSearch from '../components/GlobalSearch';

// Simplified module navigation — analysis modules now live inside project detail
const MODULES = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Overview & Stats', requiresAuth: false },
    { key: 'projects', label: 'Projects', icon: '📁', description: 'Manage Projects', requiresAuth: true },
];

/**
 * Main Layout Component (Project Management version)
 */
const MainLayout = ({ children, activeModule = 'dashboard', onModuleChange, onLogout, onLogin, projects = [] }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchOpen, setSearchOpen] = useState(false);

    const { user, isAuthenticated, logout } = useAuthStore();
    const { userRole, setUserRole, recentProjectIds } = usePMStore();

    // Ctrl+K shortcut for global search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Recent projects from the projects list
    const recentProjects = useMemo(() => {
        if (!projects.length) return [];
        return recentProjectIds
            .map((id) => projects.find((p) => (p._id || p.id) === id))
            .filter(Boolean)
            .slice(0, 4);
    }, [projects, recentProjectIds]);

    const handleModuleClick = (moduleKey) => {
        const module = MODULES.find((m) => m.key === moduleKey);
        if (module?.requiresAuth && !isAuthenticated) {
            onLogin?.();
            return;
        }
        onModuleChange?.(moduleKey);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } w-64 bg-dark-900/80 backdrop-blur-xl border-r border-white/5`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5 bg-gradient-to-r from-primary-500/10 to-transparent">
                    <span className="text-2xl">🌿</span>
                    <h1 className="text-xl font-bold text-primary-400 tracking-tight">
                        Green Build
                    </h1>
                    <span style={{ fontSize: '0.5625rem', background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '0.0625rem 0.375rem', borderRadius: '9999px', fontWeight: 600, marginLeft: 'auto' }}>
                        PM
                    </span>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {MODULES.map((module) => {
                        const isActive = activeModule === module.key || (module.key === 'projects' && activeModule === 'project-detail');
                        return (
                            <button
                                key={module.key}
                                onClick={() => handleModuleClick(module.key)}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                                    ${isActive
                                        ? 'bg-gradient-to-r from-primary-500/20 to-primary-500/5 border-l-4 border-primary-400'
                                        : 'hover:bg-white/5 border-l-4 border-transparent'
                                    }
                                    cursor-pointer
                                `}
                            >
                                <span className="text-xl">{module.icon}</span>
                                <div className="flex-1 text-left">
                                    <span className={`font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                                        {module.label}
                                    </span>
                                    <span className="block text-xs text-gray-500">{module.description}</span>
                                </div>
                            </button>
                        );
                    })}

                    {/* Divider + Legacy modules (kept but secondary) */}
                    <div style={{ padding: '0.5rem 0.25rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Quick Analysis
                        </span>
                    </div>
                    {[
                        { key: 'quantity', label: 'Quantity Takeoff', icon: '📐' },
                        { key: 'cost', label: 'Cost Prediction', icon: '💰' },
                        { key: 'sustainability', label: 'Sustainability', icon: '🌱' },
                        { key: 'delay', label: 'Delay Forecast', icon: '⏱️' },
                    ].map((module) => {
                        const isActive = activeModule === module.key;
                        return (
                            <button
                                key={module.key}
                                onClick={() => onModuleChange?.(module.key)}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200
                                    ${isActive
                                        ? 'bg-primary-500/10 text-white'
                                        : 'hover:bg-white/5 text-gray-500 hover:text-gray-400'
                                    }
                                    cursor-pointer text-sm
                                `}
                            >
                                <span className="text-base">{module.icon}</span>
                                <span className="font-medium">{module.label}</span>
                            </button>
                        );
                    })}

                    {/* Admin Section */}
                    <div style={{ padding: '0.5rem 0.25rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Admin
                        </span>
                    </div>
                    {[
                        { key: 'admin-rates', label: 'Material Rates', icon: '💰' },
                    ].map((module) => {
                        const isActive = activeModule === module.key;
                        return (
                            <button
                                key={module.key}
                                onClick={() => onModuleChange?.(module.key)}
                                className={`
                                        w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200
                                        ${isActive
                                        ? 'bg-primary-500/10 text-white'
                                        : 'hover:bg-white/5 text-gray-500 hover:text-gray-400'
                                    }
                                        cursor-pointer text-sm
                                    `}
                            >
                                <span className="text-base">{module.icon}</span>
                                <span className="font-medium">{module.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Recent Projects */}
                {recentProjects.length > 0 && (
                    <div style={{ padding: '0 1rem', marginTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
                            Recent Projects
                        </div>
                        {recentProjects.map((p) => (
                            <button
                                key={p._id || p.id}
                                onClick={() => onModuleChange?.('project-detail', p)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.375rem 0.75rem', background: 'none', border: 'none',
                                    color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '0.375rem',
                                    textAlign: 'left', transition: 'background 0.15s',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                            >
                                <span style={{ fontSize: '0.875rem' }}>
                                    {p.projectType === 'residential' ? '🏠' : p.projectType === 'commercial' ? '🏢' : '📐'}
                                </span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Role Selector (bottom) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
                    <div className="bg-dark-800/50 rounded-lg p-3">
                        <div style={{ fontSize: '0.625rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                            My Role
                        </div>
                        <Select
                            value={userRole}
                            onChange={setUserRole}
                            size="small"
                            style={{ width: '100%' }}
                            options={ROLES.map((r) => ({ value: r.key, label: r.label }))}
                        />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
                {/* Header */}
                <header className="sticky top-0 z-30 h-16 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
                    <div className="h-full px-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Sidebar Toggle */}
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            {/* Module Title */}
                            <h2 className="text-lg font-semibold text-white">
                                {MODULES.find((m) => m.key === activeModule)?.label ||
                                    (activeModule === 'project-detail' ? 'Project Detail' :
                                        activeModule === 'profile' ? 'Profile' :
                                            activeModule.charAt(0).toUpperCase() + activeModule.slice(1))}
                            </h2>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search Button */}
                            <button
                                onClick={() => setSearchOpen(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.375rem 0.75rem', background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem',
                                    color: '#64748b', cursor: 'pointer', fontSize: '0.8125rem', transition: 'all 0.15s',
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#94a3b8'; }}
                                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#64748b'; }}
                            >
                                <SearchOutlined />
                                <span>Search</span>
                                <span style={{ fontSize: '0.625rem', background: 'rgba(255,255,255,0.06)', padding: '0 0.375rem', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    ⌘K
                                </span>
                            </button>

                            {/* User Menu */}
                            {isAuthenticated && user ? (
                                <Dropdown
                                    menu={{
                                        items: [
                                            {
                                                key: 'user-info', disabled: true,
                                                label: (
                                                    <div className="px-2 py-1">
                                                        <div className="font-semibold text-white">{user.name}</div>
                                                        <div className="text-xs text-gray-400">{user.email}</div>
                                                        <div style={{ fontSize: '0.625rem', color: '#4ade80', marginTop: '0.125rem' }}>
                                                            Role: {ROLES.find((r) => r.key === userRole)?.label}
                                                        </div>
                                                    </div>
                                                ),
                                            },
                                            { type: 'divider' },
                                            { key: 'profile', icon: <UserOutlined />, label: 'My Profile', onClick: () => onModuleChange?.('profile') },
                                            { key: 'settings', icon: <SettingOutlined />, label: 'Settings', onClick: () => onModuleChange?.('profile') },
                                            { type: 'divider' },
                                            { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true, onClick: () => { logout(); onLogout?.(); } },
                                        ],
                                    }}
                                    placement="bottomRight"
                                    trigger={['click']}
                                >
                                    <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                                        <Avatar className="!bg-gradient-to-r !from-primary-500 !to-primary-600" size={36}>
                                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </Avatar>
                                        <span className="text-sm text-gray-300 hidden md:block">{user.name?.split(' ')[0]}</span>
                                    </div>
                                </Dropdown>
                            ) : (
                                <button
                                    onClick={onLogin}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-lg border border-primary-500/30 transition-all"
                                >
                                    <LoginOutlined />
                                    <span>Sign In</span>
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="p-6">
                    <div className="animate-fade-in">{children}</div>
                </main>

                {/* Footer */}
                <footer className="px-6 py-4 border-t border-white/5 text-center">
                    <p className="text-sm text-gray-500">
                        🌿 Green Build Platform v2.0 • Project Management • © 2026
                    </p>
                </footer>
            </div>

            {/* Global Search Overlay */}
            <GlobalSearch
                isOpen={searchOpen}
                onClose={() => setSearchOpen(false)}
                projects={projects}
                onSelectProject={(project) => onModuleChange?.('project-detail', project)}
            />
        </div>
    );
};

export default MainLayout;
