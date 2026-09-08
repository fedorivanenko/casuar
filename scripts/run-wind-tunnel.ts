import fs from 'node:fs/promises';
import path from 'node:path';
import { compileResearchTask, type GraphSnapshot } from '../packages/autoresearcher/src/index.js';
import { compareGraphs } from '../packages/wind-tunnel/src/index.js';

const name = process.argv[2];
if (!name) throw new Error('Usage: tsx scripts/run-wind-tunnel.ts <experiment-name>');

const file = path.resolve('experiments', `${name}.json`);
const experiment = JSON.parse(await fs.readFile(file, 'utf8')) as {
  seedGraph?: GraphSnapshot;
  requiredObjectives?: string[];
};

if (name === 'hpylori-glutamine') {
  if (!experiment.seedGraph) throw new Error('seedGraph missing');
  const task = compileResearchTask(experiment.seedGraph);
  console.log(JSON.stringify({ experiment: name, frontier: task.frontier }, null, 2));
} else if (name === 'hpylori-bridge-objective') {
  const incumbent: GraphSnapshot = { nodes: [], edges: [], objectives: ['eradication'] };
  const challenger: GraphSnapshot = { nodes: [], edges: [], objectives: experiment.requiredObjectives ?? [] };
  console.log(JSON.stringify(compareGraphs(incumbent, challenger), null, 2));
} else {
  throw new Error(`Unknown experiment: ${name}`);
}
