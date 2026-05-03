export const INDICATOR_KEYS = ['Inflation_Rate', 'Exchange_Rate_LKR', 'Material_Index'];

export const CONTRACTOR_PROFILES = {
    C1: { avg_overrun_pct: 10.35, high_risk_rate: 29, avg_change_order_freq: 7.03 },
    C2: { avg_overrun_pct: 10.65, high_risk_rate: 28, avg_change_order_freq: 6.88 },
    C3: { avg_overrun_pct: 11.53, high_risk_rate: 35, avg_change_order_freq: 7.09 },
    C4: { avg_overrun_pct: 15.08, high_risk_rate: 67, avg_change_order_freq: 8.04 },
    C5: { avg_overrun_pct: 18.55, high_risk_rate: 89, avg_change_order_freq: 9.19 },
};

export const CIDA_GRADES = [
    { value: 'C1', label: 'C1 - Unlimited Value' },
    { value: 'C2', label: 'C2 - Up to 500M' },
    { value: 'C3', label: 'C3 - Up to 200M' },
    { value: 'C4', label: 'C4 - Up to 75M' },
    { value: 'C5', label: 'C5 - Up to 25M' },
    { value: 'C6', label: 'C6 - Up to 10M' },
    { value: 'C7', label: 'C7 - Up to 3M' },
];

export const PROJECT_TYPES = [
    { value: 'Residential-House', label: 'Residential - House' },
    { value: 'Residential-Apartment', label: 'Residential - Apartment' },
    { value: 'Commercial-Building', label: 'Commercial Building' },
    { value: 'Industrial-Building', label: 'Industrial Building' },
    { value: 'Infrastructure', label: 'Infrastructure' },
    { value: 'Mixed-Development', label: 'Mixed Development' },
];

export const SEASONS = [
    { value: 'Dry-Season', label: 'Dry Season' },
    { value: 'Southwest-Monsoon', label: 'Southwest Monsoon (May-Sep)' },
    { value: 'Northeast-Monsoon', label: 'Northeast Monsoon (Oct-Jan)' },
    { value: 'Inter-Monsoon', label: 'Inter-Monsoon (Feb-Apr)' },
];

export const provinceDistrictMap = {
    'Western': ['Colombo', 'Gampaha', 'Kalutara'],
    'Central': ['Kandy', 'Matale', 'Nuwara Eliya'],
    'Southern': ['Galle', 'Matara', 'Hambantota'],
    'Eastern': ['Trincomalee', 'Batticaloa', 'Ampara'],
    'Northern': ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'],
    'North Western': ['Kurunegala', 'Puttalam'],
    'North Central': ['Anuradhapura', 'Polonnaruwa'],
    'Uva': ['Badulla', 'Monaragala'],
    'Sabaragamuwa': ['Ratnapura', 'Kegalle']
};

export const FORM_DEFAULTS = {
    Project_Type: '',
    Province: '',
    District: '',
    CIDA_Grade: '',
    Season: '',
    Floors: 0,
    Area_SQFT: 0,
    Year_of_Tender: 0,
    Contractor_Experience_Years: 0,
    Complexity_Score: 1,
    Change_Order_Freq: 0,
    Start_Month: 0,
    Start_Quarter: 0,
    Start_Weekday: 0,
    Initial_Period_Months: 0,
    Inflation_Rate: 0,
    Exchange_Rate_LKR: 0,
    Material_Index: 0,
    Design_Completeness: 0,
    Project_Size_Index: 0,
    Economic_Risk_Index: 0,
    Design_Risk_Score: 1,
    Contractor_Risk_Score: 1,
    Weather_Risk_Score: 1,
    Rate_per_SQFT: 0,
    Initial_Value: 0
};

export const OPTIMAL_VALUES = {
    'Design_Completeness': {
        target: '85-95%',
        description: 'Higher design completion reduces change orders and rework',
        direction: currentValue => currentValue < 85 ? 'increase' : 'optimal',
        riskReduction: 10
    },
    'Contractor_Experience_Years': {
        target: '10+ years',
        description: 'More experienced contractors handle challenges better',
        direction: currentValue => currentValue < 10 ? 'increase' : 'optimal',
        riskReduction: 12
    },
    'Change_Order_Freq': {
        target: '0-3',
        description: 'Minimize scope changes to prevent cost escalation',
        direction: currentValue => currentValue > 3 ? 'decrease' : 'optimal',
        riskReduction: 15
    },
    'Complexity_Score': {
        target: '1-5',
        description: 'Simpler designs are easier to estimate and execute',
        direction: currentValue => currentValue > 5 ? 'decrease' : 'optimal',
        riskReduction: 8
    },
    'Economic_Risk_Index': {
        target: '0-3',
        description: 'Use fixed-price contracts and early material procurement',
        direction: currentValue => currentValue > 3 ? 'decrease' : 'optimal',
        riskReduction: 7
    },
    'Material_Index': {
        target: '< 150',
        description: 'Lock in material prices early to avoid escalation',
        direction: currentValue => currentValue > 150 ? 'decrease' : 'optimal',
        riskReduction: 6
    },
    'Initial_Period_Months': {
        target: '12-18 months',
        description: 'Realistic timelines prevent rushed work and errors',
        direction: currentValue => (currentValue < 12 || currentValue > 18) ? 'adjust' : 'optimal',
        riskReduction: 9
    },
    'Weather_Risk_Score': {
        target: '0-3',
        description: 'Plan construction around favorable weather seasons',
        direction: currentValue => currentValue > 3 ? 'decrease' : 'optimal',
        riskReduction: 5
    },
    'Project_Size_Index': {
        target: '0-5',
        description: 'Break large projects into manageable phases',
        direction: currentValue => currentValue > 5 ? 'decrease' : 'optimal',
        riskReduction: 7
    }
};

export const MC_VARIABLES = {
    'Inflation_Rate': 'Inflation Rate (%)',
    'Exchange_Rate_LKR': 'Exchange Rate (LKR)',
    'Material_Index': 'Material Price Index',
    'Complexity_Score': 'Project Complexity'
};
