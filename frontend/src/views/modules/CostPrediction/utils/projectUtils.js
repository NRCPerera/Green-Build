export const getProjectType = (type) => {
    if (!type) return '';
    const typeMap = {
        'residential': 'Residential-House',
        'apartment': 'Residential-Apartment',
        'commercial': 'Commercial-Building',
        'industrial': 'Industrial-Building',
        'infrastructure': 'Infrastructure',
        'institutional': 'Commercial-Building',
        'mixed-use': 'Mixed-Development',
        'other': 'Residential-House'
    };
    return typeMap[type.toLowerCase()] || 'Residential-House';
};

export const getProvince = (location) => {
    if (typeof location === 'object' && location.province) return location.province;
    return '';
};

export const getDistrict = (location) => {
    if (typeof location === 'object' && location.district) return location.district;
    return '';
};

export const getSeason = (month) => {
    if (month >= 5 && month <= 9) return 'Southwest-Monsoon';
    if (month >= 10 || month <= 1) return 'Northeast-Monsoon';
    if (month >= 2 && month <= 4) return 'Inter-Monsoon';
    return 'Dry-Season';
};

export const getBudget = (project) => {
    return typeof project.budget === 'number' ? project.budget : (project.budget?.estimated || 0);
};

export const getAreaSqft = (project) => {
    return project.areaSQFT || project.area || project.Area_SQFT || 0;
};

export const getFloors = (project) => {
    return project.floors || project.Floors || 0;
};

export const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

export const deriveTimelineFromStartDate = (startDate) => {
    if (!startDate) return {};
    const date = new Date(startDate);
    if (isNaN(date.getTime())) return {};

    const month = date.getMonth() + 1;
    return {
        Start_Month: month,
        Start_Quarter: Math.ceil(month / 3),
        Start_Weekday: date.getDay(),
        Year_of_Tender: date.getFullYear(),
        Season: getSeason(month),
        formattedDate: date.toISOString().split('T')[0]
    };
};

export const formatCurrency = (amount, decimals = 2) => {
    if (amount == null || isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(amount);
};

export const getImpactColor = (impactLevel) => {
    if (impactLevel === 'High') return 'text-red-300 border-red-500/40 bg-red-500/15';
    if (impactLevel === 'Medium') return 'text-yellow-300 border-yellow-500/40 bg-yellow-500/15';
    return 'text-green-300 border-green-500/40 bg-green-500/15';
};

export const getOptimalValue = (featureName, currentValue, OPTIMAL_VALUES) => {
    const optimal = OPTIMAL_VALUES[featureName];
    if (!optimal) return null;
    return {
        target: optimal.target,
        description: optimal.description,
        direction: optimal.direction(currentValue),
        riskReduction: optimal.riskReduction
    };
};
