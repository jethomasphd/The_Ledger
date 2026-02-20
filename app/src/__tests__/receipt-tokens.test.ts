import { describe, it, expect } from 'vitest';
import {
  makeBillToken,
  makeTextToken,
  makeSectionToken,
  makeActionToken,
  makeHouseVoteToken,
  makeSenateVoteToken,
  parseToken,
  resolveTokenUrl,
  createReceipt,
  formatTokenAsMarkdown,
} from '../lib/receipt-tokens';

describe('Receipt Token Construction', () => {
  it('creates bill tokens', () => {
    expect(makeBillToken(118, 'HR', 1)).toBe('BILL:118-HR1');
    expect(makeBillToken(117, 'S', 2345)).toBe('BILL:117-S2345');
    expect(makeBillToken(118, 'HJRES', 50)).toBe('BILL:118-HJRES50');
  });

  it('creates text tokens', () => {
    expect(makeTextToken(118, 'HR', 1, 'IH')).toBe('TEXT:118-HR1-IH');
    expect(makeTextToken(118, 'S', 100, 'ENR')).toBe('TEXT:118-S100-ENR');
  });

  it('creates section tokens', () => {
    expect(makeSectionToken(118, 'HR', 1, '101')).toBe('SECTION:118-HR1-101');
  });

  it('creates action tokens', () => {
    expect(makeActionToken(118, 'HR', 1, '10000')).toBe('ACTION:118-HR1-10000');
  });

  it('creates house vote tokens', () => {
    expect(makeHouseVoteToken(118, 123)).toBe('VOTE:HOUSE:118-123');
  });

  it('creates senate vote tokens', () => {
    expect(makeSenateVoteToken(118, 456)).toBe('VOTE:SENATE:118-456');
  });
});

describe('Receipt Token Parsing', () => {
  it('parses bill tokens', () => {
    const parsed = parseToken('BILL:118-HR1');
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe('BILL');
    expect(parsed!.congress).toBe(118);
    expect(parsed!.chamber).toBe('HR');
    expect(parsed!.number).toBe(1);
  });

  it('parses text tokens', () => {
    const parsed = parseToken('TEXT:118-HR1-IH');
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe('TEXT');
    expect(parsed!.congress).toBe(118);
    expect(parsed!.version).toBe('IH');
  });

  it('parses section tokens', () => {
    const parsed = parseToken('SECTION:118-HR1-101');
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe('SECTION');
    expect(parsed!.section).toBe('101');
  });

  it('parses action tokens', () => {
    const parsed = parseToken('ACTION:118-HR1-10000');
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe('ACTION');
    expect(parsed!.actionCode).toBe('10000');
  });

  it('parses house vote tokens', () => {
    const parsed = parseToken('VOTE:HOUSE:118-123');
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe('VOTE:HOUSE');
    expect(parsed!.congress).toBe(118);
    expect(parsed!.rollNumber).toBe(123);
  });

  it('parses senate vote tokens', () => {
    const parsed = parseToken('VOTE:SENATE:118-456');
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe('VOTE:SENATE');
    expect(parsed!.congress).toBe(118);
    expect(parsed!.rollNumber).toBe(456);
  });

  it('returns null for invalid tokens', () => {
    expect(parseToken('INVALID')).toBeNull();
    expect(parseToken('BILL:')).toBeNull();
    expect(parseToken('')).toBeNull();
    expect(parseToken('SOMETHING:ELSE')).toBeNull();
  });
});

describe('Receipt Token URL Resolution', () => {
  it('resolves bill tokens to Congress.gov URLs', () => {
    const url = resolveTokenUrl('BILL:118-HR1');
    expect(url).toBe('https://www.congress.gov/bill/118th-congress/house-bill/1');
  });

  it('resolves senate bill tokens', () => {
    const url = resolveTokenUrl('BILL:118-S100');
    expect(url).toBe('https://www.congress.gov/bill/118th-congress/senate-bill/100');
  });

  it('resolves text tokens to text pages', () => {
    const url = resolveTokenUrl('TEXT:118-HR1-IH');
    expect(url).toBe('https://www.congress.gov/bill/118th-congress/house-bill/1/text');
  });

  it('resolves action tokens to all-actions pages', () => {
    const url = resolveTokenUrl('ACTION:118-HR1-10000');
    expect(url).toBe('https://www.congress.gov/bill/118th-congress/house-bill/1/all-actions');
  });

  it('resolves house vote tokens to clerk.house.gov', () => {
    const url = resolveTokenUrl('VOTE:HOUSE:118-123');
    expect(url).toBe('https://clerk.house.gov/evs/2023/roll123.xml');
  });

  it('resolves senate vote tokens to senate.gov', () => {
    const url = resolveTokenUrl('VOTE:SENATE:118-456');
    expect(url).toBe(
      'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1181/vote_118_1_00456.xml',
    );
  });

  it('returns null for invalid tokens', () => {
    expect(resolveTokenUrl('INVALID')).toBeNull();
  });
});

describe('Receipt Creation', () => {
  it('creates a receipt with all fields', () => {
    const receipt = createReceipt('BILL:118-HR1', 'WITNESSED', 'Test bill');
    expect(receipt.token).toBe('BILL:118-HR1');
    expect(receipt.type).toBe('BILL');
    expect(receipt.evidenceClass).toBe('WITNESSED');
    expect(receipt.label).toBe('Test bill');
    expect(receipt.resolvedUrl).toBeTruthy();
  });

  it('marks inference correctly', () => {
    const receipt = createReceipt('BILL:118-HR1', 'INFERENCE', 'Derived claim');
    expect(receipt.evidenceClass).toBe('INFERENCE');
  });
});

describe('Receipt Formatting', () => {
  it('formats token as markdown with URL', () => {
    const receipt = createReceipt('BILL:118-HR1', 'WITNESSED', 'Test');
    const md = formatTokenAsMarkdown(receipt);
    expect(md).toContain('BILL:118-HR1');
    expect(md).toContain('WITNESSED');
    expect(md).toContain('https://');
  });
});
