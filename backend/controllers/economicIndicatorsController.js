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
                message: 'Query parameter "year" must be an integer between 1950 and 2100.'
            });
        }

        if (!province) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Query parameter "province" is required.'
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
                message: 'FRED_API_KEY is not configured. Set it in backend/.env and restart the backend server.'
            });
        }

        if (error.code === 'MISSING_FRED_SERIES') {
            return res.status(500).json({
                success: false,
                error: 'Series configuration missing',
                message: 'One or more FRED series IDs are missing in backend configuration.'
            });
        }

        if (error.code === 'FRED_API_ERROR') {
            return res.status(502).json({
                success: false,
                error: 'Upstream API error',
                message: error.message,
                statusCode: error.upstreamStatusCode || 502
            });
        }

        if (error.response) {
            return res.status(502).json({
                success: false,
                error: 'Upstream API error',
                message: error.response.data?.error_message || error.response.data?.message || error.message,
                statusCode: error.response.status
            });
        }

        if (error.request) {
            return res.status(503).json({
                success: false,
                error: 'External API unavailable',
                message: 'Unable to reach FRED API. Please try again later.'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Economic indicators fetch failed',
            message: error.message
        });
    }
};

module.exports = {
    getEconomicIndicators
};
