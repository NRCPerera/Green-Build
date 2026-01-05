import { useState } from 'react';
import useCostController from '../../../controllers/useCostController';

const CostPredictionView = () => {
    const [formValues, setFormValues] = useState({
        Floors: 1,
        Area_SQFT: 1000,
        Year_of_Tender: 2022,
        Rate_per_SQFT: 26000,
        Initial_Contract_Value: 0,
        Initial_period_construction: 14,
        Design_Completeness: 0.55,
        Project_Complexity_Score: 0.1,
        Time_overrun_months: 6,
        Construction_Duration_Actual: 20,
        Inflation_Rate: 0.13,
        Material_Price_Index: 125,
        Exchange_Rate: 390,
        Interest_Rate: 0.16,
        Contractor_Experience_Years: 3,
        Contractor_Previous_Projects: 5,
        Change_Order_Frequency: 0.35,
        Amount_Variations: 4200,
        Amount_S_Change: 21021,
        Amount_PF: 10000,
        Adjusted_Contract_Sum: 580,
        Cost_Overrun_Amount: 320000,
        Type_of_Project: 'Apartment',
        Province: 'Western',
        District: 'Gampaha',
        Season_of_Start: 'Monsoon',
        Grade_of_contractor: 'C1',
    });

    const {
        loading,
        error,
        prediction,
        hasPrediction,
        predictCost,
        clearPrediction,
    } = useCostController();

    const handleSubmit = async (e) => {
        e.preventDefault();
        await predictCost(formValues);
    };

    return (
        <div className="space-y-6">
            {/* Module Header */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                    <span className="text-4xl">💰</span>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Cost Prediction Module</h2>
                        <p className="text-gray-400 mt-1">
                            ML-powered cost overrun prediction with risk analysis.
                        </p>
                    </div>
                </div>
            </div>

            {/* Model Info */}
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                    <p className="text-primary-400">
                        ANN Regression Model • Input: 25 Features • Output: Cost Overrun Prediction
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Input Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-dark-800/50 border border-white/5 rounded-2xl p-6 space-y-4 max-h-[600px] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2 sticky top-0 bg-dark-800/50">
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Inputs</span>
                            Project Parameters
                        </h3>

                        {/* Project Info */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Type of Project</label>
                            <select
                                value={formValues.Type_of_Project}
                                onChange={(e) => setFormValues({ ...formValues, Type_of_Project: e.target.value })}
                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            >
                                <option>Apartment</option>
                                <option>Commercial</option>
                                <option>Industrial</option>
                                <option>Infrastructure</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Grade of Contractor</label>
                            <select
                                value={formValues.Grade_of_contractor}
                                onChange={(e) => setFormValues({ ...formValues, Grade_of_contractor: e.target.value })}
                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            >
                                <option>A1</option>
                                <option>A2</option>
                                <option>B1</option>
                                <option>B2</option>
                                <option>C1</option>
                                <option>C2</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Province</label>
                            <select
                                value={formValues.Province}
                                onChange={(e) => setFormValues({ ...formValues, Province: e.target.value })}
                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            >
                                <option>Western</option>
                                <option>Central</option>
                                <option>Southern</option>
                                <option>Eastern</option>
                                <option>Northern</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Floors</label>
                            <input
                                type="number"
                                value={formValues.Floors}
                                onChange={(e) => setFormValues({ ...formValues, Floors: parseInt(e.target.value) || 1 })}
                                min="1"
                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Area (SQFT)</label>
                            <input
                                type="number"
                                value={formValues.Area_SQFT}
                                onChange={(e) => setFormValues({ ...formValues, Area_SQFT: parseFloat(e.target.value) || 1000 })}
                                min="1"
                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Rate per SQFT</label>
                            <input
                                type="number"
                                value={formValues.Rate_per_SQFT}
                                onChange={(e) => setFormValues({ ...formValues, Rate_per_SQFT: parseFloat(e.target.value) || 26000 })}
                                min="0"
                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Contractor Experience (Years)</label>
                            <input
                                type="number"
                                value={formValues.Contractor_Experience_Years}
                                onChange={(e) => setFormValues({ ...formValues, Contractor_Experience_Years: parseInt(e.target.value) || 3 })}
                                min="0"
                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Initial Duration (months)</label>
                            <input
                                type="number"
                                value={formValues.Initial_period_construction}
                                onChange={(e) => setFormValues({ ...formValues, Initial_period_construction: parseInt(e.target.value) || 14 })}
                                min="1"
                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Inflation Rate</label>
                            <input
                                type="number"
                                value={formValues.Inflation_Rate}
                                onChange={(e) => setFormValues({ ...formValues, Inflation_Rate: parseFloat(e.target.value) || 0.13 })}
                                min="0"
                                step="0.01"
                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
                                <p className="text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${loading
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-400 hover:to-orange-400'
                                }`}
                        >
                            {loading ? 'Predicting...' : 'Predict Cost Overrun'}
                        </button>
                    </form>
                </div>

                {/* Results */}
                <div className="lg:col-span-3">
                    {hasPrediction ? (
                        <div className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className={`bg-dark-800/50 border rounded-xl p-5 text-center ${prediction.high_risk_label ? 'border-red-500/50 bg-red-500/10' : 'border-white/5 bg-green-500/10'}`}>
                                    <p className="text-sm text-gray-400 mb-2">Risk Status</p>
                                    <p className={`text-3xl font-bold ${prediction.high_risk_label ? 'text-red-400' : 'text-green-400'}`}>
                                        {prediction.high_risk_label ? '⚠️ HIGH' : '✓ LOW'}
                                    </p>
                                </div>
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Cost Overrun %</p>
                                    <p className={`text-3xl font-bold ${prediction.predicted_cost_overrun_pct > 10 ? 'text-red-400' : 'text-green-400'}`}>
                                        {prediction.predicted_cost_overrun_pct?.toFixed(2)}%
                                    </p>
                                </div>
                                <div className="bg-dark-800/50 border border-white/5 rounded-xl p-5 text-center">
                                    <p className="text-sm text-gray-400 mb-2">Overrun Probability</p>
                                    <p className="text-3xl font-bold text-white">{(prediction.overrun_probability * 100)?.toFixed(1)}%</p>
                                    <div className="w-full h-2 bg-dark-700 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${prediction.overrun_probability > 0.7 ? 'bg-red-500' : prediction.overrun_probability > 0.4 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                            style={{ width: `${prediction.overrun_probability * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Prediction Details */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">📊 Prediction Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="p-4 bg-dark-700/50 rounded-lg">
                                        <p className="text-gray-400 mb-1">Predicted Overrun</p>
                                        <p className="text-2xl font-bold text-yellow-400">{prediction.predicted_cost_overrun_pct?.toFixed(2)}%</p>
                                    </div>
                                    <div className="p-4 bg-dark-700/50 rounded-lg">
                                        <p className="text-gray-400 mb-1">Risk Probability</p>
                                        <p className="text-2xl font-bold text-orange-400">{(prediction.overrun_probability * 100)?.toFixed(1)}%</p>
                                    </div>
                                    <div className="p-4 bg-dark-700/50 rounded-lg">
                                        <p className="text-gray-400 mb-1">Risk Classification</p>
                                        <p className={`text-lg font-bold ${prediction.high_risk_label ? 'text-red-400' : 'text-green-400'}`}>
                                            {prediction.high_risk_label ? 'HIGH RISK' : 'LOW RISK'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-dark-700/50 rounded-lg">
                                        <p className="text-gray-400 mb-1">Threshold</p>
                                        <p className="text-lg font-bold text-blue-400">{prediction.threshold}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Model Response Info */}
                            <div className="bg-dark-800/50 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">ℹ️ Model Information</h3>
                                <div className="space-y-2 text-sm text-gray-400">
                                    <p><span className="text-gray-300 font-medium">Model Type:</span> ANN Regression + Classification</p>
                                    <p><span className="text-gray-300 font-medium">Input Features:</span> 25 parameters</p>
                                    <p><span className="text-gray-300 font-medium">Prediction Timestamp:</span> {new Date(prediction.timestamp).toLocaleString()}</p>
                                    <p><span className="text-gray-300 font-medium">Status:</span> <span className="text-green-400">✓ Successful</span></p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <button
                                    onClick={clearPrediction}
                                    className="flex-1 px-6 py-3 rounded-xl font-semibold bg-dark-700 border border-white/10 text-gray-300 hover:border-white/20 transition-all"
                                >
                                    Clear Results
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-96 flex flex-col items-center justify-center bg-dark-800/50 border border-white/5 rounded-2xl">
                            <div className="w-20 h-20 mb-6 rounded-full bg-dark-700 flex items-center justify-center">
                                <span className="text-4xl">📈</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">No Prediction Yet</h3>
                            <p className="text-gray-400 text-center max-w-md">
                                Fill in the project parameters and click "Predict Cost Overrun" to analyze potential cost risks.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CostPredictionView;
