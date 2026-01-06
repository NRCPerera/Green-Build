/**
 * Quantity Surveying Dashboard - JavaScript
 * ==========================================
 * Handles form validation, API calls, smart suggestions, and visualizations
 */

// API Configuration
const API_BASE_URL = window.location.origin;
const ENDPOINTS = {
    health: '/health',
    predict: '/predict/full-analysis'
};

// DOM Elements
const predictionForm = document.getElementById('predictionForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoading = submitBtn.querySelector('.btn-loading');
const resultsPlaceholder = document.getElementById('resultsPlaceholder');
const resultsContent = document.getElementById('resultsContent');
const errorDisplay = document.getElementById('errorDisplay');
const errorMessage = document.getElementById('errorMessage');
const apiStatus = document.getElementById('apiStatus');

// ================================================================
// INITIALIZATION
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
    checkAPIStatus();
    setupRangeInputs();
});

/**
 * Initialize form with event listeners
 */
function initializeForm() {
    predictionForm.addEventListener('submit', handleFormSubmit);
    predictionForm.addEventListener('reset', handleFormReset);
    
    // Add input validation listeners
    const numericInputs = predictionForm.querySelectorAll('input[type="number"]');
    numericInputs.forEach(input => {
        input.addEventListener('input', () => validateInput(input));
        input.addEventListener('blur', () => validateInput(input));
    });
}

/**
 * Setup range input value displays
 */
function setupRangeInputs() {
    const rangeInputs = [
        { id: 'energyEfficiency', display: 'energyEfficiencyValue' },
        { id: 'renewableEnergy', display: 'renewableEnergyValue' },
        { id: 'recycledMaterials', display: 'recycledMaterialsValue' }
    ];
    
    rangeInputs.forEach(({ id, display }) => {
        const input = document.getElementById(id);
        const displayEl = document.getElementById(display);
        
        if (input && displayEl) {
            input.addEventListener('input', () => {
                displayEl.textContent = input.value;
            });
        }
    });
}

/**
 * Check API health status
 */
async function checkAPIStatus() {
    const statusDot = apiStatus.querySelector('.status-dot');
    const statusText = apiStatus.querySelector('.status-text');
    
    try {
        const response = await fetch(`${API_BASE_URL}${ENDPOINTS.health}`);
        const data = await response.json();
        
        if (data.status === 'healthy') {
            statusDot.classList.add('online');
            statusDot.classList.remove('offline');
            statusText.textContent = `API Online (${data.mode})`;
        } else {
            throw new Error('Unhealthy');
        }
    } catch (error) {
        statusDot.classList.add('offline');
        statusDot.classList.remove('online');
        statusText.textContent = 'API Offline';
    }
}

// ================================================================
// FORM VALIDATION
// ================================================================

/**
 * Validate a single input field
 */
function validateInput(input) {
    const value = parseFloat(input.value);
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || Infinity;
    const errorEl = document.getElementById(`${input.id}Error`);
    
    let isValid = true;
    let errorMsg = '';
    
    if (input.required && (isNaN(value) || input.value === '')) {
        isValid = false;
        errorMsg = 'This field is required';
    } else if (value < 0) {
        isValid = false;
        errorMsg = 'Value must be positive';
    } else if (value < min) {
        isValid = false;
        errorMsg = `Minimum value is ${min}`;
    } else if (value > max) {
        isValid = false;
        errorMsg = `Maximum value is ${max}`;
    }
    
    if (errorEl) {
        errorEl.textContent = errorMsg;
    }
    
    input.classList.toggle('error', !isValid);
    return isValid;
}

/**
 * Validate entire form
 */
function validateForm() {
    const numericInputs = predictionForm.querySelectorAll('input[type="number"]');
    let isValid = true;
    
    numericInputs.forEach(input => {
        if (!validateInput(input)) {
            isValid = false;
        }
    });
    
    // Validate selects
    const selects = predictionForm.querySelectorAll('select[required]');
    selects.forEach(select => {
        if (!select.value) {
            isValid = false;
            select.classList.add('error');
        } else {
            select.classList.remove('error');
        }
    });
    
    return isValid;
}

