import { runSimulation } from './server/simulate-engine.mjs';

const params = {
  numAgents: 100,
  shiftStart: 0,
  shiftLength: 60 * 8,
  breakDur: 15,
  numBreaks: 2,
  expectedCalls: 10000,
  aht: 3,
  serviceTarget: 1,
  abandonTime: 5,
};

const start = performance.now();
for (let i = 0; i < 10; i++) {
  runSimulation(params);
}
const end = performance.now();
console.log(`Simulation took ${end - start} ms`);
