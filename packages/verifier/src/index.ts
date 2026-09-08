import type { GraphSnapshot, FrontierQuestion } from '../../autoresearcher/src/index.js';

export type RegressionResult = { name: string; passed: boolean; details: Record<string, unknown> };

export function causalFrontierCoverage(frontier: FrontierQuestion[], answeredKeys: string[]) {
  const answered = new Set(answeredKeys);
  const material = frontier.length;
  const covered = frontier.filter(q => answered.has(q.key)).length;
  return { covered, material, ratio: material === 0 ? 1 : covered / material };
}

export function glutamineCoverageTrap(graph: GraphSnapshot): RegressionResult {
  const text = JSON.stringify(graph).toLowerCase();
  const hasGlutamine = text.includes('glutamine');
  const hasPath = hasGlutamine && (text.includes('ggt') || text.includes('glutaminase')) && (text.includes('epithelial') || text.includes('mucosal'));
  return { name: 'hpylori-glutamine-coverage', passed: hasPath, details: { hasGlutamine, hasMechanisticContext: hasPath } };
}

export function bridgeObjectiveTrap(graph: GraphSnapshot): RegressionResult {
  const required = ['pathogen_pressure','mucosal_injury','progression_risk','systemic_consequences','adverse_effects','diagnostic_information'];
  const objectives = new Set((graph.objectives ?? []).map(x => x.toLowerCase()));
  const found = required.filter(x => objectives.has(x));
  const eradicationOnly = objectives.size === 1 && (objectives.has('eradication') || objectives.has('true_eradication'));
  return {
    name: 'hpylori-bridge-objective',
    passed: found.length === required.length && !eradicationOnly,
    details: { required, found, eradicationOnly },
  };
}

export function verify(graph: GraphSnapshot): RegressionResult[] {
  return [glutamineCoverageTrap(graph), bridgeObjectiveTrap(graph)];
}
