export type CausalNode = { id: string; label?: string; material?: boolean };
export type CausalEdge = { from: string; to: string; relation?: string; material?: boolean };
export type GraphSnapshot = { nodes: CausalNode[]; edges: CausalEdge[]; objectives?: string[] };

export type FrontierQuestion = {
  key: string;
  anchor: string;
  kind: 'upstream'|'requirement'|'substrate'|'regulator'|'downstream'|'depletion'|'intervention'|'interaction'|'time';
  question: string;
};

const NODE_PROMPTS: Array<[FrontierQuestion['kind'], string]> = [
  ['upstream', 'What causes or enables {x}?'],
  ['requirement', 'What is required for {x} to occur?'],
  ['substrate', 'What substrates or cofactors does {x} consume or require?'],
  ['regulator', 'What increases, decreases, or regulates {x}?'],
  ['downstream', 'What does {x} produce or change downstream?'],
  ['depletion', 'What does {x} consume, deplete, damage, or make unavailable?'],
  ['intervention', 'What can increase, decrease, replace, block, neutralize, or protect against {x}?'],
  ['interaction', 'What other parent or state changes the effect of {x}?'],
  ['time', 'What are the lag, persistence, reversibility, and recovery dynamics of {x}?'],
];

export function expandFrontier(graph: GraphSnapshot): FrontierQuestion[] {
  const questions: FrontierQuestion[] = [];
  for (const node of graph.nodes.filter(n => n.material !== false)) {
    for (const [kind, template] of NODE_PROMPTS) {
      questions.push({
        key: `${node.id}:${kind}`,
        anchor: node.id,
        kind,
        question: template.replace('{x}', node.label ?? node.id),
      });
    }
  }
  for (const edge of graph.edges.filter(e => e.material !== false)) {
    questions.push({
      key: `${edge.from}->${edge.to}:mechanism`,
      anchor: `${edge.from}->${edge.to}`,
      kind: 'interaction',
      question: `What mechanism, mediator, cofactor, moderator, or hidden state explains ${edge.from} -> ${edge.to}?`,
    });
  }
  return questions;
}

export type EvidenceClaim = {
  sourceId: string;
  statement: string;
  supports?: Array<{ from: string; to: string }>;
  confidence?: number;
};

export type ResearchTask = {
  graph: GraphSnapshot;
  frontier: FrontierQuestion[];
  evidence: EvidenceClaim[];
  allowedMutations: string[];
};

export function compileResearchTask(graph: GraphSnapshot, evidence: EvidenceClaim[] = []): ResearchTask {
  return {
    graph,
    frontier: expandFrontier(graph),
    evidence,
    allowedMutations: ['add_node','remove_node','add_edge','remove_edge','reverse_edge','change_function','change_lag','change_uncertainty','add_interaction','split_node','merge_nodes'],
  };
}
