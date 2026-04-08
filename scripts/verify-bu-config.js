'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const constants = require('../scraper/constants.js');

constants.refreshBusinessUnitsFromDisk();
const labels = constants.BUSINESS_UNITS;
const must = ['QUGEN', 'ROHTAK', 'KARNAL'];
const missing = must.filter((x) => !labels.includes(x));

if (missing.length) {
    console.error('[verify:bu] FAIL — missing labels:', missing.join(', '));
    console.error('[verify:bu] Loaded count:', labels.length);
    console.error('[verify:bu] Set NEXUS_CONFIG_DIR to your repo config folder, or ensure config/businessUnits.json exists.');
    process.exit(1);
}

console.log('[verify:bu] OK —', labels.length, 'business units (incl. ROHTAK, KARNAL, QUGEN)');
process.exit(0);
