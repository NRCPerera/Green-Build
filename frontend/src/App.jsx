/**
 * =============================================================================
 * MAIN APPLICATION COMPONENT
 * =============================================================================
 * 
 * Smart Construction Management Platform
 * 
 * This app integrates 4 research modules:
 * - Module 1: Quantity Takeoff (CV & BOQ) - DRIVES OTHER MODULES
 * - Module 2: Cost Prediction (Risk & Overruns)
 * - Module 3: Sustainability (Lifecycle & Carbon)
 * - Module 4: Delay Forecast (Timeline & Delays)
 * 
 * Architecture: MVC (Model-View-Controller)
 * State Management: Zustand
 * Styling: Ant Design + Custom CSS
 */

import { useState, useMemo } from 'react';
import { ConfigProvider } from 'antd';
import './index.css';
import customTheme from './views/theme';

// Layout
import MainLayout from './views/layouts/MainLayout.jsx';

// Module Views
import QuantityTakeoffView from './views/modules/QuantityTakeoff/index.jsx';
import CostPredictionView from './views/modules/CostPrediction/index.jsx';
import SustainabilityView from './views/modules/Sustainability/index.jsx';
import DelayForecastView from './views/modules/DelayForecast/index.jsx';

// Global Store
import useProjectStore from './models/useProjectStore';

/**
 * Dashboard Component - Overview of all modules
 */
