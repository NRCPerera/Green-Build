const { fetchEconomicIndicators } = require('../services/economicIndicatorsService');

const parseYear = (value) => {
    const year = Number(value);
    return Number.isInteger(year) ? year : null;
};

const getEconomicIndicators = async (req, res) => {
    try {
        const year = parseYear(req.query.year);
        const province = String(req.query.province || '').trim();
        const district = String(req.query.district || '').trim();

        if (!year || year < 1950 || year > 2100) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Invalid year provided.',
                userMessage: 'Please select a valid year to fetch economic indicators.'
            });
        }

        if (!province) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Province is required.',
                userMessage: 'Please choose a province to fetch economic indicators.'
            });
        }

        const indicators = await fetchEconomicIndicators({
            year,
            province,
            district
        });

        return res.json({
            success: true,
            data: indicators,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Economic Indicators] Error:', error.message);

        if (error.code === 'MISSING_FRED_API_KEY') {
            return res.status(503).json({
                success: false,
                error: 'Backend configuration missing',
                message: 'FRED_API_KEY is not configured. Set it in backend/.env and restart the backend server.',
                userMessage: 'Economic indicator service is temporarily unavailable. Please try again shortly.'
            });
        }

        if (error.code === 'MISSING_FRED_SERIES') {
            return res.status(500).json({
                success: false,
                error: 'Series configuration missing',
                message: 'One or more FRED series IDs are missing in backend configuration.',
                userMessage: 'We could not load indicators due to a configuration issue. Please contact support.'
            });
        }

        if (error.code === 'FRED_API_ERROR') {
            return res.status(502).json({
                success: false,
                error: 'Upstream API error',
                message: error.message,
                userMessage: 'Could not retrieve latest indicators from external provider. Please try again.',
                statusCode: error.upstreamStatusCode || 502
            });
        }

        if (error.response) {
            return res.status(502).json({
                success: false,
                error: 'Upstream API error',
                message: error.response.data?.error_message || error.response.data?.message || error.message,
                userMessage: 'Could not retrieve latest indicators from external provider. Please try again.',
                statusCode: error.response.status
            });
        }

        if (error.request) {
            return res.status(503).json({
                success: false,
                error: 'External API unavailable',
                message: 'Unable to reach FRED API. Please try again later.',
                userMessage: 'Economic indicators are temporarily unavailable. Check your connection and try again.'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Economic indicators fetch failed',
            message: error.message,
            userMessage: 'Something went wrong while loading economic indicators. Please try again.'
        });
    }
};

module.exports = {
    getEconomicIndicators
};
