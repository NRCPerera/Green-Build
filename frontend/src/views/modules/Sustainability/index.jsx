/**
 * Sustainability Analysis Dashboard - Pure React
 * Complete UI with Chart, Recommendations, PDF Export
 */

import { useState, useEffect, useRef } from 'react';

const API_URL = 'http://localhost:8003';

const SustainabilityView = () => {
    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState(null);
    const [error, setError] = useState(null);
    const [apiStatus, setApiStatus] = useState('checking');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [showWhatIf, setShowWhatIf] = useState(false);
    const [sensitivityLoading, setSensitivityLoading] = useState(false);
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const shapChartRef = useRef(null);
    const shapChartInstance = useRef(null);

    const [formValues, setFormValues] = useState({
        Area_SQFT: 2000,
        Floors: 2,
        Design_Completeness: 80,
        Contractor_Experience: 10,
        Inflation_Rate: 6.5,
        Interest_Rate: 10.0,
        base_construction_rate: 12000,
        maintenance_overhead: 2.0,
        electricity_unit_cost: 45.0,
        co2_factor: 0.0004
    });

    // Load Chart.js and jsPDF dynamically on mount
    useEffect(() => {
        // Load Chart.js
        if (!window.Chart) {
            const chartScript = document.createElement('script');
            chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
            chartScript.async = true;
            document.head.appendChild(chartScript);
        }

        // Load jsPDF
        if (!window.jspdf) {
            const jspdfScript = document.createElement('script');
            jspdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            jspdfScript.async = true;
            document.head.appendChild(jspdfScript);

            // Load autoTable plugin after jsPDF
            jspdfScript.onload = () => {
                const autoTableScript = document.createElement('script');
                autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
                autoTableScript.async = true;
                document.head.appendChild(autoTableScript);
            };
        }

        checkApiHealth();
    }, []);

    // Initialize chart when prediction changes (with retry for async Chart.js loading)
    useEffect(() => {
        if (prediction && chartRef.current) {
            // Retry mechanism in case Chart.js is still loading
            const tryRenderChart = (retries = 5) => {
                if (window.Chart) {
                    renderChart();
                } else if (retries > 0) {
                    setTimeout(() => tryRenderChart(retries - 1), 300);
                }
            };
            tryRenderChart();
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [prediction]);

    // Render SHAP waterfall chart when prediction changes
    useEffect(() => {
        if (prediction?.shap_analysis && shapChartRef.current) {
            const tryRenderShapChart = (retries = 5) => {
                if (window.Chart) {
                    renderShapWaterfallChart();
                } else if (retries > 0) {
                    setTimeout(() => tryRenderShapChart(retries - 1), 300);
                }
            };
            tryRenderShapChart();
        }
        return () => {
            if (shapChartInstance.current) {
                shapChartInstance.current.destroy();
            }
        };
    }, [prediction]);

    const checkApiHealth = async () => {
        try {
            const res = await fetch(`${API_URL}/health`);
            if (res.ok) {
                setApiStatus('online');
            } else {
                setApiStatus('offline');
            }
        } catch {
            setApiStatus('offline');
        }
    };

    const handleChange = (key) => (e) => {
        const value = e.target.type === 'range' ? parseFloat(e.target.value) :
            e.target.value === '' ? '' : parseFloat(e.target.value);
        setFormValues({ ...formValues, [key]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });

            const result = await response.json();

            if (result.success) {
                setPrediction(result.data);
            } else {
                setError(result.error || 'Prediction failed');
            }
        } catch (err) {
            setError('Failed to connect to ML service. Make sure Flask is running on port 8003.');
        } finally {
            setLoading(false);
        }
    };

    const renderChart = () => {
        if (!window.Chart || !chartRef.current || !prediction) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        // Use the new cost_breakdown from AI (no manual calculations)
        const breakdown = prediction.cost_breakdown;
        if (!breakdown) return;

        const ctx = chartRef.current.getContext('2d');

        // Labels match the AI response exactly
        const labels = breakdown.is_ai_predicted
            ? ['🤖 Initial Construction', '🤖 Lifetime Maintenance', '🤖 Green Investment']
            : ['Initial Construction', 'Lifetime Maintenance', 'Green Investment'];

        chartInstance.current = new window.Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: [
                        breakdown.initial_construction,
                        breakdown.lifetime_maintenance,
                        breakdown.green_investment
                    ],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderColor: [
                        'rgba(59, 130, 246, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(16, 185, 129, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `LKR ${(ctx.raw / 1000000).toFixed(2)}M`
                        }
                    }
                }
            }
        });
    };

    const formatCost = (value) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toFixed(0);
    };

    // Use smart_suggestions from API if available, otherwise fallback to local logic
    const getRecommendations = () => {
        if (!prediction) return [];

        // Prefer API-generated smart suggestions
        if (prediction.smart_suggestions && prediction.smart_suggestions.length > 0) {
            return prediction.smart_suggestions;
        }

        // Fallback to basic local suggestions
        const recs = [];
        const score = prediction.sustainability_score;
        const breakdown = prediction.cost_breakdown;

        if (breakdown && breakdown.lifetime_maintenance > breakdown.initial_construction) {
            recs.push({
                type: 'alert',
                title: 'High Long-term Maintenance',
                text: 'Predicted maintenance cost exceeds initial construction. Consider higher quality materials.'
            });
        }

        if (score < 60) {
            recs.push({
                type: 'warning',
                title: 'Energy Efficiency',
                text: 'Score below 60. Consider adding solar panels or improving insulation.'
            });
        }

        if (prediction.risk_level === 'high') {
            recs.push({
                type: 'alert',
                title: 'High Risk Alert',
                text: 'Consider reducing project complexity or hiring more experienced contractors.'
            });
        }

        if (score >= 80) {
            recs.push({
                type: 'success',
                title: 'Excellent Performance',
                text: 'Project exceeds sustainability benchmarks. LEED certification potential.'
            });
        }

        return recs;
    };

    // ============================================================
    // SHAP Waterfall Chart Renderer
    // ============================================================
    const renderShapWaterfallChart = () => {
        if (!window.Chart || !shapChartRef.current || !prediction?.shap_analysis) return;

        if (shapChartInstance.current) {
            shapChartInstance.current.destroy();
        }

        // Get sustainability SHAP values (primary model to visualize)
        const shapData = prediction.shap_analysis?.sustainability;
        if (!shapData?.available || !shapData?.shap_values) return;

        const entries = Object.entries(shapData.shap_values)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .slice(0, 7);

        const labels = entries.map(([name]) => name);
        const values = entries.map(([, val]) => val);
        const colors = values.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)');
        const borderColors = values.map(v => v >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)');

        const ctx = shapChartRef.current.getContext('2d');
        shapChartInstance.current = new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'SHAP Impact on Score',
                    data: values,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.raw;
                                return `${val >= 0 ? '+' : ''}${val.toFixed(2)} impact`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#9ca3af', font: { size: 10 } },
                        title: {
                            display: true,
                            text: '← Decreases Score    |    Increases Score →',
                            color: '#6b7280',
                            font: { size: 10 }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#d1d5db', font: { size: 11 } }
                    }
                }
            }
        });
    };

    // ============================================================
    // What-If Sensitivity Analysis
    // ============================================================
    const [whatIfValues, setWhatIfValues] = useState(null);

    const runWhatIfAnalysis = async (key, newValue) => {
        if (!whatIfValues && formValues) {
            setWhatIfValues({ ...formValues });
        }
        const updatedValues = { ...(whatIfValues || formValues), [key]: newValue };
        setWhatIfValues(updatedValues);
        setSensitivityLoading(true);

        try {
            const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedValues)
            });
            const result = await response.json();
            if (result.success) {
                setPrediction(result.data);
            }
        } catch (err) {
            console.error('What-if analysis failed:', err);
        } finally {
            setSensitivityLoading(false);
        }
    };

    const exportToPDF = async () => {
        // ================================================================
        // STEP 1: Validate Library Loading
        // ================================================================
        if (!prediction) {
            alert('No prediction data available. Please run analysis first.');
            return;
        }

        // Check if jsPDF library is available
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('PDF library (jsPDF) not loaded. Please refresh the page and try again.');
            console.error('jsPDF not found on window.jspdf');
            return;
        }

        // ================================================================
        // STEP 2: Initialize jsPDF with correct namespace
        // ================================================================
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // Check if autoTable plugin is available
        const hasAutoTable = typeof doc.autoTable === 'function';
        if (!hasAutoTable) {
            console.warn('autoTable plugin not loaded, using basic text layout');
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 12;
        let y = margin;

        // Get data with fallbacks
        const financials = prediction.financials || {};
        const engineering = prediction.engineering || {};
        const totalCost = financials.total_lifecycle_cost || prediction.lifecycle_cost_lkr || 0;
        const now = new Date();
        const dateTimeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
            ' | ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        // ================================================================
        // HEADER
        // ================================================================
        doc.setFillColor(16, 185, 129);
        doc.rect(0, 0, pageWidth, 18, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Project Cost & Sustainability Summary', margin, 11);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(dateTimeStr, pageWidth - margin - 48, 11);

        y = 22;

        // ================================================================
        // SUB-HEADER: Project Inputs
        // ================================================================
        doc.setFillColor(240, 253, 244);
        doc.rect(0, y - 3, pageWidth, 10, 'F');

        doc.setTextColor(16, 100, 80);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const inputsSummary = `Area: ${formValues.Area_SQFT.toLocaleString()} sqft | Floors: ${formValues.Floors} | Design: ${formValues.Design_Completeness}% | Experience: ${formValues.Contractor_Experience}yr`;
        doc.text(inputsSummary, margin, y + 3);

        y = 35;

        // ================================================================
        // SIDE-BY-SIDE TABLES
        // ================================================================
        const colWidth = (pageWidth - margin * 3) / 2;
        const rightX = margin * 2 + colWidth;

        if (hasAutoTable) {
            // LEFT: Financials Table
            doc.setTextColor(59, 130, 246);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('FINANCIALS (AI-Predicted)', margin, y);

            doc.autoTable({
                startY: y + 4,
                head: [['Cost Item', 'Amount']],
                body: [
                    ['Initial Construction', `LKR ${formatCost(financials.initial_cost || 0)}`],
                    ['Lifetime Maintenance', `LKR ${formatCost(financials.maintenance_total_50yr || 0)}`],
                    ['Green Investment', `LKR ${formatCost(financials.green_cost || 0)}`],
                    ['TOTAL LIFECYCLE', `LKR ${formatCost(totalCost)}`]
                ],
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 },
                tableWidth: colWidth,
                margin: { left: margin, right: pageWidth - margin - colWidth }
            });

            const leftTableEndY = doc.lastAutoTable.finalY;

            // RIGHT: Engineering Table
            doc.setTextColor(234, 88, 12);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('ENGINEERING METRICS', rightX, y);

            doc.autoTable({
                startY: y + 4,
                head: [['Metric', 'Value']],
                body: [
                    ['Annual Energy', `${(engineering.energy_kwh_year || 0).toLocaleString()} kWh`],
                    ['Operational CO2', `${(engineering.operational_co2_tons || 0).toFixed(2)} tons/yr`],
                    ['Embodied Carbon', `${(engineering.embodied_co2_tons || 0).toFixed(2)} tons`],
                    ['Efficiency Rating', `${engineering.efficiency_rating || 0}/100`]
                ],
                theme: 'grid',
                headStyles: { fillColor: [234, 88, 12], textColor: 255, fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 },
                tableWidth: colWidth,
                margin: { left: rightX, right: margin }
            });

            y = Math.max(leftTableEndY, doc.lastAutoTable.finalY) + 10;
        } else {
            // Fallback: Basic text layout if autoTable not available
            doc.setTextColor(59, 130, 246);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('FINANCIALS', margin, y);
            y += 6;

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Initial Cost: LKR ${formatCost(financials.initial_cost || 0)}`, margin, y);
            y += 5;
            doc.text(`Maintenance: LKR ${formatCost(financials.maintenance_total_50yr || 0)}`, margin, y);
            y += 5;
            doc.text(`Green Investment: LKR ${formatCost(financials.green_cost || 0)}`, margin, y);
            y += 5;
            doc.setFont('helvetica', 'bold');
            doc.text(`TOTAL: LKR ${formatCost(totalCost)}`, margin, y);
            y += 10;

            doc.setTextColor(234, 88, 12);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('ENGINEERING', margin, y);
            y += 6;

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Energy: ${(engineering.energy_kwh_year || 0).toLocaleString()} kWh/yr`, margin, y);
            y += 5;
            doc.text(`CO2: ${(engineering.total_co2_tons || 0).toFixed(2)} tons`, margin, y);
            y += 5;
            doc.text(`Efficiency: ${engineering.efficiency_rating || 0}/100`, margin, y);
            y += 15;
        }

        // ================================================================
        // PIE CHART (Center)
        // ================================================================
        doc.setTextColor(147, 51, 234);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Cost Breakdown', pageWidth / 2 - 15, y);
        y += 5;

        if (chartRef.current) {
            try {
                const chartImage = chartRef.current.toDataURL('image/png', 1.0);
                const chartSize = 50;
                const chartX = (pageWidth - chartSize) / 2;
                doc.addImage(chartImage, 'PNG', chartX, y, chartSize, chartSize);
                y += chartSize + 5;

                // Legend
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                const legendX = pageWidth / 2 - 45;

                doc.setFillColor(59, 130, 246);
                doc.rect(legendX, y, 3, 3, 'F');
                doc.text('Initial', legendX + 5, y + 2.5);

                doc.setFillColor(245, 158, 11);
                doc.rect(legendX + 28, y, 3, 3, 'F');
                doc.text('Maintenance', legendX + 33, y + 2.5);

                doc.setFillColor(16, 185, 129);
                doc.rect(legendX + 65, y, 3, 3, 'F');
                doc.text('Green', legendX + 70, y + 2.5);

                y += 8;
            } catch (err) {
                console.warn('Chart capture failed:', err);
                doc.setTextColor(150, 150, 150);
                doc.setFontSize(8);
                doc.text('[Chart not available]', pageWidth / 2 - 15, y);
                y += 10;
            }
        }

        // ================================================================
        // RISK STATUS BAR
        // ================================================================
        const riskLevel = prediction.risk_level || 'medium';
        const riskColors = {
            low: [16, 185, 129],
            medium: [245, 158, 11],
            high: [239, 68, 68]
        };
        const riskColor = riskColors[riskLevel] || riskColors.medium;

        doc.setFillColor(...riskColor);
        doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`RISK: ${riskLevel.toUpperCase()}`, margin + 5, y + 8);
        doc.text(`Score: ${prediction.sustainability_score || 0}/100`, pageWidth - margin - 35, y + 8);

        y += 18;

        // ================================================================
        // KEY SUGGESTIONS (Max 3)
        // ================================================================
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Key Insights:', margin, y);
        y += 5;

        const suggestions = (prediction.smart_suggestions || []).slice(0, 3);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        if (suggestions.length > 0) {
            suggestions.forEach((s) => {
                const icon = s.type === 'alert' ? '!' : s.type === 'warning' ? '*' : '-';
                const text = `${icon} ${s.title}: ${s.text}`;
                const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
                doc.text(lines[0], margin, y);
                y += 4;
            });
        } else {
            doc.text('- All parameters within optimal ranges.', margin, y);
        }

        // ================================================================
        // FOOTER
        // ================================================================
        doc.setFillColor(31, 41, 55);
        doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
        doc.setTextColor(156, 163, 175);
        doc.setFontSize(7);
        doc.text('Generated by AI-QS Collaborative Platform', margin, pageHeight - 3);
        doc.text(dateTimeStr, pageWidth - margin - 42, pageHeight - 3);

        // ================================================================
        // SAVE PDF
        // ================================================================
        const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        doc.save(`Project_Summary_${fileTimestamp}.pdf`);
    };

    const getRiskColor = (level) => {
        if (level === 'low') return 'text-green-400';
        if (level === 'medium') return 'text-yellow-400';
        return 'text-red-400';
    };

    const getRiskBg = (level) => {
        if (level === 'low') return 'border-green-500/50 bg-green-500/10';
        if (level === 'medium') return 'border-yellow-500/50 bg-yellow-500/10';
        return 'border-red-500/50 bg-red-500/10';
    };

    const recommendations = getRecommendations();

    return (
        <div className="space-y-6">
            {/* Load Chart.js and jsPDF from CDN */}
            <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" />
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" />

            {/* Header */}
            <div className="bg-gradient-to-r from-green-500/15 via-emerald-500/10 to-transparent border border-green-500/25 rounded-2xl p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xl">
                            🌱
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Sustainability Analysis</h2>
                            <p className="text-gray-300 text-sm">AI-powered lifecycle cost & sustainability prediction</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {prediction && (
                            <button
                                onClick={exportToPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/40 rounded-full text-purple-300 text-sm font-medium hover:bg-purple-500/30 transition-colors"
                            >
                                📄 Download Report
                            </button>
                        )}
                        <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${apiStatus === 'online'
                            ? 'text-green-300 bg-green-500/10 border border-green-500/30'
                            : 'text-red-300 bg-red-500/10 border border-red-500/30'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${apiStatus === 'online' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                            {apiStatus === 'online' ? 'ML Service Online' : 'Offline'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="xl:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-dark-800/60 border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full">Inputs</span>
                            <h3 className="text-lg font-semibold text-white">Project Parameters</h3>
                        </div>

                        {/* Building Specs */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-400">🏢 Building Specifications</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Area (SQFT)</label>
                                    <input
                                        type="number"
                                        value={formValues.Area_SQFT}
                                        onChange={handleChange('Area_SQFT')}
                                        className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Floors</label>
                                    <input
                                        type="number"
                                        value={formValues.Floors}
                                        onChange={handleChange('Floors')}
                                        className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Design & Contractor */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-400">📐 Design & Contractor</h4>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                    Design Completeness: <span className="text-green-400 font-bold">{formValues.Design_Completeness}%</span>
                                </label>
                                <input
                                    type="range"
                                    value={formValues.Design_Completeness}
                                    onChange={handleChange('Design_Completeness')}
                                    min="0"
                                    max="100"
                                    className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Contractor Experience (Years)</label>
                                <input
                                    type="number"
                                    value={formValues.Contractor_Experience}
                                    onChange={handleChange('Contractor_Experience')}
                                    className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                        </div>

                        {/* Economic Settings */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-400">💹 Economic Settings</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Inflation Rate (%)</label>
                                    <input
                                        type="number"
                                        value={formValues.Inflation_Rate}
                                        onChange={handleChange('Inflation_Rate')}
                                        step="0.1"
                                        className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Interest Rate (%)</label>
                                    <input
                                        type="number"
                                        value={formValues.Interest_Rate}
                                        onChange={handleChange('Interest_Rate')}
                                        step="0.1"
                                        className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Advanced Settings Accordion */}
                        <div className="border border-white/10 rounded-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-dark-700/50 hover:bg-dark-700 transition-colors"
                            >
                                <span className="text-sm text-gray-300">⚙️ Advanced Engineering Settings</span>
                                <span className={`text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>▼</span>
                            </button>
                            {showAdvanced && (
                                <div className="p-4 space-y-3 bg-dark-800/50">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Base Rate (LKR/sqft)</label>
                                            <input
                                                type="number"
                                                value={formValues.base_construction_rate}
                                                onChange={handleChange('base_construction_rate')}
                                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Maintenance (%)</label>
                                            <input
                                                type="number"
                                                value={formValues.maintenance_overhead}
                                                onChange={handleChange('maintenance_overhead')}
                                                step="0.1"
                                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Electricity (LKR/kWh)</label>
                                            <input
                                                type="number"
                                                value={formValues.electricity_unit_cost}
                                                onChange={handleChange('electricity_unit_cost')}
                                                step="0.5"
                                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">CO₂ Factor</label>
                                            <input
                                                type="number"
                                                value={formValues.co2_factor}
                                                onChange={handleChange('co2_factor')}
                                                step="0.0001"
                                                className="w-full px-3 py-2 bg-dark-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
                                <p className="text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || apiStatus !== 'online'}
                            className={`w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${loading || apiStatus !== 'online'
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400'
                                }`}
                        >
                            {loading ? '⏳ Analyzing...' : '🚀 Analyze Project'}
                        </button>
                    </form>
                </div>

                {/* Results */}
                <div className="xl:col-span-2 space-y-4">
                    {prediction ? (
                        <>
                            {/* ============================================== */}
                            {/* KEY STATS CARDS (3 Cards) */}
                            {/* ============================================== */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                {/* Total Lifecycle Cost - Primary */}
                                <div className="bg-gradient-to-br from-blue-900/40 to-blue-950/60 border-2 border-blue-500/40 rounded-xl p-5">
                                    <p className="text-sm font-medium text-blue-300 mb-1">💰 TOTAL LIFECYCLE COST</p>
                                    <p className="text-4xl font-extrabold text-white tracking-tight">
                                        LKR {formatCost(prediction.financials?.total_lifecycle_cost || prediction.lifecycle_cost_lkr)}
                                    </p>
                                    <p className="text-xs text-blue-400 mt-2">50-Year Building Lifespan</p>
                                    {prediction.financials?.is_ai_predicted && (
                                        <span className="inline-block mt-2 px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded border border-purple-500/30">
                                            🤖 AI Predicted
                                        </span>
                                    )}
                                </div>

                                {/* Sustainability Score */}
                                <div className="bg-gradient-to-br from-green-900/40 to-green-950/60 border-2 border-green-500/40 rounded-xl p-5">
                                    <p className="text-sm font-medium text-green-300 mb-1">🌱 SUSTAINABILITY SCORE</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-4xl font-extrabold text-white">{prediction.sustainability_score}</p>
                                        <span className="text-lg text-green-400">/100</span>
                                    </div>
                                    <p className={`text-sm font-semibold mt-2 ${prediction.sustainability_rating === 'Excellent' ? 'text-green-400' :
                                        prediction.sustainability_rating === 'Good' ? 'text-emerald-400' :
                                            prediction.sustainability_rating === 'Fair' ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                        {prediction.sustainability_rating} Rating
                                    </p>
                                </div>

                                {/* Risk Level */}
                                <div className={`rounded-xl p-5 border-2 ${prediction.risk_level === 'low'
                                    ? 'bg-gradient-to-br from-emerald-900/40 to-emerald-950/60 border-emerald-500/40'
                                    : prediction.risk_level === 'medium'
                                        ? 'bg-gradient-to-br from-yellow-900/40 to-yellow-950/60 border-yellow-500/40'
                                        : 'bg-gradient-to-br from-red-900/40 to-red-950/60 border-red-500/40'
                                    }`}>
                                    <p className="text-sm font-medium text-slate-300 mb-1">⚠️ RISK LEVEL</p>
                                    <p className={`text-4xl font-extrabold ${getRiskColor(prediction.risk_level)}`}>
                                        {prediction.risk_level.toUpperCase()}
                                    </p>
                                    <p className="text-sm text-slate-400 mt-2">
                                        {(prediction.risk_probability * 100).toFixed(0)}% probability
                                    </p>
                                </div>
                            </div>

                            {/* ============================================== */}
                            {/* MAIN CONTENT: 70% Data / 30% Chart */}
                            {/* ============================================== */}
                            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">

                                {/* LEFT COLUMN (70%) - Data Tables */}
                                <div className="lg:col-span-7 space-y-4">

                                    {/* Side-by-Side Tables */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* Financial Breakdown Table */}
                                        <div className="bg-slate-900/80 border border-slate-700 rounded-xl overflow-hidden">
                                            <div className="bg-blue-600/20 border-b border-blue-500/30 px-4 py-3">
                                                <h3 className="text-sm font-bold text-blue-300">💰 FINANCIAL BREAKDOWN</h3>
                                                <p className="text-xs text-blue-400/70">AI-Predicted Values</p>
                                            </div>
                                            <div className="divide-y divide-slate-700/50">
                                                <div className="flex justify-between px-4 py-3 bg-slate-800/30">
                                                    <span className="text-sm text-slate-300">Initial Construction</span>
                                                    <span className="text-sm font-semibold text-white">LKR {formatCost(prediction.financials?.initial_cost || 0)}</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-3">
                                                    <span className="text-sm text-slate-300">Lifetime Maintenance</span>
                                                    <span className="text-sm font-semibold text-white">LKR {formatCost(prediction.financials?.maintenance_total_50yr || 0)}</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-3 bg-slate-800/30">
                                                    <span className="text-sm text-slate-300">Green Investment</span>
                                                    <span className="text-sm font-semibold text-green-400">LKR {formatCost(prediction.financials?.green_cost || 0)}</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-3 bg-blue-600/10">
                                                    <span className="text-sm font-bold text-blue-300">TOTAL (50yr)</span>
                                                    <span className="text-sm font-bold text-blue-300">LKR {formatCost(prediction.financials?.total_lifecycle_cost || 0)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Engineering Metrics Table */}
                                        <div className="bg-slate-900/80 border border-slate-700 rounded-xl overflow-hidden">
                                            <div className="bg-orange-600/20 border-b border-orange-500/30 px-4 py-3">
                                                <h3 className="text-sm font-bold text-orange-300">⚙️ ENGINEERING METRICS</h3>
                                                <p className="text-xs text-orange-400/70">Formula Calculated</p>
                                            </div>
                                            <div className="divide-y divide-slate-700/50">
                                                <div className="flex justify-between px-4 py-3 bg-slate-800/30">
                                                    <span className="text-sm text-slate-300">Annual Energy</span>
                                                    <span className="text-sm font-semibold text-white">{(prediction.engineering?.energy_kwh_year || 0).toLocaleString()} kWh</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-3">
                                                    <span className="text-sm text-slate-300">Operational CO₂</span>
                                                    <span className="text-sm font-semibold text-white">{(prediction.engineering?.operational_co2_tons || 0).toFixed(2)} tons/yr</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-3 bg-slate-800/30">
                                                    <span className="text-sm text-slate-300">Embodied Carbon</span>
                                                    <span className="text-sm font-semibold text-white">{(prediction.engineering?.embodied_co2_tons || 0).toFixed(2)} tons</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-3">
                                                    <span className="text-sm text-slate-300">Efficiency Rating</span>
                                                    <span className={`text-sm font-bold ${(prediction.engineering?.efficiency_rating || 0) >= 80 ? 'text-green-400' :
                                                        (prediction.engineering?.efficiency_rating || 0) >= 60 ? 'text-yellow-400' : 'text-red-400'
                                                        }`}>{prediction.engineering?.efficiency_rating || 0}/100</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Recommendations Panel */}
                                    <div className="bg-slate-900/80 border border-slate-700 rounded-xl overflow-hidden">
                                        <div className="bg-purple-600/20 border-b border-purple-500/30 px-4 py-3">
                                            <h3 className="text-sm font-bold text-purple-300">🤖 AI-DRIVEN RECOMMENDATIONS</h3>
                                        </div>
                                        <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
                                            {recommendations.length > 0 ? recommendations.map((rec, idx) => (
                                                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${rec.type === 'success' ? 'bg-green-500/10 border border-green-500/20' :
                                                    rec.type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                                                        rec.type === 'alert' ? 'bg-red-500/10 border border-red-500/20' :
                                                            rec.type === 'eco' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                                                                'bg-blue-500/10 border border-blue-500/20'
                                                    }`}>
                                                    <span className="text-lg">
                                                        {rec.type === 'success' ? '✅' : rec.type === 'warning' ? '⚡' : rec.type === 'alert' ? '⚠️' : rec.type === 'eco' ? '🌱' : 'ℹ️'}
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">{rec.title}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{rec.text}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="text-slate-400 text-sm text-center py-4">All parameters are within optimal ranges.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* ============================================== */}
                                    {/* SHAP WATERFALL CHART - Feature Contributions    */}
                                    {/* ============================================== */}
                                    {prediction.shap_analysis && (
                                        <div className="bg-slate-900/80 border border-slate-700 rounded-xl overflow-hidden">
                                            <div className="bg-indigo-600/20 border-b border-indigo-500/30 px-4 py-3 flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-sm font-bold text-indigo-300">🔍 SHAP FEATURE ANALYSIS</h3>
                                                    <p className="text-xs text-indigo-400/70">Why the model made this prediction</p>
                                                </div>
                                                {prediction.shap_analysis?.sustainability?.available && (
                                                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded border border-indigo-500/30">DeepExplainer</span>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                {prediction.shap_analysis?.sustainability?.available ? (
                                                    <div className="relative h-56">
                                                        <canvas ref={shapChartRef}></canvas>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-slate-500">
                                                        <p className="text-sm">SHAP analysis unavailable — model may be running in dev mode</p>
                                                    </div>
                                                )}
                                                {prediction.shap_analysis?.sustainability?.top_drivers?.length > 0 && (
                                                    <div className="mt-3 space-y-1">
                                                        {prediction.shap_analysis.sustainability.top_drivers.slice(0, 3).map((driver, idx) => (
                                                            <div key={idx} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded ${driver.impact >= 0 ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                                                                <span>{driver.impact >= 0 ? '▲' : '▼'}</span>
                                                                <span>{driver.description}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ============================================== */}
                                    {/* CONFIDENCE INTERVALS - MC Dropout Uncertainty   */}
                                    {/* ============================================== */}
                                    {prediction.confidence_intervals && (
                                        <div className="bg-slate-900/80 border border-slate-700 rounded-xl overflow-hidden">
                                            <div className="bg-cyan-600/20 border-b border-cyan-500/30 px-4 py-3">
                                                <h3 className="text-sm font-bold text-cyan-300">📊 PREDICTION CONFIDENCE</h3>
                                                <p className="text-xs text-cyan-400/70">MC Dropout uncertainty quantification (P10 / P50 / P90)</p>
                                            </div>
                                            <div className="p-4 space-y-4">
                                                {/* Sustainability Score CI */}
                                                {prediction.confidence_intervals.sustainability_score && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-medium text-slate-400">Sustainability Score</span>
                                                            <span className="text-xs text-slate-500">±{prediction.confidence_intervals.sustainability_score.std?.toFixed(1)}</span>
                                                        </div>
                                                        <div className="relative h-8 bg-slate-800 rounded-lg overflow-hidden">
                                                            {/* Range bar */}
                                                            <div
                                                                className="absolute h-full bg-gradient-to-r from-green-600/40 to-green-500/40 rounded"
                                                                style={{
                                                                    left: `${Math.max(0, prediction.confidence_intervals.sustainability_score.lower)}%`,
                                                                    width: `${Math.max(1, (prediction.confidence_intervals.sustainability_score.upper || 0) - (prediction.confidence_intervals.sustainability_score.lower || 0))}%`
                                                                }}
                                                            />
                                                            {/* Median marker */}
                                                            <div
                                                                className="absolute w-0.5 h-full bg-green-400"
                                                                style={{ left: `${Math.max(0, Math.min(100, prediction.confidence_intervals.sustainability_score.median || 0))}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between mt-1 text-xs">
                                                            <span className="text-red-400">{prediction.confidence_intervals.sustainability_score.lower?.toFixed(1)}</span>
                                                            <span className="text-green-400 font-bold">{prediction.confidence_intervals.sustainability_score.median?.toFixed(1)}</span>
                                                            <span className="text-green-400">{prediction.confidence_intervals.sustainability_score.upper?.toFixed(1)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Lifecycle Cost CI */}
                                                {prediction.confidence_intervals.lifecycle_cost && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-medium text-slate-400">Lifecycle Cost (Millions LKR)</span>
                                                            <span className="text-xs text-slate-500">±{prediction.confidence_intervals.lifecycle_cost.std_millions?.toFixed(2)}M</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-sm">
                                                            <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 font-mono">
                                                                {prediction.confidence_intervals.lifecycle_cost.lower_millions?.toFixed(1)}M
                                                            </span>
                                                            <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 via-blue-400 to-blue-500/50" />
                                                            <span className="px-3 py-1 rounded bg-blue-500/30 text-blue-200 font-bold font-mono border border-blue-500/40">
                                                                {prediction.confidence_intervals.lifecycle_cost.median_millions?.toFixed(1)}M
                                                            </span>
                                                            <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 via-blue-400 to-blue-500/50" />
                                                            <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 font-mono">
                                                                {prediction.confidence_intervals.lifecycle_cost.upper_millions?.toFixed(1)}M
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Risk CI */}
                                                {prediction.confidence_intervals.risk_probability && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-medium text-slate-400">Risk Probability</span>
                                                            <span className="text-xs text-slate-500">±{prediction.confidence_intervals.risk_probability.std?.toFixed(3)}</span>
                                                        </div>
                                                        <div className="relative h-6 bg-slate-800 rounded-lg overflow-hidden">
                                                            <div
                                                                className="absolute h-full bg-gradient-to-r from-yellow-600/40 to-red-500/40 rounded"
                                                                style={{
                                                                    left: `${(prediction.confidence_intervals.risk_probability.lower || 0) * 100}%`,
                                                                    width: `${Math.max(1, ((prediction.confidence_intervals.risk_probability.upper || 0) - (prediction.confidence_intervals.risk_probability.lower || 0)) * 100)}%`
                                                                }}
                                                            />
                                                            <div
                                                                className="absolute w-0.5 h-full bg-yellow-400"
                                                                style={{ left: `${(prediction.confidence_intervals.risk_probability.median || 0) * 100}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between mt-1 text-xs">
                                                            <span className="text-green-400">{((prediction.confidence_intervals.risk_probability.lower || 0) * 100).toFixed(0)}%</span>
                                                            <span className="text-yellow-400 font-bold">{((prediction.confidence_intervals.risk_probability.median || 0) * 100).toFixed(0)}%</span>
                                                            <span className="text-red-400">{((prediction.confidence_intervals.risk_probability.upper || 0) * 100).toFixed(0)}%</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT COLUMN (30%) - Chart */}
                                <div className="lg:col-span-3">
                                    <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 h-full">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-bold text-purple-300">📊 COST DISTRIBUTION</h3>
                                            {prediction.cost_breakdown?.is_ai_predicted && (
                                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded border border-purple-500/30">AI</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mb-4">50-Year Lifespan Breakdown</p>

                                        {/* Chart Canvas */}
                                        <div className="relative h-48 mb-4">
                                            <canvas ref={chartRef}></canvas>
                                        </div>

                                        {/* Legend */}
                                        {prediction.cost_breakdown && (
                                            <div className="space-y-2 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-3 h-3 rounded bg-blue-500"></span>
                                                        <span className="text-slate-400">Initial Construction</span>
                                                    </div>
                                                    <span className="text-white font-medium">{formatCost(prediction.cost_breakdown.initial_construction)}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-3 h-3 rounded bg-yellow-500"></span>
                                                        <span className="text-slate-400">Maintenance</span>
                                                    </div>
                                                    <span className="text-white font-medium">{formatCost(prediction.cost_breakdown.lifetime_maintenance)}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-3 h-3 rounded bg-green-500"></span>
                                                        <span className="text-slate-400">Green Investment</span>
                                                    </div>
                                                    <span className="text-white font-medium">{formatCost(prediction.cost_breakdown.green_investment)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ============================================== */}
                                    {/* WHAT-IF SENSITIVITY PANEL                      */}
                                    {/* ============================================== */}
                                    <div className="bg-slate-900/80 border border-slate-700 rounded-xl overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowWhatIf(!showWhatIf);
                                                if (!whatIfValues) setWhatIfValues({ ...formValues });
                                            }}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-amber-600/10 border-b border-amber-500/20 hover:bg-amber-600/20 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-amber-400">🎯</span>
                                                <h3 className="text-sm font-bold text-amber-300">WHAT-IF SENSITIVITY ANALYSIS</h3>
                                                {sensitivityLoading && <span className="text-xs text-amber-400 animate-pulse">updating...</span>}
                                            </div>
                                            <span className={`text-amber-400 transition-transform ${showWhatIf ? 'rotate-180' : ''}`}>▼</span>
                                        </button>
                                        {showWhatIf && (
                                            <div className="p-4 space-y-4">
                                                <p className="text-xs text-slate-400">Drag sliders to see how parameter changes affect predictions in real-time.</p>

                                                {/* Area slider */}
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <label className="text-xs text-slate-300">Area (SQFT)</label>
                                                        <span className="text-xs text-amber-400 font-mono">{(whatIfValues || formValues).Area_SQFT}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="500" max="50000" step="500"
                                                        value={(whatIfValues || formValues).Area_SQFT}
                                                        onChange={(e) => runWhatIfAnalysis('Area_SQFT', parseFloat(e.target.value))}
                                                        className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                    <div className="flex justify-between text-xs text-slate-600"><span>500</span><span>50,000</span></div>
                                                </div>

                                                {/* Floors slider */}
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <label className="text-xs text-slate-300">Floors</label>
                                                        <span className="text-xs text-amber-400 font-mono">{(whatIfValues || formValues).Floors}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="1" max="20" step="1"
                                                        value={(whatIfValues || formValues).Floors}
                                                        onChange={(e) => runWhatIfAnalysis('Floors', parseInt(e.target.value))}
                                                        className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                    <div className="flex justify-between text-xs text-slate-600"><span>1</span><span>20</span></div>
                                                </div>

                                                {/* Design Completeness slider */}
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <label className="text-xs text-slate-300">Design Completeness</label>
                                                        <span className="text-xs text-amber-400 font-mono">{(whatIfValues || formValues).Design_Completeness}%</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="10" max="100" step="5"
                                                        value={(whatIfValues || formValues).Design_Completeness}
                                                        onChange={(e) => runWhatIfAnalysis('Design_Completeness', parseFloat(e.target.value))}
                                                        className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                    <div className="flex justify-between text-xs text-slate-600"><span>10%</span><span>100%</span></div>
                                                </div>

                                                {/* Contractor Experience slider */}
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <label className="text-xs text-slate-300">Contractor Experience (yrs)</label>
                                                        <span className="text-xs text-amber-400 font-mono">{(whatIfValues || formValues).Contractor_Experience}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="1" max="30" step="1"
                                                        value={(whatIfValues || formValues).Contractor_Experience}
                                                        onChange={(e) => runWhatIfAnalysis('Contractor_Experience', parseFloat(e.target.value))}
                                                        className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                    <div className="flex justify-between text-xs text-slate-600"><span>1 yr</span><span>30 yrs</span></div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setWhatIfValues({ ...formValues });
                                                        handleSubmit({ preventDefault: () => { } });
                                                    }}
                                                    className="w-full text-xs py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors"
                                                >
                                                    ↺ Reset to Original Values
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Button */}
                            <button
                                onClick={() => setPrediction(null)}
                                className="w-full mt-4 px-6 py-3 rounded-xl font-semibold bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 transition-all"
                            >
                                🔄 Run New Analysis
                            </button>
                        </>
                    ) : (
                        <div className="h-full min-h-[400px] bg-dark-800/50 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-10">
                            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-3xl">🌱</div>
                            <p className="text-white text-lg font-semibold mt-4">Run Sustainability Analysis</p>
                            <p className="text-gray-400 text-sm mt-2 max-w-md">
                                Enter project parameters and click <strong className="text-green-400">Analyze Project</strong> to get AI-powered predictions for lifecycle cost, sustainability score, and risk assessment.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SustainabilityView;