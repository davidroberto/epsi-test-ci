module.exports = {
    transform: {
        "^.+\\.(ts|tsx)$": "babel-jest"
    },
    testTimeout: 60000,
    testPathIgnorePatterns: ['/node_modules/', '/e2e/']
};
