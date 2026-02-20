/**
 * The Ledger — Normalized Schemas
 *
 * These types define the canonical shapes for all data
 * flowing through The Ledger. Every field is traceable
 * to a primary source via Receipt Tokens.
 */

// ─── Receipt Token ──────────────────────────────────────

export type ReceiptTokenType =
  | 'BILL'
  | 'TEXT'
  | 'SECTION'
  | 'ACTION'
  | 'VOTE:HOUSE'
  | 'VOTE:SENATE';

export type EvidenceClass = 'WITNESSED' | 'INFERENCE';
// UNWITNESSED is prohibited in final artifacts.

export interface ReceiptToken {
  token: string;
  type: ReceiptTokenType;
  evidenceClass: EvidenceClass;
  resolvedUrl: string | null;
  label: string;
}

// ─── Bill ───────────────────────────────────────────────

export interface Bill {
  congress: number;
  chamber: 'HR' | 'S' | 'HJRES' | 'SJRES' | 'HCONRES' | 'SCONRES' | 'HRES' | 'SRES';
  number: number;
  title: string;
  shortTitle: string | null;
  introducedDate: string | null;
  sponsor: string | null;
  latestActionDate: string | null;
  latestActionText: string | null;
  policyArea: string | null;
  summaryText: string | null;
  congressGovUrl: string;
  receiptToken: string; // e.g. BILL:118-HR1
}

// ─── Text Version ───────────────────────────────────────

export interface TextVersion {
  billToken: string;
  versionCode: string; // IH, RH, EH, ENR, etc.
  versionLabel: string;
  date: string | null;
  formats: {
    html: string | null;
    xml: string | null;
    pdf: string | null;
    txt: string | null;
  };
  receiptToken: string; // e.g. TEXT:118-HR1-IH
}

// ─── Action ─────────────────────────────────────────────

export interface Action {
  billToken: string;
  actionDate: string;
  text: string;
  type: string | null;
  actionCode: string | null;
  sourceSystem: string | null;
  committee: string | null;
  receiptToken: string; // e.g. ACTION:118-HR1-{actionCode}
}

// ─── Vote ───────────────────────────────────────────────

export interface Vote {
  congress: number;
  chamber: 'House' | 'Senate';
  session: number;
  rollNumber: number;
  date: string;
  question: string;
  result: string;
  description: string | null;
  billToken: string | null;
  yeas: number;
  nays: number;
  present: number;
  notVoting: number;
  sourceUrl: string;
  receiptToken: string; // e.g. VOTE:HOUSE:118-123
}

export interface VoteMember {
  name: string;
  party: string | null;
  state: string | null;
  vote: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
}

export interface VoteDetail extends Vote {
  members: VoteMember[];
}

// ─── Provenance ─────────────────────────────────────────

export interface RetrievalStrategy {
  id: string;
  label: string;
  description: string;
  source: string;
  endpoint: string;
  parametersUsed: Record<string, string>;
  timestamp: string;
  success: boolean;
  resultCount: number;
}

export interface ProvenanceLog {
  sessionId: string;
  query: string;
  timestamp: string;
  strategies: RetrievalStrategy[];
  selectedBills: string[]; // receipt tokens
  citationsMap: Record<string, ReceiptToken>;
  exportedAt: string | null;
}

// ─── Mission (Anti-Flood) ───────────────────────────────

export type MissionPhase =
  | 'threshold'
  | 'search'
  | 'shortlist'
  | 'reading'
  | 'votes'
  | 'export'
  | 'complete';

export interface Mission {
  id: string;
  query: string;
  phase: MissionPhase;
  provenance: ProvenanceLog;
  selectedBills: Bill[];
  activeBill: Bill | null;
  textVersions: TextVersion[];
  actions: Action[];
  votes: Vote[];
}

// ─── App State ──────────────────────────────────────────

export interface ApiKeys {
  congressGov: string;
  govinfo: string;
}

export interface AppState {
  apiKeys: ApiKeys;
  mission: Mission | null;
  settingsOpen: boolean;
}
