/**
 * Seed Contractor Profiles
 * 
 * Populates the ContractorProfile collection with historical data
 * from 5,000 Sri Lanka construction projects (2015-2023)
 * 
 * Usage: npm run seed:contractors
 */

const mongoose = require('mongoose');
require('dotenv').config();

const ContractorProfile = require('../models/ContractorProfile');

const seedData = [
    {
        cida_grade: 'C1',
        avg_overrun_pct: 10.35,
        high_risk_rate: 0.29,
        avg_change_order_freq: 7.03,
        avg_time_overrun_months: 5.75,
        projects_count: 997
    },
    {
        cida_grade: 'C2',
        avg_overrun_pct: 10.65,
        high_risk_rate: 0.28,
        avg_change_order_freq: 6.88,
        avg_time_overrun_months: 5.65,
        projects_count: 994
    },
    {
        cida_grade: 'C3',
        avg_overrun_pct: 11.53,
        high_risk_rate: 0.35,
        avg_change_order_freq: 7.09,
        avg_time_overrun_months: 5.83,
        projects_count: 958
    },
    {
        cida_grade: 'C4',
        avg_overrun_pct: 15.08,
        high_risk_rate: 0.67,
        avg_change_order_freq: 8.04,
        avg_time_overrun_months: 6.52,
        projects_count: 1059
    },
    {
        cida_grade: 'C5',
        avg_overrun_pct: 18.55,
        high_risk_rate: 0.89,
        avg_change_order_freq: 9.19,
        avg_time_overrun_months: 7.37,
        projects_count: 992
    }
];

async function seed() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/green-build';
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('[Seed] Connected to MongoDB');

        // Delete existing contractor profiles
        await ContractorProfile.deleteMany({});
        console.log('[Seed] Cleared existing contractor profiles');

        // Insert new data
        const result = await ContractorProfile.insertMany(seedData);
        console.log(`[Seed] Inserted ${result.length} contractor profiles`);

        // Verify insertion
        const count = await ContractorProfile.countDocuments();
        console.log(`[Seed] Total contractor profiles in DB: ${count}`);

        console.log('Contractor profiles seeded successfully!');
        process.exit(0);

    } catch (error) {
        console.error('[Seed] Error:', error.message);
        process.exit(1);
    }
}

seed();
