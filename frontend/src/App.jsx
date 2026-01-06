import { useState, useEffect } from 'react';
import { ConfigProvider, Button, Result } from 'antd';
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

// Global Store
import useAuthStore from './models/useAuthStore';

// Dashboard component for non-authenticated users or overview
const DashboardView = ({ onLogin }) => {
  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-500/20 via-primary-500/10 to-transparent 
                      border border-primary-500/30 rounded-2xl p-8 text-center py-16">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to Green Build Platform
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-8">
          The comprehensive AI-powered solution for construction management.
          Manage projects, analyze floor plans, predict costs, and optimize sustainability.
        </p>
        <Button
          type="primary"
          size="large"
          onClick={onLogin}
          className="!bg-gradient-to-r !from-primary-500 !to-primary-600 !border-0 !h-12 !px-8 !text-lg"
        >
          Get Started
        </Button>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: '📁', title: 'Project Management', desc: 'Organize work in projects' },
          { icon: '📐', title: 'Quantity Takeoff', desc: 'AI floor plan analysis' },
          { icon: '💰', title: 'Cost Prediction', desc: 'Budget & risk estimation' },
          { icon: '🌱', title: 'Sustainability', desc: 'Carbon footprint tracking' }
        ].map((feature, i) => (
          <div key={i} className="bg-dark-800/50 border border-white/5 rounded-xl p-6 hover:border-primary-500/30 transition-colors">
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-gray-400 text-sm">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Main App Component
 */
function App() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [authView, setAuthView] = useState(null); // 'login' | 'register' | null
  const [selectedProject, setSelectedProject] = useState(null);

  const { isAuthenticated, checkAuth, user } = useAuthStore();

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Handle successful login/register
  const handleAuthSuccess = () => {
    setAuthView(null);
    setActiveModule('projects'); // Redirect to projects after login
  };

  // Handle logout
  const handleLogout = () => {
    setActiveModule('dashboard');
    setSelectedProject(null);
  };

  // Handle login button click
  const handleLoginClick = () => {
    setAuthView('login');
  };

  // Handle project selection
  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setActiveModule('project-detail');
  };

  // Handle floor plan selection inside a project
  const handleSelectFloorPlan = (floorPlan) => {
    // Logic for handling floor plan selection
  };

  // Show login view
  if (authView === 'login') {
    return (
      <ConfigProvider theme={customTheme}>
        <LoginView
          onSwitchToRegister={() => setAuthView('register')}
          onLoginSuccess={handleAuthSuccess}
        />
      </ConfigProvider>
    );
  }

  // Show register view
  if (authView === 'register') {
    return (
      <ConfigProvider theme={customTheme}>
        <RegisterView
          onSwitchToLogin={() => setAuthView('login')}
          onRegisterSuccess={handleAuthSuccess}
        />
      </ConfigProvider>
    );
  }

  // Render the appropriate module view
  const renderModuleView = () => {
    switch (activeModule) {
      case 'projects':
        return isAuthenticated ? (
          <ProjectsListView onSelectProject={handleSelectProject} />
        ) : (
          <Result
            status="403"
            title="Authentication Required"
            subTitle="Please sign in to view your projects."
            extra={<Button type="primary" onClick={handleLoginClick}>Sign In</Button>}
          />
        );

      case 'project-detail':
        return isAuthenticated && selectedProject ? (
          <ProjectDetailView
            project={selectedProject}
            onBack={() => setActiveModule('projects')}
            onSelectFloorPlan={handleSelectFloorPlan}
          />
        ) : (
          <ProjectsListView onSelectProject={handleSelectProject} />
        );

      // Legacy direct module access
      case 'quantity':
        return <QuantityTakeoffView />;
      case 'cost':
        return <CostPredictionView />;
      case 'sustainability':
        return <SustainabilityView />;
      case 'delay':
        return <DelayForecastView />;

      case 'profile':
        return <ProfileView />;

      case 'dashboard':
      default:
        // If logged in, show projects as dashboard
        if (isAuthenticated) {
          return <ProjectsListView onSelectProject={handleSelectProject} />;
        }
        return <DashboardView onLogin={handleLoginClick} />;
    }
  };

  return (
    <ConfigProvider theme={customTheme}>
      <MainLayout
        activeModule={activeModule}
        onModuleChange={(key) => {
          // Reset project selection when navigating away from project views
          if (key !== 'project-detail') {
            setSelectedProject(null);
          }
          setActiveModule(key);
        }}
        onLogout={handleLogout}
        onLogin={handleLoginClick}
      >
        {renderModuleView()}
      </MainLayout>
    </ConfigProvider>
  );
}

export default App;