const DashboardView = () => {
  // Use individual selectors to avoid infinite loops
  const quantityData = useProjectStore((state) => state.quantityData);
  const quantityResult = useProjectStore((state) => state.quantityResult);
  const costPrediction = useProjectStore((state) => state.costPrediction);
  const sustainabilityResult = useProjectStore((state) => state.sustainabilityResult);
  const delayForecast = useProjectStore((state) => state.delayForecast);

  // Memoize module statuses
  const moduleStatuses = useMemo(() => ({
    quantity: quantityResult !== null,
    cost: costPrediction !== null,
    sustainability: sustainabilityResult !== null,
    delay: delayForecast !== null,
  }), [quantityResult, costPrediction, sustainabilityResult, delayForecast]);

  const modules = useMemo(() => [
    {
      key: 'quantity',
      icon: '📐',
      title: 'Quantity Takeoff',
      description: 'Upload floor plans for AI-powered analysis',
      status: quantityData ? 'completed' : 'pending',
      color: 'green',
      stats: quantityData ? [
        { label: 'Wall Area', value: `${quantityData.wallNetSurfaceAreaM2?.toFixed(1)} m²` },
        { label: 'Doors', value: quantityData.itemCounts?.doors || 0 },
        { label: 'Windows', value: quantityData.itemCounts?.windows || 0 },
      ] : null,
    },
    {
      key: 'cost',
      icon: '💰',
      title: 'Cost Prediction',
      description: 'Predict budget overruns and risks',
      status: costPrediction ? 'completed' : quantityData ? 'ready' : 'locked',
      color: 'yellow',
      stats: costPrediction ? [
        { label: 'Risk Level', value: costPrediction.riskLevel },
        { label: 'Overrun', value: `${costPrediction.predictedOverrunPercentage}%` },
      ] : null,
    },
    {
      key: 'sustainability',
      icon: '🌱',
      title: 'Sustainability',
      description: 'Carbon footprint & lifecycle analysis',
      status: sustainabilityResult ? 'completed' : quantityData ? 'ready' : 'locked',
      color: 'emerald',
      stats: sustainabilityResult ? [
        { label: 'Score', value: `${sustainabilityResult.sustainabilityScore}/100` },
      ] : null,
    },
    {
      key: 'delay',
      icon: '⏱️',
      title: 'Delay Forecast',
      description: 'Timeline predictions & risk factors',
      status: delayForecast ? 'completed' : quantityData ? 'ready' : 'locked',
      color: 'blue',
      stats: delayForecast ? [
        { label: 'Delay', value: `${delayForecast.predictedDelayMonths?.toFixed(1)} mo` },
        { label: 'Risk', value: delayForecast.riskLevel },
      ] : null,
    },
  ], [quantityData, costPrediction, sustainabilityResult, delayForecast]);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-500/20 via-primary-500/10 to-transparent 
                      border border-primary-500/30 rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome to Green Build Platform
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Your AI-powered construction management solution. Start by uploading a floor plan
          in the Quantity Takeoff module, then unlock insights across all analysis modules.
        </p>
      </div>

      {/* Data Flow Visualization */}
      <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">📊 Data Flow Architecture</h2>
        <div className="flex items-center justify-center gap-4 py-6 overflow-x-auto">
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl
                          ${quantityData ? 'bg-primary-500/20 border-primary-500/50' : 'bg-dark-700'} border`}>
              📐
            </div>
            <span className="text-xs text-gray-400 mt-2">Module 1</span>
            <span className="text-xs text-white">Quantity</span>
          </div>

          <div className="flex items-center">
            <div className={`w-8 h-0.5 ${quantityData ? 'bg-primary-500' : 'bg-dark-600'}`} />
            <svg className={`w-4 h-4 ${quantityData ? 'text-primary-500' : 'text-dark-600'}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>

          <div className={`px-4 py-2 rounded-lg text-xs font-medium
                        ${quantityData ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-dark-700 text-gray-500'}`}>
            Global Store
          </div>

          <div className="flex items-center">
            <svg className={`w-4 h-4 ${quantityData ? 'text-primary-500' : 'text-dark-600'}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <div className={`w-8 h-0.5 ${quantityData ? 'bg-primary-500' : 'bg-dark-600'}`} />
          </div>

          <div className="flex gap-4">
            {[
              { icon: '💰', label: 'Cost' },
              { icon: '🌱', label: 'Sustain' },
              { icon: '⏱️', label: 'Delay' },
            ].map((m, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl
                              ${quantityData ? 'bg-dark-700 border-white/10' : 'bg-dark-800 border-white/5'} border`}>
                  {m.icon}
                </div>
                <span className="text-xs text-gray-500 mt-1">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((module) => (
          <div
            key={module.key}
            className={`bg-dark-800/50 border rounded-2xl p-6 transition-all duration-300
                      ${module.status === 'completed'
                ? 'border-primary-500/30 shadow-glow-sm'
                : module.status === 'ready'
                  ? 'border-white/10 hover:border-white/20'
                  : 'border-white/5 opacity-60'
              }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{module.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{module.title}</h3>
                  <p className="text-sm text-gray-400">{module.description}</p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium
                            ${module.status === 'completed'
                  ? 'bg-primary-500/20 text-primary-400'
                  : module.status === 'ready'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-500/20 text-gray-500'
                }`}>
                {module.status === 'completed' ? '✓ Complete' : module.status === 'ready' ? 'Ready' : '🔒 Locked'}
              </span>
            </div>

            {module.stats && (
              <div className="mt-4 pt-4 border-t border-white/5 flex gap-6">
                {module.stats.map((stat, i) => (
                  <div key={i}>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-lg font-semibold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Getting Started */}
      {!quantityData && (
        <div className="bg-gradient-to-r from-blue-500/10 to-transparent 
                        border border-blue-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">🚀 Getting Started</h3>
          <p className="text-gray-400 mb-4">
            To begin your analysis, navigate to the <strong className="text-white">Quantity Takeoff</strong> module
            using the sidebar and upload a floor plan image.
          </p>
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Click "Quantity Takeoff" in the sidebar to start
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main App Component
 */
function App() {
  const [activeModule, setActiveModule] = useState('dashboard');

  // Render the appropriate module view
  const renderModuleView = () => {
    switch (activeModule) {
      case 'quantity':
        return <QuantityTakeoffView />;
      case 'cost':
        return <CostPredictionView />;
      case 'sustainability':
        return <SustainabilityView />;
      case 'delay':
        return <DelayForecastView />;
      case 'dashboard':
      default:
        return <DashboardView />;
    }
  };

  return (
    <ConfigProvider theme={customTheme}>
      <MainLayout activeModule={activeModule} onModuleChange={setActiveModule}>
        {renderModuleView()}
      </MainLayout>
    </ConfigProvider>
  );
}

export default App;
