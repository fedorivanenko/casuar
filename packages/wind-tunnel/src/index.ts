import type { GraphSnapshot } from '../../autoresearcher/src/index.js';
import { verify, type RegressionResult } from '../../verifier/src/index.js';

export type WindTunnelRun = {
  incumbent: { graph: GraphSnapshot; regressions: RegressionResult[]; score: number };
  challenger: { graph: GraphSnapshot; regressions: RegressionResult[]; score: number };
  winner: 'incumbent' | 'challenger' | 'tie';
};

function score(results: RegressionResult[]) {
  return results.reduce((n, r) => n + (r.passed ? 1 : 0), 0);
}

export function compareGraphs(incumbent: GraphSnapshot, challenger: GraphSnapshot): WindTunnelRun {
  const incumbentRegressions = verify(incumbent);
  const challengerRegressions = verify(challenger);
  const incumbentScore = score(incumbentRegressions);
  const challengerScore = score(challengerRegressions);
  return {
    incumbent: { graph: incumbent, regressions: incumbentRegressions, score: incumbentScore },
    challenger: { graph: challenger, regressions: challengerRegressions, score: challengerScore },
    winner: challengerScore > incumbentScore ? 'challenger' : challengerScore < incumbentScore ? 'incumbent' : 'tie',
  };
}