// ================================================================
// FORM SUBMISSION
// ================================================================

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Validate form
    if (!validateForm()) {
        showError('Please fill in all required fields with valid values.');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    hideError();
    
    try {
        // Collect form data
        const formData = collectFormData();
        
        // Send API request
        const result = await sendPredictionRequest(formData);
        
        // Display results
        displayResults(result);
        
    } catch (error) {
        console.error('Prediction error:', error);
        showError(error.message || 'Failed to get predictions. Please try again.');
    } finally {
        setLoadingState(false);
    }
}

/**
 * Handle form reset
 */
function handleFormReset() {
    resultsPlaceholder.style.display = 'flex';
    resultsContent.style.display = 'none';
    errorDisplay.style.display = 'none';
    
    // Reset range values
    document.getElementById('energyEfficiencyValue').textContent = '70';
    document.getElementById('renewableEnergyValue').textContent = '20';
    document.getElementById('recycledMaterialsValue').textContent = '15';
    
    // Clear errors
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

/**
 * Collect form data
 */
function collectFormData() {
    const areaSqft = parseFloat(document.getElementById('areaSqft').value);
    const floors = parseFloat(document.getElementById('floors').value);
    
    return {
        // Building specs
        area_sqft: areaSqft,
        floors: floors,
        construction_type: document.getElementById('constructionType').value,
        material_quality: document.getElementById('materialQuality').value,
        
        // Energy & sustainability
        energy_efficiency: parseFloat(document.getElementById('energyEfficiency').value),
        renewable_energy_pct: parseFloat(document.getElementById('renewableEnergy').value),
        recycled_materials_pct: parseFloat(document.getElementById('recycledMaterials').value),
        
        // These are calculated/mapped values for the model
        energy_kwh_year: areaSqft * 15 * (1 - parseFloat(document.getElementById('energyEfficiency').value) / 100),
        embodied_co2_tons: areaSqft * 0.05 * (1 - parseFloat(document.getElementById('recycledMaterials').value) / 100),
        operational_co2_tons: areaSqft * 0.02 * (1 - parseFloat(document.getElementById('energyEfficiency').value) / 100),
        energy_efficiency_per_sqft: parseFloat(document.getElementById('energyEfficiency').value) / 100,
        cost_per_sqft_for_sustainability: getMaterialCostMultiplier(document.getElementById('materialQuality').value) * 500,
        energy_co2_impact_relative_to_cost: 0.15,
        
        // Cost model inputs
        construction_cost_per_sqft: getMaterialCostMultiplier(document.getElementById('materialQuality').value) * 8000,
        maintenance_cost_per_year: areaSqft * getMaterialCostMultiplier(document.getElementById('materialQuality').value) * 50,
        
        // Risk model inputs
        design_completeness: parseFloat(document.getElementById('designCompleteness').value),
        project_complexity_score: parseFloat(document.getElementById('projectComplexity').value) * 10,
        change_order_frequency: parseFloat(document.getElementById('changeOrderFreq').value),
        inflation_rate: 6.5,
        interest_rate: 12.0,
        contractor_experience_years: parseFloat(document.getElementById('contractorExperience').value)
    };
}

/**
 * Get material cost multiplier based on quality
 */
function getMaterialCostMultiplier(quality) {
    const multipliers = {
        'basic': 1.0,
        'standard': 1.3,
        'premium': 1.7,
        'luxury': 2.5
    };
    return multipliers[quality] || 1.0;
}

/**
 * Send prediction request to API
 */
async function sendPredictionRequest(data) {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.predict}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.status}`);
    }
    
    return await response.json();
}

// ================================================================
// RESULTS DISPLAY
// ================================================================

/**
 * Display prediction results
 */
function displayResults(result) {
    resultsPlaceholder.style.display = 'none';
    errorDisplay.style.display = 'none';
    resultsContent.style.display = 'block';
    
    // Get area for cost per sqft calculation
    const areaSqft = parseFloat(document.getElementById('areaSqft').value);
    
    // Update sustainability score
    const sustainabilityScore = result.sustainability_score || 0;
    document.getElementById('sustainabilityScore').textContent = sustainabilityScore.toFixed(1);
    document.getElementById('sustainabilityBar').style.width = `${sustainabilityScore}%`;
    
    // Update lifecycle cost (multiply by 1,000,000 for real LKR value)
    const lifecycleCostMillions = result.lifecycle_cost_millions_lkr || 0;
    const lifecycleCostLKR = lifecycleCostMillions * 1000000;
    document.getElementById('lifecycleCost').textContent = formatCurrency(lifecycleCostLKR);
    
    // Cost bar visualization
    const maxCost = 100000000; // 100M as reference
    const costPercentage = Math.min((lifecycleCostLKR / maxCost) * 100, 100);
    document.getElementById('costBar').style.width = `${costPercentage}%`;
    
    // Cost per sqft
    const costPerSqft = lifecycleCostLKR / areaSqft;
    document.getElementById('costPerSqft').textContent = `LKR ${formatNumber(costPerSqft)} per sqft`;
    
    // Update risk level with traffic light
    const isHighRisk = result.is_high_risk || false;
    const riskProbability = (result.risk_probability || 0) * 100;
    const riskLevel = result.risk_level || (isHighRisk ? 'high' : 'low');
    
    updateTrafficLight(riskLevel);
    document.getElementById('riskLabel').textContent = riskLevel.toUpperCase();
    document.getElementById('riskLabel').className = `risk-label ${riskLevel}`;
    document.getElementById('riskProbability').textContent = riskProbability.toFixed(1);
    
    // Generate and display smart suggestions
    const suggestions = generateSmartSuggestions(result, areaSqft, costPerSqft);
    displaySuggestions(suggestions);
    
    // Display breakdown
    displayBreakdown(result, areaSqft);
}

/**
 * Update traffic light visualization
 */
function updateTrafficLight(riskLevel) {
    const lights = ['red', 'yellow', 'green'];
    lights.forEach(color => {
        document.getElementById(`${color}Light`).classList.remove('active');
    });
    
    switch (riskLevel.toLowerCase()) {
        case 'high':
            document.getElementById('redLight').classList.add('active');
            break;
        case 'medium':
            document.getElementById('yellowLight').classList.add('active');
            break;
        case 'low':
            document.getElementById('greenLight').classList.add('active');
            break;
    }
}

// ================================================================
// SMART SUGGESTION ENGINE
// ================================================================

/**
 * Generate smart suggestions based on prediction results
 */
function generateSmartSuggestions(result, areaSqft, costPerSqft) {
    const suggestions = [];
    
    const sustainabilityScore = result.sustainability_score || 0;
    const isHighRisk = result.is_high_risk || false;
    const riskLevel = result.risk_level || 'low';
    const riskProbability = result.risk_probability || 0;
    
    // Sustainability suggestions
    if (sustainabilityScore < 40) {
        suggestions.push({
            type: 'danger',
            icon: '🔴',
            title: 'Low Sustainability Score',
            text: 'Consider using recycled materials, increasing energy efficiency, or adding renewable energy sources to improve sustainability.'
        });
    } else if (sustainabilityScore < 60) {
        suggestions.push({
            type: 'warning',
            icon: '🟡',
            title: 'Moderate Sustainability',
            text: 'Your sustainability score can be improved. Consider solar panels, better insulation, or sustainable material alternatives.'
        });
    } else if (sustainabilityScore >= 80) {
        suggestions.push({
            type: 'success',
            icon: '🟢',
            title: 'Excellent Sustainability!',
            text: 'This project demonstrates excellent environmental performance. Consider pursuing LEED or BREEAM certification.'
        });
    }
    
    // Risk suggestions
    if (isHighRisk || riskLevel === 'high') {
        suggestions.push({
            type: 'danger',
            icon: '⚠️',
            title: 'High Risk Detected',
            text: 'Recommend reviewing Contractor Experience, increasing Design Completeness, or reducing Project Complexity to mitigate risks.'
        });
        
        const designCompleteness = parseFloat(document.getElementById('designCompleteness').value);
        if (designCompleteness < 70) {
            suggestions.push({
                type: 'warning',
                icon: '📐',
                title: 'Incomplete Design',
                text: `Design completeness is only ${designCompleteness}%. Aim for at least 85% completion before construction to reduce change orders.`
            });
        }
        
        const contractorExp = parseFloat(document.getElementById('contractorExperience').value);
        if (contractorExp < 5) {
            suggestions.push({
                type: 'warning',
                icon: '👷',
                title: 'Contractor Experience',
                text: 'Consider partnering with a more experienced contractor or provide additional oversight for this project.'
            });
        }
    } else if (riskLevel === 'medium') {
        suggestions.push({
            type: 'warning',
            icon: '⚡',
            title: 'Moderate Risk Level',
            text: 'Some risk factors detected. Monitor change orders and maintain clear communication with all stakeholders.'
        });
    }
    
    // Cost suggestions
    const avgCostPerSqft = 15000; // Average for Sri Lanka
    if (costPerSqft > avgCostPerSqft * 1.5) {
        suggestions.push({
            type: 'info',
            icon: '💰',
            title: 'Above Average Cost',
            text: `Cost per sqft (LKR ${formatNumber(costPerSqft)}) is above average. Check material choices and consider value engineering.`
        });
    } else if (costPerSqft < avgCostPerSqft * 0.7) {
        suggestions.push({
            type: 'warning',
            icon: '💸',
            title: 'Below Average Cost',
            text: 'Cost is significantly below average. Ensure quality is not compromised and budget is realistic.'
        });
    }
    
    // Material quality specific
    const materialQuality = document.getElementById('materialQuality').value;
    if (materialQuality === 'luxury' && sustainabilityScore < 60) {
        suggestions.push({
            type: 'info',
            icon: '✨',
            title: 'Premium Materials Opportunity',
            text: 'With luxury materials, consider premium sustainable options like reclaimed hardwood or recycled glass for better sustainability.'
        });
    }
    
    // Add positive feedback if everything looks good
    if (suggestions.length === 0 || (sustainabilityScore >= 60 && !isHighRisk)) {
        suggestions.push({
            type: 'success',
            icon: '✅',
            title: 'Project Looks Good',
            text: 'Overall parameters are within acceptable ranges. Regular monitoring is recommended during construction.'
        });
    }
    
    return suggestions;
}

/**
 * Display suggestions in the UI
 */
function displaySuggestions(suggestions) {
    const container = document.getElementById('suggestionsList');
    container.innerHTML = '';
    
    suggestions.forEach((suggestion, index) => {
        const item = document.createElement('div');
        item.className = `suggestion-item ${suggestion.type}`;
        item.style.animationDelay = `${index * 0.1}s`;
        
        item.innerHTML = `
            <div class="suggestion-icon">${suggestion.icon}</div>
            <div class="suggestion-text">
                <strong>${suggestion.title}</strong>
                <p>${suggestion.text}</p>
            </div>
        `;
        
        container.appendChild(item);
    });
}

/**
 * Display detailed breakdown
 */
function displayBreakdown(result, areaSqft) {
    const container = document.getElementById('breakdownGrid');
    const lifecycleCostLKR = (result.lifecycle_cost_millions_lkr || 0) * 1000000;
    
    const items = [
        { label: 'Sustainability Score', value: `${(result.sustainability_score || 0).toFixed(1)} / 100` },
        { label: 'Sustainability Rating', value: result.sustainability_interpretation || 'N/A' },
        { label: 'Total Lifecycle Cost', value: `LKR ${formatNumber(lifecycleCostLKR)}` },
        { label: 'Cost per SQFT', value: `LKR ${formatNumber(lifecycleCostLKR / areaSqft)}` },
        { label: 'Risk Level', value: (result.risk_level || 'N/A').toUpperCase() },
        { label: 'Risk Probability', value: `${((result.risk_probability || 0) * 100).toFixed(1)}%` },
        { label: 'High Risk Flag', value: result.is_high_risk ? 'YES' : 'NO' },
        { label: 'Analysis Timestamp', value: new Date().toLocaleTimeString() }
    ];
    
    container.innerHTML = items.map(item => `
        <div class="breakdown-item">
            <span class="breakdown-label">${item.label}</span>
            <span class="breakdown-value">${item.value}</span>
        </div>
    `).join('');
}

// ================================================================
// UI HELPERS
// ================================================================

/**
 * Set loading state
 */
function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    btnText.style.display = isLoading ? 'none' : 'inline-flex';
    btnLoading.style.display = isLoading ? 'inline-flex' : 'none';
}

/**
 * Show error message
 */
function showError(message) {
    resultsPlaceholder.style.display = 'none';
    resultsContent.style.display = 'none';
    errorDisplay.style.display = 'block';
    errorMessage.textContent = message;
}

/**
 * Hide error message
 */
function hideError() {
    errorDisplay.style.display = 'none';
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
        return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(0);
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return Math.round(num).toLocaleString('en-IN');
}
