const provinceMultipliers = {
    western: 1.08,
    central: 1.04,
    southern: 1.02,
    eastern: 0.99,
    northern: 0.97,
    'north western': 1.0,
    'north central': 0.98,
    uva: 0.96,
    sabaragamuwa: 0.99
};

const districtMultipliers = {
    colombo: 1.05,
    gampaha: 1.02,
    kalutara: 1.01,
    kandy: 1.02,
    galle: 1.01,
    jaffna: 0.98,
    trincomalee: 0.99
};

const defaultMultiplier = 1.0;

module.exports = {
    provinceMultipliers,
    districtMultipliers,
    defaultMultiplier
};
