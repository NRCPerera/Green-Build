const axios = require('axios');
const config = require('../config');
const {
    provinceMultipliers,
    districtMultipliers,
    defaultMultiplier
} = require('../config/economicMultipliers');

const normalizeLocationKey = (value = '') => String(value).trim().toLowerCase();

const toNumberOrNull = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const roundTo = (value, decimals = 2) => {
    if (!Number.isFinite(value)) {
        return null;
    }
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};

const getCombinedMultiplier = (province, district) => {
    const provinceKey = normalizeLocationKey(province);
    const districtKey = normalizeLocationKey(district);

    const provinceMultiplier = provinceMultipliers[provinceKey] ?? defaultMultiplier;
    const districtMultiplier = districtMultipliers[districtKey] ?? defaultMultiplier;

    return {
        provinceMultiplier,
        districtMultiplier,
        totalMultiplier: provinceMultiplier * districtMultiplier
    };
};

const fetchSeriesValueForYear = async ({ seriesId, year }) => {
    if (!seriesId) {
        const err = new Error('Missing FRED series id configuration');
        err.code = 'MISSING_FRED_SERIES';
        throw err;
    }

    const response = await axios.get(`${config.fredBaseUrl}/series/observations`, {
        timeout: config.economicIndicators.requestTimeoutMs,
        params: {
            api_key: config.fredApiKey,
            file_type: 'json',
            series_id: seriesId,
            observation_start: `${Math.max(1950, year - 20)}-01-01`,
            observation_end: `${year}-12-31`,
            sort_order: 'desc',
            limit: 240
        }
    });

    if (response?.data?.error_code) {
        const err = new Error(response.data.error_message || 'FRED returned an error.');
        err.code = 'FRED_API_ERROR';
        err.upstreamStatusCode = response.data.error_code;
        throw err;
    }

    const observations = Array.isArray(response.data?.observations)
        ? response.data.observations
        : [];

    for (const observation of observations) {
        const value = observation?.value;
        if (value == null || value === '.' || value === '') {
            continue;
        }

        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            continue;
        }

        const observationYear = Number(String(observation.date || '').slice(0, 4));
        if (!Number.isFinite(observationYear) || observationYear > year) {
            continue;
        }

        return {
            value: parsed,
            date: observation.date,
            isEstimated: observationYear !== year
        };
    }

    return {
        value: null,
        date: null,
        isEstimated: false
    };
};

const applyMultiplier = (baseValue, multiplier, decimals = 2) => {
    const numeric = toNumberOrNull(baseValue);
    if (numeric === null) {
        return null;
    }

    return roundTo(numeric * multiplier, decimals);
};

const fetchEconomicIndicators = async ({ year, province, district }) => {
    if (!config.fredApiKey) {
        const err = new Error('FRED_API_KEY is not configured on the backend');
        err.code = 'MISSING_FRED_API_KEY';
        throw err;
    }

    const inflationSeriesId = config.economicIndicators.series.inflation;
    const exchangeSeriesId = config.economicIndicators.series.exchangeRateLkr;
    const materialSeriesId = config.economicIndicators.series.materialIndex;

    const [inflationRaw, exchangeRaw, materialRaw] = await Promise.all([
        fetchSeriesValueForYear({ seriesId: inflationSeriesId, year }),
        fetchSeriesValueForYear({ seriesId: exchangeSeriesId, year }),
        fetchSeriesValueForYear({ seriesId: materialSeriesId, year })
    ]);

    const multipliers = getCombinedMultiplier(province, district);
    const multiplier = multipliers.totalMultiplier;

    return {
        Inflation_Rate: applyMultiplier(inflationRaw.value, multiplier, 2),
        Exchange_Rate_LKR: applyMultiplier(exchangeRaw.value, multiplier, 4),
        Material_Index: applyMultiplier(materialRaw.value, multiplier, 2),
        meta: {
            source: 'FRED',
            year,
            appliedMultiplier: {
                province: multipliers.provinceMultiplier,
                district: multipliers.districtMultiplier,
                total: roundTo(multiplier, 6)
            },
            series: {
                inflation: {
                    id: inflationSeriesId,
                    date: inflationRaw.date,
                    isEstimated: inflationRaw.isEstimated
                },
                exchangeRateLkr: {
                    id: exchangeSeriesId,
                    date: exchangeRaw.date,
                    isEstimated: exchangeRaw.isEstimated
                },
                materialIndex: {
                    id: materialSeriesId,
                    date: materialRaw.date,
                    isEstimated: materialRaw.isEstimated
                }
            }
        }
    };
};

module.exports = {
    fetchEconomicIndicators
};
