/**
 * Provenance Log System
 *
 * Maintains chain of custody for every derived statement.
 * Every claim can be walked back to: the bill, the section,
 * the action, the roll call.
 */

import type { ProvenanceLog, RetrievalStrategy, ReceiptToken } from './types';
import { createReceipt } from './receipt-tokens';
import type { EvidenceClass } from './types';

// ─── Session ID ─────────────────────────────────────────

export function generateSessionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `ledger-${ts}-${rand}`;
}

// ─── Provenance Log Creation ────────────────────────────

export function createProvenanceLog(query: string): ProvenanceLog {
  return {
    sessionId: generateSessionId(),
    query,
    timestamp: new Date().toISOString(),
    strategies: [],
    selectedBills: [],
    citationsMap: {},
    exportedAt: null,
  };
}

// ─── Strategy Recording ─────────────────────────────────

export function recordStrategy(
  log: ProvenanceLog,
  strategy: Omit<RetrievalStrategy, 'id' | 'timestamp'>,
): ProvenanceLog {
  const id = `strat-${log.strategies.length + 1}`;
  const newStrategy: RetrievalStrategy = {
    ...strategy,
    id,
    timestamp: new Date().toISOString(),
  };
  return {
    ...log,
    strategies: [...log.strategies, newStrategy],
  };
}

// ─── Citation Recording ─────────────────────────────────

export function addCitation(
  log: ProvenanceLog,
  token: string,
  evidenceClass: EvidenceClass,
  label: string,
): ProvenanceLog {
  const receipt: ReceiptToken = createReceipt(token, evidenceClass, label);
  return {
    ...log,
    citationsMap: {
      ...log.citationsMap,
      [token]: receipt,
    },
  };
}

// ─── Bill Selection Recording ───────────────────────────

export function selectBill(log: ProvenanceLog, billToken: string): ProvenanceLog {
  if (log.selectedBills.includes(billToken)) return log;
  return {
    ...log,
    selectedBills: [...log.selectedBills, billToken],
  };
}

export function deselectBill(log: ProvenanceLog, billToken: string): ProvenanceLog {
  return {
    ...log,
    selectedBills: log.selectedBills.filter((t) => t !== billToken),
  };
}

// ─── Export ─────────────────────────────────────────────

export function markExported(log: ProvenanceLog): ProvenanceLog {
  return {
    ...log,
    exportedAt: new Date().toISOString(),
  };
}

export function provenanceToJson(log: ProvenanceLog): string {
  return JSON.stringify(log, null, 2);
}
