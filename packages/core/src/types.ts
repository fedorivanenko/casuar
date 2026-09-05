export type ObjectKind =
  | 'concept'
  | 'state'
  | 'event'
  | 'observation'
  | 'claim'
  | 'source'
  | 'research_project'
  | 'research_question';

export interface CasuarObject {
  id: string;
  kind: ObjectKind;
  key: string;
  label: string;
  description?: string | null;
  attributes: Record<string, unknown>;
}

export type EvidenceRole = 'supporting' | 'opposing' | 'null' | 'mixed';
export type ClaimStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';

export interface ObservationInput {
  subjectId: string;
  conceptId: string;
  observedAt: string;
  value: number | string | Record<string, unknown>;
  unit?: string;
  sourceType: string;
  sourceRef?: string;
  conditions?: Record<string, unknown>;
}

export interface ClaimInput {
  subjectObjectId: string;
  relationType: string;
  objectObjectId?: string;
  objectLiteral?: unknown;
  scope?: Record<string, unknown>;
  notes?: string;
}
