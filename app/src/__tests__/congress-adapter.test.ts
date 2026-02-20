import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchBills, getBillActions } from '../lib/sources/congress';

// Mock fetch for adapter tests
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

describe('Congress.gov Adapter — searchBills', () => {
  it('returns normalized bills from API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bills: [
          {
            congress: 118,
            type: 'HR',
            number: 1,
            title: 'Lower Energy Costs Act',
            latestAction: {
              actionDate: '2023-03-30',
              text: 'Passed the House.',
            },
            policyArea: { name: 'Energy' },
          },
          {
            congress: 118,
            type: 'S',
            number: 100,
            title: 'A Senate Bill',
            latestAction: {
              actionDate: '2023-05-01',
              text: 'Introduced in Senate.',
            },
          },
        ],
        pagination: { count: 42 },
      }),
    });

    const result = await searchBills('energy', 'test-key');

    expect(result.bills).toHaveLength(2);
    expect(result.total).toBe(42);

    // First bill
    expect(result.bills[0].congress).toBe(118);
    expect(result.bills[0].chamber).toBe('HR');
    expect(result.bills[0].number).toBe(1);
    expect(result.bills[0].title).toBe('Lower Energy Costs Act');
    expect(result.bills[0].receiptToken).toBe('BILL:118-HR1');
    expect(result.bills[0].congressGovUrl).toContain('congress.gov');
    expect(result.bills[0].policyArea).toBe('Energy');

    // Second bill
    expect(result.bills[1].chamber).toBe('S');
    expect(result.bills[1].receiptToken).toBe('BILL:118-S100');
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    await expect(searchBills('test', 'bad-key')).rejects.toThrow('Congress.gov API error: 403');
  });

  it('sends correct query parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bills: [], pagination: { count: 0 } }),
    });

    await searchBills('climate', 'test-key', { congress: 118, limit: 5 });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('api_key=test-key');
    expect(url).toContain('query=climate');
    expect(url).toContain('limit=5');
    expect(url).toContain('congress=118');
  });

  it('handles empty results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bills: [], pagination: { count: 0 } }),
    });

    const result = await searchBills('xyznonexistent', 'test-key');
    expect(result.bills).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('Congress.gov Adapter — getBillActions', () => {
  it('returns normalized actions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        actions: [
          {
            actionDate: '2023-01-09',
            text: 'Introduced in House',
            type: 'IntroReferral',
            actionCode: '1000',
            sourceSystem: { name: 'Library of Congress' },
          },
          {
            actionDate: '2023-03-30',
            text: 'Passed the House',
            type: 'Floor',
            actionCode: '8000',
            sourceSystem: { name: 'House floor actions' },
            committee: { name: 'Energy and Commerce' },
          },
        ],
      }),
    });

    const actions = await getBillActions(118, 'HR', 1, 'test-key');

    expect(actions).toHaveLength(2);
    expect(actions[0].billToken).toBe('BILL:118-HR1');
    expect(actions[0].actionDate).toBe('2023-01-09');
    expect(actions[0].text).toBe('Introduced in House');
    expect(actions[0].receiptToken).toBe('ACTION:118-HR1-1000');

    expect(actions[1].committee).toBe('Energy and Commerce');
    expect(actions[1].receiptToken).toBe('ACTION:118-HR1-8000');
  });
});
