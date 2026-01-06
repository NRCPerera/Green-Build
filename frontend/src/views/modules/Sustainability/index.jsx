import { useState, useEffect } from 'react';
import useSustainabilityController from '../../../controllers/useSustainabilityController';

/**
 * Sustainability Analysis View - Professional QS Dashboard
 * 
 * Features:
 * - Grouped input fields with tooltips
 * - Loading states with spinner
 * - Smart suggestion engine
 * - Risk traffic light
 * - Cost visualization bar
 * - Input validation
 */
const SustainabilityView = () => {
    // Form state with all model features
    const [formData, setFormData] = useState({
        // Building Specs
        areaSqft: 2000,
        floors: 2,
        
        // Sustainability Score Features
        energyKwhYear: 15000,
        embodiedCo2Tons: 45,
        operationalCo2Tons: 12,
        energyEfficiency: 75,
        energyEfficiencyPerSqft: 0.85,
        costPerSqftForSustainability: 250,
        energyCo2ImpactRelativeToCost: 0.15,
        
        // Lifecycle Cost Features
        constructionCostPerSqft: 12000,
        maintenanceCostPerYear: 150000,
        
        // Risk Prediction Features
        designCompleteness: 85,
        projectComplexityScore: 50,
        changeOrderFrequency: 2,
        inflationRate: 6.5,
        interestRate: 12,
        contractorExperienceYears: 10
    });

    // Validation errors
    const [validationErrors, setValidationErrors] = useState({});

    const {
        loading,
        error,
        result,
        hasResult,
        mlServiceStatus,
        analyzeProject,
        clearResults,
        formatCurrencyLKR,
        getRiskColor,
        getScoreColor
    } = useSustainabilityController();

    // Field definitions with tooltips
    const fieldInfo = {
        areaSqft: { label: 'Area (SQFT)', tooltip: 'Total floor area in square feet', min: 100 },
        floors: { label: 'Number of Floors', tooltip: 'Total number of stories including ground floor', min: 1, max: 100 },
        energyKwhYear: { label: 'Energy Consumption (kWh/year)', tooltip: 'Annual energy consumption in kilowatt-hours', min: 0 },
        embodiedCo2Tons: { label: 'Embodied CO₂ (tons)', tooltip: 'Total CO₂ emissions from materials and construction', min: 0 },
        operationalCo2Tons: { label: 'Operational CO₂ (tons/year)', tooltip: 'Annual CO₂ from building operations', min: 0 },
        energyEfficiency: { label: 'Energy Efficiency Rating', tooltip: 'Building efficiency score (0-100)', min: 0, max: 100 },
        energyEfficiencyPerSqft: { label: 'Efficiency per SQFT', tooltip: 'Energy efficiency normalized by area', min: 0, step: 0.01 },
        costPerSqftForSustainability: { label: 'Sustainability Cost/SQFT (LKR)', tooltip: 'Additional cost for sustainable features', min: 0 },
        energyCo2ImpactRelativeToCost: { label: 'CO₂ Impact Ratio', tooltip: 'CO₂ impact relative to cost investment', min: 0, step: 0.01 },
        constructionCostPerSqft: { label: 'Construction Cost/SQFT (LKR)', tooltip: 'Base construction cost per square foot', min: 0 },
        maintenanceCostPerYear: { label: 'Maintenance Cost/Year (LKR)', tooltip: 'Annual maintenance and upkeep costs', min: 0 },
        designCompleteness: { label: 'Design Completeness (%)', tooltip: 'How complete are design documents before construction', min: 0, max: 100 },
        projectComplexityScore: { label: 'Complexity Score', tooltip: 'Project complexity rating (0=Simple, 100=Very Complex)', min: 0, max: 100 },
        changeOrderFrequency: { label: 'Change Order Frequency', tooltip: 'Expected number of change orders', min: 0, step: 0.1 },
        inflationRate: { label: 'Inflation Rate (%)', tooltip: 'Current economic inflation rate', step: 0.1 },
        interestRate: { label: 'Interest Rate (%)', tooltip: 'Current lending interest rate', step: 0.1 },
        contractorExperienceYears: { label: 'Contractor Experience (years)', tooltip: 'Years of experience of main contractor', min: 0 }
    };

    // Validate input - ensure positive numbers
    const validateInput = (name, value) => {
        const fieldConfig = fieldInfo[name];
        const numValue = parseFloat(value);
        
        if (isNaN(numValue)) {
            return 'Please enter a valid number';
        }
        
        if (fieldConfig?.min !== undefined && numValue < fieldConfig.min) {
            return `Minimum value is ${fieldConfig.min}`;
        }
        
        if (fieldConfig?.max !== undefined && numValue > fieldConfig.max) {
            return `Maximum value is ${fieldConfig.max}`;
        }
        
        if (numValue < 0) {
            return 'Value must be positive';
        }
        
        return null;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Validate
        const error = validateInput(name, value);
        setValidationErrors(prev => ({
            ...prev,
            [name]: error
        }));
        
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate all fields before submit
        let hasErrors = false;
        const errors = {};
        
        Object.keys(formData).forEach(key => {
            const error = validateInput(key, formData[key]);
            if (error) {
                errors[key] = error;
                hasErrors = true;
            }
        });
        
        setValidationErrors(errors);
        
        if (hasErrors) {
            return;
        }
        
        await analyzeProject(formData);
    };

    // Generate smart suggestions based on results
    const generateSuggestions = () => {
        if (!result) return [];
        
        const suggestions = [];
        
        // Sustainability suggestions
        if (result.sustainabilityScore < 40) {
            suggestions.push({
                type: 'danger',
                icon: '🔴',
                title: 'Low Sustainability Score',
                text: 'Consider using recycled materials or increasing energy efficiency to improve sustainability.'
            });
        } else if (result.sustainabilityScore < 60) {
            suggestions.push({
                type: 'warning',
                icon: '🟡',
                title: 'Moderate Sustainability',
                text: 'Add solar panels, better insulation, or sustainable material alternatives.'
            });
        } else if (result.sustainabilityScore >= 80) {
            suggestions.push({
                type: 'success',
                icon: '🟢',
                title: 'Excellent Sustainability!',
                text: 'This project demonstrates excellent environmental performance.'
            });
        }
        
        // Risk suggestions
        if (result.isHighRisk || result.riskLevel === 'high') {
            suggestions.push({
                type: 'danger',
                icon: '⚠️',
                title: 'High Risk Detected',
                text: 'Recommend reviewing Contractor Experience or increasing Design Completeness.'
            });
        } else if (result.riskLevel === 'medium') {
            suggestions.push({
                type: 'warning',
                icon: '⚡',
                title: 'Moderate Risk Level',
                text: 'Monitor change orders and maintain clear communication with stakeholders.'
            });
        }
        
        // Cost suggestions
        const costPerSqft = result.lifecycleCostLkr / parseFloat(formData.areaSqft || 1);
        const avgCostPerSqft = 15000;
        
        if (costPerSqft > avgCostPerSqft * 1.5) {
            suggestions.push({
                type: 'info',
                icon: '💰',
                title: 'Above Average Cost',
                text: `Cost per sqft (LKR ${Math.round(costPerSqft).toLocaleString()}) is above average. Check "High End" material choices.`
            });
        }
        
        // Success message if all good
        if (result.sustainabilityScore >= 60 && !result.isHighRisk && result.riskLevel !== 'high') {
            suggestions.push({
                type: 'success',
                icon: '✅',
                title: 'Project Looks Good',
                text: 'Overall parameters are within acceptable ranges.'
            });
        }
        
        return suggestions;
    };

    // Traffic light component
    const TrafficLight = ({ riskLevel }) => {
        return (
            <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1 p-2 bg-dark-900 rounded-lg border border-white/10">
                    <div className={`w-6 h-6 rounded-full transition-all duration-500 ${
                        riskLevel === 'high' ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-red-900/30'
                    }`} />
                    <div className={`w-6 h-6 rounded-full transition-all duration-500 ${
                        riskLevel === 'medium' ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50' : 'bg-yellow-900/30'
                    }`} />
                    <div className={`w-6 h-6 rounded-full transition-all duration-500 ${
                        riskLevel === 'low' ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-green-900/30'
                    }`} />
                </div>
                <span className={`text-2xl font-bold uppercase ${
                    riskLevel === 'high' ? 'text-red-400' :
                    riskLevel === 'medium' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                    {riskLevel}
                </span>
            </div>
        );
    };

    // Cost bar component
    const CostBar = ({ cost, maxCost = 100000000 }) => {
        const percentage = Math.min((cost / maxCost) * 100, 100);
        
        return (
            <div className="mt-4">
                <div className="h-6 bg-dark-900 rounded-lg overflow-hidden border border-white/10">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg transition-all duration-1000 ease-out"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span>50M LKR</span>
                    <span>100M LKR</span>
                </div>
            </div>
        );
    };

    // Input field with tooltip
    const InputField = ({ name, section = 'default' }) => {
        const info = fieldInfo[name];
        const hasError = validationErrors[name];
        
        const sectionColors = {
            sustainability: 'focus:ring-green-500',
            cost: 'focus:ring-blue-500',
            risk: 'focus:ring-yellow-500',
            default: 'focus:ring-primary'
        };
        
        return (
            <div className="relative group">
                <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                    {info?.label || name}
                    <span className="relative cursor-help">
                        <span className="text-gray-600 hover:text-gray-400">ℹ️</span>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-dark-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 z-10">
                            {info?.tooltip}
                        </span>
                    </span>
                </label>
                <input
                    type="number"
                    name={name}
                    value={formData[name]}
                    onChange={handleInputChange}
                    min={info?.min}
                    max={info?.max}
                    step={info?.step || 1}
                    className={`w-full px-4 py-3 bg-dark-700 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all ${
                        hasError ? 'border-red-500' : 'border-white/10'
                    } ${sectionColors[section]}`}
                />
                {hasError && (
                    <span className="text-xs text-red-400 mt-1 block">{hasError}</span>
                )}
            </div>
        );
    };

    const suggestions = generateSuggestions();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-4xl animate-bounce">🏗️</span>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Quantity Surveying Dashboard</h2>
                            <p className="text-gray-400 mt-1">
                                AI-Powered Sustainability, Cost & Risk Analysis
                            </p>
                        </div>
                    </div>
                    {/* ML Service Status */}
                    {mlServiceStatus && (
                        <div className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                            mlServiceStatus.status === 'healthy' || mlServiceStatus.status === 'ok'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${
                                mlServiceStatus.status === 'healthy' || mlServiceStatus.status === 'ok'
                                    ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                            }`} />
                            {mlServiceStatus.status === 'healthy' || mlServiceStatus.status === 'ok'
                                ? 'ML Service Online' 
                                : 'ML Service Unavailable'}
                        </div>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-2xl">❌</span>
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Building Specifications */}
                        <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-purple-400">🏢</span> Building Specifications
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField name="areaSqft" section="default" />
                                <InputField name="floors" section="default" />
                            </div>
                        </div>

                        {/* Sustainability Score Inputs */}
                        <div className="bg-dark-800/50 border border-green-500/10 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-green-400">🌍</span> Sustainability Inputs
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField name="energyKwhYear" section="sustainability" />
                                <InputField name="embodiedCo2Tons" section="sustainability" />
                                <InputField name="operationalCo2Tons" section="sustainability" />
                                <InputField name="energyEfficiency" section="sustainability" />
                                <InputField name="energyEfficiencyPerSqft" section="sustainability" />
                                <InputField name="costPerSqftForSustainability" section="sustainability" />
                                <div className="md:col-span-2">
                                    <InputField name="energyCo2ImpactRelativeToCost" section="sustainability" />
                                </div>
                            </div>
                        </div>

                        {/* Lifecycle Cost Inputs */}
                        <div className="bg-dark-800/50 border border-blue-500/10 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-blue-400">💰</span> Lifecycle Cost Inputs
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField name="constructionCostPerSqft" section="cost" />
                                <InputField name="maintenanceCostPerYear" section="cost" />
                            </div>
                        </div>

                        {/* Risk Prediction Inputs */}
                        <div className="bg-dark-800/50 border border-yellow-500/10 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-yellow-400">⚠️</span> Risk Assessment Inputs
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField name="designCompleteness" section="risk" />
                                <InputField name="projectComplexityScore" section="risk" />
                                <InputField name="changeOrderFrequency" section="risk" />
                                <InputField name="inflationRate" section="risk" />
                                <InputField name="interestRate" section="risk" />
                                <InputField name="contractorExperienceYears" section="risk" />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`
                                    flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2
                                    ${loading
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-0.5'
                                    }
                                `}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>AI is Analyzing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🚀</span>
                                        <span>Run Full Analysis</span>
                                    </>
                                )}
                            </button>
                            {hasResult && (
                                <button
                                    type="button"
                                    onClick={clearResults}
                                    className="px-6 py-4 rounded-xl font-semibold bg-dark-700 text-gray-400 hover:bg-dark-600 hover:text-white transition-all border border-white/10"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Results Panel */}
                <div className="space-y-6">
                    {hasResult ? (
                        <>
                            {/* Sustainability Score with Bar */}
                            <div className="bg-dark-800/50 border border-green-500/20 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <span>🌍</span> Sustainability Score
                                </h3>
                                <div className="text-center">
                                    <p className={`text-5xl font-bold ${getScoreColor(result.sustainabilityScore)}`}>
                                        {result.sustainabilityScore?.toFixed(1)}
                                    </p>
                                    <p className="text-gray-400 mt-2">out of 100</p>
                                    
                                    {/* Score Bar */}
                                    <div className="mt-4 h-3 bg-dark-900 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${
                                                result.sustainabilityScore >= 70 ? 'bg-green-500' :
                                                result.sustainabilityScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${result.sustainabilityScore}%` }}
                                        />
                                    </div>
                                    
                                    <p className={`mt-3 text-sm ${getScoreColor(result.sustainabilityScore)}`}>
                                        {result.sustainabilityInterpretation}
                                    </p>
                                </div>
                            </div>

                            {/* Lifecycle Cost with Bar */}
                            <div className="bg-dark-800/50 border border-blue-500/20 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <span>💰</span> Lifecycle Cost
                                </h3>
                                <div className="text-center">
                                    <p className="text-4xl font-bold text-blue-400">
                                        {result.lifecycleCostMillions?.toFixed(2)}M
                                    </p>
                                    <p className="text-gray-400 mt-1">LKR (Sri Lankan Rupees)</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {formatCurrencyLKR(result.lifecycleCostLkr || 0)}
                                    </p>
                                    
                                    {/* Cost Bar */}
                                    <CostBar cost={result.lifecycleCostLkr} />
                                    
                                    <p className="mt-3 text-sm text-blue-400">
                                        {result.lifecycleInterpretation}
                                    </p>
                                </div>
                            </div>

                            {/* Risk Assessment with Traffic Light */}
                            <div className={`bg-dark-800/50 border rounded-2xl p-6 ${
                                result.riskLevel === 'high' ? 'border-red-500/30' :
                                result.riskLevel === 'medium' ? 'border-yellow-500/30' :
                                'border-green-500/30'
                            }`}>
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <span>⚠️</span> Risk Assessment
                                </h3>
                                
                                {/* Traffic Light */}
                                <div className="flex justify-center mb-4">
                                    <TrafficLight riskLevel={result.riskLevel || 'low'} />
                                </div>
                                
                                <div className="text-center">
                                    <p className="text-gray-400">
                                        Risk Probability: <span className="font-bold text-white">{(result.riskProbability * 100)?.toFixed(1)}%</span>
                                    </p>
                                </div>
                                
                                {result.riskRecommendations?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <p className="text-sm text-gray-400 mb-2">ML Recommendations:</p>
                                        <ul className="space-y-2">
                                            {result.riskRecommendations.map((rec, index) => (
                                                <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                                                    <span className="text-green-400 mt-0.5">•</span>
                                                    {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Smart Suggestions */}
                            {suggestions.length > 0 && (
                                <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <span>💡</span> AI Recommendations
                                    </h3>
                                    <div className="space-y-3">
                                        {suggestions.map((suggestion, index) => (
                                            <div 
                                                key={index}
                                                className={`p-4 rounded-xl border flex items-start gap-3 ${
                                                    suggestion.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                                                    suggestion.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                                    suggestion.type === 'danger' ? 'bg-red-500/10 border-red-500/30' :
                                                    'bg-blue-500/10 border-blue-500/30'
                                                }`}
                                            >
                                                <span className="text-xl">{suggestion.icon}</span>
                                                <div>
                                                    <p className="font-semibold text-white text-sm">{suggestion.title}</p>
                                                    <p className="text-gray-400 text-sm mt-1">{suggestion.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Timestamp */}
                            <div className="text-center text-xs text-gray-500">
                                Analysis completed: {new Date(result.timestamp).toLocaleString()}
                            </div>
                        </>
                    ) : (
                        <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[500px]">
                            <div className="text-6xl mb-4 animate-pulse">📊</div>
                            <h3 className="text-xl font-semibold text-white mb-2">Ready for Analysis</h3>
                            <p className="text-gray-400 text-center max-w-xs">
                                Fill in the project parameters and click{' '}
                                <strong className="text-green-400">Run Full Analysis</strong>{' '}
                                to get AI-powered predictions.
                            </p>
                            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                                <div className="p-3 bg-dark-700/50 rounded-xl">
                                    <div className="text-2xl mb-1">🌱</div>
                                    <div className="text-xs text-gray-500">Sustainability</div>
                                </div>
                                <div className="p-3 bg-dark-700/50 rounded-xl">
                                    <div className="text-2xl mb-1">💰</div>
                                    <div className="text-xs text-gray-500">Cost</div>
                                </div>
                                <div className="p-3 bg-dark-700/50 rounded-xl">
                                    <div className="text-2xl mb-1">⚠️</div>
                                    <div className="text-xs text-gray-500">Risk</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SustainabilityView;
