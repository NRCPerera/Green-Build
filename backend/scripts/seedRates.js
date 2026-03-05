/**
 * Seed Default Rates Script
 *
 * Run this once to populate the rates collection with default values.
 * Usage: node scripts/seedRates.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/database');
const rateEngine = require('../services/rateEngine');

const main = async () => {
    console.log('🌱 Seeding default rates...\n');

    try {
        await connectDB();
        const result = await rateEngine.seedDefaultRates();
        console.log(`\n✅ ${result.message}`);
        console.log(`   Seeded: ${result.seeded}, Skipped: ${result.skipped}`);
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        process.exit(1);
    }

    process.exit(0);
};

main();
