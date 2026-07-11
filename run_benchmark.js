const fs = require('fs');

let code = fs.readFileSync('public/viewer-shared.mjs', 'utf-8');

// Replace export keyword to allow eval if needed, or we just extract the function logic.
// Actually it's easier to create a standalone test script that mimics the function logic to benchmark the sequential vs parallel execution.
