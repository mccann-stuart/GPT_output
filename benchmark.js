import { runSimulation } from './server/simulate-engine.mjs';

const baseParams = {
  numAgents: 100,
  shiftStart: 8 * 60,
  shiftLength: 8 * 60,
  breakDur: 15,
  numBreaks: 2,
  expectedCalls: 10000,
  aht: 4,
  serviceTarget: 20,
  abandonTime: 180,
};

function createSequenceRandom(sequence) {
  let index = 0;
  return () => {
    const value = sequence[index % sequence.length];
    index += 1;
    return value;
  };
}

const sequence = [0.11, 0.62, 0.27, 0.84, 0.45, 0.19, 0.73, 0.31];
const random = createSequenceRandom(sequence);

const start = performance.now();
for (let i = 0; i < 50; i++) {
  runSimulation(baseParams, { random });
}
const end = performance.now();

console.log(`Benchmark took ${end - start} ms`);
