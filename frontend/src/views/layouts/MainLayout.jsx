import { useState, useMemo } from 'react';
import { Dropdown, Avatar, Space } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined, LoginOutlined } from '@ant-design/icons';
import useProjectStore from '../../models/useProjectStore';
import useAuthStore from '../../models/useAuthStore';

// Module configuration
const MODULES = [
    {
        key: 'dashboard',
        label: 'Dashboard',
        icon: '🏠',
        description: 'Overview',
        requiresAuth: false,
        requiresQuantity: false,
    },
    {
        key: 'projects',
        label: 'My Projects',
        icon: '📁',
        description: 'Manage Projects',
        requiresAuth: true,
        requiresQuantity: false,
    },
    {
        key: 'quantity',
        label: 'Quick Analysis',
        icon: '📐',
        description: 'CV & BOQ',
        requiresAuth: false,
        requiresQuantity: false,
    },
    {
        key: 'cost',
        label: 'Cost Prediction',
        icon: '💰',
        description: 'Risk Analysis',
        requiresAuth: false,
        requiresQuantity: false,
    },
    {
        key: 'sustainability',
        label: 'Sustainability',
        icon: '🌱',
        description: 'Carbon & LCC',
        requiresAuth: false,
        requiresQuantity: false,
    },
    {
        key: 'delay',
        label: 'Delay Forecast',
        icon: '⏱️',
        description: 'Timeline',
        requiresAuth: false,
        requiresQuantity: false,
    },
];

/**
 * Main Layout Component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render in main area
 * @param {string} props.activeModule - Currently active module key
 * @param {Function} props.onModuleChange - Callback when module is selected
 * @param {Function} props.onLogout - Callback when user logs out
 * @param {Function} props.onLogin - Callback when user wants to login
 */
const MainLayout = ({ children, activeModule = 'dashboard', onModuleChange, onLogout, onLogin }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Auth state
    const { user, isAuthenticated, logout } = useAuthStore();

    // Use individual selectors to avoid creating new objects
    const quantityData = useProjectStore((state) => state.quantityData);
    const quantityResult = useProjectStore((state) => state.quantityResult);
    const costPrediction = useProjectStore((state) => state.costPrediction);
    const sustainabilityResult = useProjectStore((state) => state.sustainabilityResult);
    const delayForecast = useProjectStore((state) => state.delayForecast);

    const hasQuantityData = quantityData !== null;

    // Memoize module statuses to prevent re-renders
    const moduleStatuses = useMemo(() => ({
        quantity: quantityResult !== null,
        cost: costPrediction !== null,
        sustainability: sustainabilityResult !== null,
        delay: delayForecast !== null,
    }), [quantityResult, costPrediction, sustainabilityResult, delayForecast]);

    const completedCount = useMemo(() =>
        Object.values(moduleStatuses).filter(Boolean).length,
        [moduleStatuses]
    );

    const handleModuleClick = (moduleKey) => {
        const module = MODULES.find((m) => m.key === moduleKey);

        // Check if module requires authentication
        if (module?.requiresAuth && !isAuthenticated) {
            onLogin?.();
            return;
        }

        if (module?.requiresQuantity && !hasQuantityData) {
            console.warn('Complete Quantity Takeoff first');
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
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {MODULES.map((module) => {
                        const isActive = activeModule === module.key;
                        const isDisabled = module.requiresQuantity && !hasQuantityData;
                        const isCompleted = moduleStatuses[module.key];

                        return (
                            <button
                                key={module.key}
                                onClick={() => handleModuleClick(module.key)}
                                disabled={isDisabled}
                                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive
                                        ? 'bg-gradient-to-r from-primary-500/20 to-primary-500/5 border-l-4 border-primary-400'
                                        : 'hover:bg-white/5 border-l-4 border-transparent'
                                    }
                  ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
                            >
                                <span className="text-xl">{module.icon}</span>
                                <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                                            {module.label}
                                        </span>
                                        {isCompleted && (
                                            <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500">{module.description}</span>
                                </div>
                            </button>
                        );
                    })}
                </nav>

                {/* Module Progress */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
                    <div className="bg-dark-800/50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-400">Analysis Progress</span>
                            <span className="text-xs text-primary-400 font-semibold">
                                {completedCount}/4
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-dark-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500"
                                style={{
                                    width: `${(completedCount / 4) * 100}%`,
                                }}
                            />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                            {Object.entries(moduleStatuses).map(([key, completed]) => (
                                <span
                                    key={key}
                                    className={`
                    text-[10px] px-2 py-0.5 rounded-full
                    ${completed
                                            ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                            : 'bg-dark-700 text-gray-500 border border-white/5'
                                        }
                  `}
                                >
                                    {key.charAt(0).toUpperCase() + key.slice(1)}
                                </span>
                            ))}
                        </div>
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
                                <svg
                                    className="w-5 h-5 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    {sidebarOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                                    )}
                                </svg>
                            </button>

                            {/* Current Module Title */}
                            <div>
                                <h2 className="text-lg font-semibold text-white">
                                    {MODULES.find((m) => m.key === activeModule)?.label || 'Dashboard'}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Quantity Data Status */}
                            {hasQuantityData ? (
                                <span className="flex items-center gap-2 text-sm text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-full border border-primary-500/20">
                                    <span className="w-2 h-2 rounded-full bg-primary-400" />
                                    Quantity Data Ready
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                                    Complete Quantity Takeoff
                                </span>
                            )}

                            {/* User Menu */}
                            {isAuthenticated && user ? (
                                <Dropdown
                                    menu={{
                                        items: [
                                            {
                                                key: 'user-info',
                                                label: (
                                                    <div className="px-2 py-1">
                                                        <div className="font-semibold text-white">{user.name}</div>
                                                        <div className="text-xs text-gray-400">{user.email}</div>
                                                    </div>
                                                ),
                                                disabled: true,
                                            },
                                            { type: 'divider' },
                                            {
                                                key: 'profile',
                                                icon: <UserOutlined />,
                                                label: 'My Profile',
                                                onClick: () => onModuleChange?.('profile'),
                                            },
                                            {
                                                key: 'settings',
                                                icon: <SettingOutlined />,
                                                label: 'Settings',
                                                onClick: () => onModuleChange?.('profile'),
                                            },
                                            { type: 'divider' },
                                            {
                                                key: 'logout',
                                                icon: <LogoutOutlined />,
                                                label: 'Sign Out',
                                                danger: true,
                                                onClick: () => {
                                                    logout();
                                                    onLogout?.();
                                                },
                                            },
                                        ],
                                    }}
                                    placement="bottomRight"
                                    trigger={['click']}
                                >
                                    <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                                        <Avatar
                                            className="!bg-gradient-to-r !from-primary-500 !to-primary-600"
                                            size={36}
                                        >
                                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </Avatar>
                                        <span className="text-sm text-gray-300 hidden md:block">
                                            {user.name?.split(' ')[0]}
                                        </span>
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
                    <div className="animate-fade-in">
                        {children}
                    </div>
                </main>

                {/* Footer */}
                <footer className="px-6 py-4 border-t border-white/5 text-center">
                    <p className="text-sm text-gray-500">
                        🌿 Green Build Platform v1.0 • Smart Construction Management • © 2026
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default MainLayout;
