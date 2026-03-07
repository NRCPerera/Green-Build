import { useState, useEffect, useMemo } from 'react';
import { ConfigProvider, Button, Result, Card, Empty, Progress, Tag } from 'antd';
import './index.css';
import customTheme from './views/theme';

// Layout
import MainLayout from './views/layouts/MainLayout.jsx';

// Module Views
import QuantityTakeoffView from './views/modules/QuantityTakeoff/index.jsx';
import CostPredictionView from './views/modules/CostPrediction/index.jsx';
import SustainabilityView from './views/modules/Sustainability/index.jsx';
import DelayForecastView from './views/modules/DelayForecast/index.jsx';

// Auth Views
import { LoginView, RegisterView, ProfileView } from './views/auth';

// Project Views
import { ProjectsListView, ProjectDetailView } from './views/projects';

// Stores
import useAuthStore from './models/useAuthStore';
import usePMStore, { PROJECT_STATUSES } from './models/usePMStore';
import useProjectsController from './controllers/useProjectsController';

// ─── PM Dashboard ──────────────────────────────────────────────────
const DashboardView = ({ onLogin, isAuthenticated, projects, onSelectProject }) => {
  const { getOverdueTasks, getUpcomingTasks, recentProjectIds, tasksByProject } = usePMStore();

  const overdueTasks = useMemo(() => getOverdueTasks(null), [getOverdueTasks, tasksByProject]);
  const upcomingTasks = useMemo(() => getUpcomingTasks(null, 7), [getUpcomingTasks, tasksByProject]);
  const computeProgress = usePMStore((s) => s.computeProgress);

  // Stats by status
  const statsByStatus = useMemo(() => {
    const counts = { draft: 0, active: 0, 'on-hold': 0, completed: 0, cancelled: 0 };
    (projects || []).forEach((p) => {
      const s = p.status || 'draft';
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [projects]);

  const totalTasks = useMemo(() => {
    return Object.values(tasksByProject).flat().length;
  }, [tasksByProject]);

  const doneTasks = useMemo(() => {
    return Object.values(tasksByProject).flat().filter((t) => t.status === 'done').length;
  }, [tasksByProject]);

  // Recent projects
  const recentProjects = useMemo(() => {
    if (!projects?.length) return [];
    return recentProjectIds
      .map((id) => projects.find((p) => (p._id || p.id) === id))
      .filter(Boolean)
      .slice(0, 4);
  }, [projects, recentProjectIds]);

  if (!isAuthenticated) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-primary-500/20 via-primary-500/10 to-transparent border border-primary-500/30 rounded-2xl p-8 text-center py-16">
          <h1 className="text-4xl font-bold text-white mb-4">
            🌿 Green Build Project Manager
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-8">
            The comprehensive AI-powered project management solution for construction.
            Manage tasks, track milestones, predict costs, and optimize sustainability.
          </p>
          <Button
            type="primary" size="large" onClick={onLogin}
            className="!bg-gradient-to-r !from-primary-500 !to-primary-600 !border-0 !h-12 !px-8 !text-lg"
          >
            Get Started
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: '📁', title: 'Project Management', desc: 'Kanban tasks & milestones' },
            { icon: '📐', title: 'Quantity Takeoff', desc: 'AI floor plan analysis' },
            { icon: '💰', title: 'Cost Prediction', desc: 'Budget & risk estimation' },
            { icon: '🌱', title: 'Sustainability', desc: 'Carbon footprint tracking' },
          ].map((f, i) => (
            <div key={i} className="bg-dark-800/50 border border-white/5 rounded-xl p-6 hover:border-primary-500/30 transition-colors">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Authenticated Dashboard
  return (
    <div className="space-y-6">
      {/* Status Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {PROJECT_STATUSES.map((s) => (
          <div key={s.key} style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: s.color }} />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#e2e8f0' }}>{statsByStatus[s.key] || 0}</div>
          </div>
        ))}
      </div>

      {/* Middle Row: Tasks Overview + Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Progress */}
        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <h3 style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Task Overview</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: '#e2e8f0' }}>{doneTasks}/{totalTasks}</span>
            <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>
              {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}% done
            </span>
          </div>
          <div style={{ width: '100%', height: '0.5rem', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%`, background: 'linear-gradient(to right, #22c55e, #4ade80)', borderRadius: '9999px', transition: 'width 0.5s' }} />
          </div>
          <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.5rem' }}>
            across {projects?.length || 0} projects
          </p>
        </div>

        {/* Overdue Tasks */}
        <div style={{ background: 'rgba(30,41,59,0.5)', border: `1px solid ${overdueTasks.length > 0 ? 'rgba(255,77,79,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '0.75rem', padding: '1.25rem' }}>
          <h3 style={{ color: overdueTasks.length > 0 ? '#ff7875' : '#e2e8f0', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            ⚠️ Overdue Tasks
          </h3>
          {overdueTasks.length === 0 ? (
            <p style={{ color: '#52c41a', fontSize: '0.8125rem' }}>✅ No overdue tasks!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {overdueTasks.slice(0, 4).map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', background: 'rgba(255,77,79,0.05)', borderRadius: '0.375rem' }}>
                  <span className={`priority-dot ${t.priority}`} />
                  <span style={{ flex: 1, fontSize: '0.75rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  <span style={{ fontSize: '0.625rem', color: '#ff7875' }}>
                    {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
              {overdueTasks.length > 4 && (
                <span style={{ fontSize: '0.6875rem', color: '#ff7875' }}>+{overdueTasks.length - 4} more</span>
              )}
            </div>
          )}
        </div>

        {/* Upcoming 7 Days */}
        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <h3 style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            📅 Upcoming (7 days)
          </h3>
          {upcomingTasks.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>No upcoming deadlines</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {upcomingTasks.slice(0, 5).map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.375rem' }}>
                  <span className={`priority-dot ${t.priority}`} />
                  <span style={{ flex: 1, fontSize: '0.75rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  <span style={{ fontSize: '0.625rem', color: '#94a3b8' }}>
                    {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div>
          <h3 style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Recent Projects</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentProjects.map((p) => {
              const progress = computeProgress(p._id || p.id);
              return (
                <div
                  key={p._id || p.id}
                  onClick={() => onSelectProject?.(p)}
                  style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1rem', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>
                      {p.projectType === 'residential' ? '🏠' : p.projectType === 'commercial' ? '🏢' : '📐'}
                    </span>
                    <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  </div>
                  <span className={`status-badge ${p.status || 'draft'}`}>
                    <span className="status-dot" />
                    {(p.status || 'draft').replace('-', ' ')}
                  </span>
                  {progress.total > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.625rem', color: '#64748b' }}>{progress.done}/{progress.total} tasks</span>
                        <span style={{ fontSize: '0.625rem', color: '#4ade80' }}>{progress.percentage}%</span>
                      </div>
                      <div style={{ width: '100%', height: '0.25rem', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress.percentage}%`, background: 'linear-gradient(to right, #22c55e, #4ade80)', borderRadius: '9999px' }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Button
          type="primary"
          onClick={() => onSelectProject?.('__new__')}
          className="!bg-gradient-to-r !from-primary-500 !to-primary-600 !border-0"
        >
          + New Project
        </Button>
      </div>
    </div>
  );
};

// ─── Main App Component ────────────────────────────────────────────
function App() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [authView, setAuthView] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const { isAuthenticated, checkAuth, user } = useAuthStore();
  const { trackRecentProject } = usePMStore();
  const { projects, fetchProjects } = useProjectsController();

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { if (isAuthenticated) fetchProjects(); }, [isAuthenticated, fetchProjects]);

  const handleAuthSuccess = () => { setAuthView(null); setActiveModule('projects'); };
  const handleLogout = () => { setActiveModule('dashboard'); setSelectedProject(null); };
  const handleLoginClick = () => { setAuthView('login'); };

  const handleSelectProject = (project) => {
    if (project === '__new__') {
      setActiveModule('projects');
      return;
    }
    setSelectedProject(project);
    setActiveModule('project-detail');
    trackRecentProject(project._id || project.id);
  };

  const handleModuleChange = (key, project) => {
    if (key === 'project-detail' && project) {
      handleSelectProject(project);
      return;
    }
    // If navigating to cost or delay from project detail, keep project selected
    if ((key === 'cost' || key === 'delay') && project) {
      setSelectedProject(project);
    } else if (key !== 'project-detail') {
      setSelectedProject(null);
    }
    setActiveModule(key);
  };

  // Auth views
  if (authView === 'login') {
    return (
      <ConfigProvider theme={customTheme}>
        <LoginView onSwitchToRegister={() => setAuthView('register')} onLoginSuccess={handleAuthSuccess} />
      </ConfigProvider>
    );
  }
  if (authView === 'register') {
    return (
      <ConfigProvider theme={customTheme}>
        <RegisterView onSwitchToLogin={() => setAuthView('login')} onRegisterSuccess={handleAuthSuccess} />
      </ConfigProvider>
    );
  }

  const renderModuleView = () => {
    switch (activeModule) {
      case 'projects':
        return isAuthenticated ? (
          <ProjectsListView onSelectProject={handleSelectProject} />
        ) : (
          <Result status="403" title="Authentication Required" subTitle="Please sign in to view your projects."
            extra={<Button type="primary" onClick={handleLoginClick}>Sign In</Button>} />
        );

      case 'project-detail':
        return isAuthenticated && selectedProject ? (
          <ProjectDetailView
            project={selectedProject}
            onBack={() => setActiveModule('projects')}
            onNavigate={(module, proj) => handleModuleChange(module, proj || selectedProject)}
          />
        ) : (
          <ProjectsListView onSelectProject={handleSelectProject} />
        );

      case 'quantity': return <QuantityTakeoffView />;
      case 'cost': return <CostPredictionView project={selectedProject} onBack={() => selectedProject ? setActiveModule('project-detail') : setActiveModule('dashboard')} />;
      case 'sustainability': return <SustainabilityView />;
      case 'delay': return <DelayForecastView project={selectedProject} onBack={() => selectedProject ? setActiveModule('project-detail') : setActiveModule('dashboard')} />;
      case 'profile': return <ProfileView />;

      case 'dashboard':
      default:
        return (
          <DashboardView
            onLogin={handleLoginClick}
            isAuthenticated={isAuthenticated}
            projects={projects}
            onSelectProject={handleSelectProject}
          />
        );
    }
  };

  return (
    <ConfigProvider theme={customTheme}>
      <MainLayout
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        onLogout={handleLogout}
        onLogin={handleLoginClick}
        projects={projects}
      >
        {renderModuleView()}
      </MainLayout>
    </ConfigProvider>
  );
}

export default App;
