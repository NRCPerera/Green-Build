import { FORM_DEFAULTS, provinceDistrictMap, OPTIMAL_VALUES } from '../constants';
import { getProjectType, getProvince, getDistrict, getBudget, getAreaSqft, getFloors, deriveTimelineFromStartDate, getOptimalValue } from './projectUtils';

export const getInitialFormValues = (project) => {
    if (!project) return { ...FORM_DEFAULTS };

    const budget = getBudget(project);
    const areaSqft = getAreaSqft(project);
    const floors = getFloors(project);

    return {
        ...FORM_DEFAULTS,
        Project_Type: getProjectType(project.projectType),
        Province: getProvince(project.location),
        District: getDistrict(project.location),
        Area_SQFT: areaSqft,
        Floors: floors,
        Initial_Value: budget
    };
};

export const getInitialDistricts = (project) => {
    const initialProvince = project?.location?.province || '';
    return initialProvince ? (provinceDistrictMap[initialProvince] || []) : [];
};

export const parseIntOrEmpty = (val) => {
    const n = parseInt(val, 10);
    return Number.isNaN(n) ? '' : n;
};

export const parseFloatOrEmpty = (val) => {
    const n = parseFloat(val);
    return Number.isNaN(n) ? '' : n;
};

export const parseFloatTwoDecimals = (val) => {
    const n = parseFloat(val);
    return Number.isNaN(n) ? '' : Math.round(n * 100) / 100;
};

export const validateForm = (formValues, startDate, currentYear) => {
    const errors = [];
    const addRangeError = (value, label, min, max, options = {}) => {
        const { integer = false } = options;
        const parsed = Number(value);

        if (!Number.isFinite(parsed)) {
            errors.push(`${label} is required`);
            return;
        }

        if (integer && !Number.isInteger(parsed)) {
            errors.push(`${label} must be a whole number`);
            return;
        }

        if (parsed < min || parsed > max) {
            errors.push(`${label} must be between ${min.toLocaleString()} and ${max.toLocaleString()}`);
        }
    };

    if (!formValues.Project_Type) errors.push('Please select a Project Type');
    if (!formValues.Province) errors.push('Please select a Province');
    if (!formValues.District) errors.push('Please select a District');
    if (!formValues.CIDA_Grade) errors.push('Please select a CIDA Grade');
    if (!formValues.Season) errors.push('Please select a Season');
    if (!startDate) errors.push('Please select a Project Start Date');

    const val = formValues;
    addRangeError(val.Floors, 'Floors', 1, 60, { integer: true });
    addRangeError(val.Area_SQFT, 'Area (SQFT)', 500, 200000);
    addRangeError(val.Rate_per_SQFT, 'Rate per SQFT (LKR)', 2000, 100000);
    addRangeError(val.Initial_Value, 'Initial Value (LKR)', 1, 20000000000);
    addRangeError(val.Year_of_Tender, 'Year of Tender', 2015, currentYear, { integer: true });
    addRangeError(val.Initial_Period_Months, 'Initial Duration (months)', 1, 100);
    addRangeError(val.Contractor_Experience_Years, 'Contractor Experience (Years)', 0, 50, { integer: true });
    addRangeError(val.Change_Order_Freq, 'Change Order Frequency', 0, 50, { integer: true });
    addRangeError(val.Complexity_Score, 'Project Complexity Score', 1, 10, { integer: true });

    addRangeError(val.Start_Month, 'Start Month', 1, 12, { integer: true });
    addRangeError(val.Start_Quarter, 'Start Quarter', 1, 4, { integer: true });
    addRangeError(val.Start_Weekday, 'Start Weekday', 0, 6, { integer: true });

    addRangeError(val.Inflation_Rate, 'Inflation Rate (%)', -10, 50);
    addRangeError(val.Material_Index, 'Material Price Index', 50, 500);
    addRangeError(val.Exchange_Rate_LKR, 'Exchange Rate (LKR/USD)', 100, 500);
    addRangeError(val.Project_Size_Index, 'Project Size Index', 0, 10);
    addRangeError(val.Economic_Risk_Index, 'Economic Risk Index', 0, 10);

    addRangeError(val.Design_Completeness, 'Design Completeness (%)', 0, 100);
    addRangeError(val.Design_Risk_Score, 'Design Risk Score', 1, 10, { integer: true });
    addRangeError(val.Contractor_Risk_Score, 'Contractor Risk Score', 1, 10, { integer: true });
    addRangeError(val.Weather_Risk_Score, 'Weather Risk Score', 1, 10, { integer: true });

    return errors;
};

export { getOptimalValue, OPTIMAL_VALUES };
