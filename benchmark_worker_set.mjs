import { performance } from 'node:perf_hooks';

// Simulate what worker.mjs does for 1000 files
const numFiles = 1000;
const files = Array.from({ length: numFiles }, (_, i) => ({ name: `file_${i}.mjs`, size: 100, text: async () => 'test' }));

function oldWay() {
  const seen = new Set();
  const uploadPromises = [];
  for (const file of files) {
    const name = file.name || '';
    if (seen.has(name)) throw new Error();
    seen.add(name);
    uploadPromises.push({ name, text: 'test' });
  }
  const uploads = uploadPromises;

  const uploadedNames = new Set(uploads.map((file) => file.name));
  return uploadedNames.size;
}

function newWay() {
  const uploadedNames = new Set();
  const uploadPromises = [];
  for (const file of files) {
    const name = file.name || '';
    if (uploadedNames.has(name)) throw new Error();
    uploadedNames.add(name);
    uploadPromises.push({ name, text: 'test' });
  }
  const uploads = uploadPromises;

  return uploadedNames.size;
}

const ITERATIONS = 10000;

const startOld = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  oldWay();
}
const endOld = performance.now();

const startNew = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  newWay();
}
const endNew = performance.now();

console.log(`Old way: ${(endOld - startOld).toFixed(2)}ms`);
console.log(`New way: ${(endNew - startNew).toFixed(2)}ms`);
