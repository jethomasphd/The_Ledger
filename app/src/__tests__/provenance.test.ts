import { describe, it, expect } from 'vitest';
import {
  generateSessionId,
  createProvenanceLog,
  recordStrategy,
  addCitation,
  selectBill,
  deselectBill,
  markExported,
  provenanceToJson,
} from '../lib/provenance';

describe('Session ID Generation', () => {
  it('generates unique session IDs', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^ledger-/);
    expect(id2).toMatch(/^ledger-/);
  });
});

describe('Provenance Log Creation', () => {
  it('creates a log with query and timestamp', () => {
    const log = createProvenanceLog('data privacy bills');
    expect(log.query).toBe('data privacy bills');
    expect(log.timestamp).toBeTruthy();
    expect(log.sessionId).toMatch(/^ledger-/);
    expect(log.strategies).toHaveLength(0);
    expect(log.selectedBills).toHaveLength(0);
    expect(log.citationsMap).toEqual({});
    expect(log.exportedAt).toBeNull();
  });
});

describe('Strategy Recording', () => {
  it('records a retrieval strategy', () => {
    let log = createProvenanceLog('test');
    log = recordStrategy(log, {
      label: 'Congress.gov Keyword Search',
      description: 'Search bills matching "test"',
      source: 'Congress.gov API',
      endpoint: 'https://api.congress.gov/v3/bill',
      parametersUsed: { query: 'test', limit: '10' },
      success: true,
      resultCount: 5,
    });

    expect(log.strategies).toHaveLength(1);
    expect(log.strategies[0].id).toBe('strat-1');
    expect(log.strategies[0].label).toBe('Congress.gov Keyword Search');
    expect(log.strategies[0].success).toBe(true);
    expect(log.strategies[0].resultCount).toBe(5);
    expect(log.strategies[0].timestamp).toBeTruthy();
  });

  it('records multiple strategies with sequential IDs', () => {
    let log = createProvenanceLog('test');
    log = recordStrategy(log, {
      label: 'Strategy 1',
      description: 'First',
      source: 'Source A',
      endpoint: '/a',
      parametersUsed: {},
      success: true,
      resultCount: 3,
    });
    log = recordStrategy(log, {
      label: 'Strategy 2',
      description: 'Second',
      source: 'Source B',
      endpoint: '/b',
      parametersUsed: {},
      success: false,
      resultCount: 0,
    });

    expect(log.strategies).toHaveLength(2);
    expect(log.strategies[0].id).toBe('strat-1');
    expect(log.strategies[1].id).toBe('strat-2');
  });
});

describe('Citation Management', () => {
  it('adds a citation to the log', () => {
    let log = createProvenanceLog('test');
    log = addCitation(log, 'BILL:118-HR1', 'WITNESSED', 'Test bill');

    expect(log.citationsMap['BILL:118-HR1']).toBeTruthy();
    expect(log.citationsMap['BILL:118-HR1'].token).toBe('BILL:118-HR1');
    expect(log.citationsMap['BILL:118-HR1'].evidenceClass).toBe('WITNESSED');
  });

  it('adds multiple citations', () => {
    let log = createProvenanceLog('test');
    log = addCitation(log, 'BILL:118-HR1', 'WITNESSED', 'Bill 1');
    log = addCitation(log, 'VOTE:HOUSE:118-123', 'WITNESSED', 'Vote 1');

    expect(Object.keys(log.citationsMap)).toHaveLength(2);
  });
});

describe('Bill Selection', () => {
  it('selects a bill', () => {
    let log = createProvenanceLog('test');
    log = selectBill(log, 'BILL:118-HR1');

    expect(log.selectedBills).toContain('BILL:118-HR1');
    expect(log.selectedBills).toHaveLength(1);
  });

  it('prevents duplicate selections', () => {
    let log = createProvenanceLog('test');
    log = selectBill(log, 'BILL:118-HR1');
    log = selectBill(log, 'BILL:118-HR1');

    expect(log.selectedBills).toHaveLength(1);
  });

  it('deselects a bill', () => {
    let log = createProvenanceLog('test');
    log = selectBill(log, 'BILL:118-HR1');
    log = selectBill(log, 'BILL:118-S100');
    log = deselectBill(log, 'BILL:118-HR1');

    expect(log.selectedBills).not.toContain('BILL:118-HR1');
    expect(log.selectedBills).toContain('BILL:118-S100');
    expect(log.selectedBills).toHaveLength(1);
  });
});

describe('Export', () => {
  it('marks export timestamp', () => {
    let log = createProvenanceLog('test');
    expect(log.exportedAt).toBeNull();

    log = markExported(log);
    expect(log.exportedAt).toBeTruthy();
  });

  it('serializes to valid JSON', () => {
    let log = createProvenanceLog('test');
    log = addCitation(log, 'BILL:118-HR1', 'WITNESSED', 'Test');
    log = selectBill(log, 'BILL:118-HR1');

    const json = provenanceToJson(log);
    const parsed = JSON.parse(json);

    expect(parsed.query).toBe('test');
    expect(parsed.selectedBills).toContain('BILL:118-HR1');
    expect(parsed.citationsMap['BILL:118-HR1']).toBeTruthy();
  });
});
