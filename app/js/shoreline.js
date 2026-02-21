/**
 * Shoreline — Congress.gov Ingestion Module
 *
 * Takes bill identifiers (HR 1, S 100, etc.) or search results.
 * Returns structured bill objects with metadata, actions, and receipt tokens.
 *
 * Uses Congress.gov API (api.data.gov key required).
 */

const Shoreline = (() => {
  const BASE_URL = 'https://api.congress.gov/v3';
  const RATE_LIMIT_MS = 250;

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  /**
   * Parse a line of input into a bill identifier.
   * Accepts: "HR 1", "S 100", "H.R. 1", "118-HR1", "BILL:118-HR1"
   */
  function parseIdentifier(line) {
    line = line.trim().toUpperCase();
    if (!line) return null;

    // Receipt token format: BILL:118-HR1
    const tokenMatch = line.match(/^BILL:(\d+)-([A-Z]+)(\d+)$/);
    if (tokenMatch) return { congress: +tokenMatch[1], type: tokenMatch[2].toLowerCase(), number: +tokenMatch[3] };

    // Congress-type-number: 118-HR1
    const dashMatch = line.match(/^(\d+)-([A-Z]+)(\d+)$/);
    if (dashMatch) return { congress: +dashMatch[1], type: dashMatch[2].toLowerCase(), number: +dashMatch[3] };

    // "HR 1", "H.R. 1", "S 100", "HJRES 50"
    const billMatch = line.match(/^(H\.?R\.?|S\.?|HJRES|SJRES|HCONRES|SCONRES|HRES|SRES)\.?\s*(\d+)$/);
    if (billMatch) {
      const raw = billMatch[1].replace(/\./g, '');
      return { congress: null, type: raw.toLowerCase(), number: +billMatch[2] };
    }

    return null;
  }

  /**
   * Search bills by keyword via Congress.gov API.
   */
  async function searchBills(query, apiKey, opts) {
    const limit = (opts && opts.limit) || 10;
    const congress = (opts && opts.congress) || null;

    const params = new URLSearchParams({
      api_key: apiKey,
      query: query,
      limit: String(limit),
      format: 'json'
    });
    if (congress) params.set('congress', String(congress));

    const res = await fetch(BASE_URL + '/bill?' + params);
    if (!res.ok) throw new Error('Congress.gov API error: ' + res.status + ' ' + res.statusText);

    const data = await res.json();
    const bills = (data.bills || []).map(normalizeBill);
    const total = (data.pagination && data.pagination.count) || bills.length;
    return { bills, total };
  }

  /**
   * Get detailed bill info.
   */
  async function getBillDetail(congress, type, number, apiKey) {
    const params = new URLSearchParams({ api_key: apiKey, format: 'json' });
    const res = await fetch(BASE_URL + '/bill/' + congress + '/' + type + '/' + number + '?' + params);
    if (!res.ok) throw new Error('Congress.gov detail error: ' + res.status);
    const data = await res.json();
    return normalizeBillDetail(data.bill);
  }

  /**
   * Get bill actions.
   */
  async function getBillActions(congress, type, number, apiKey) {
    const params = new URLSearchParams({ api_key: apiKey, format: 'json', limit: '50' });
    const res = await fetch(BASE_URL + '/bill/' + congress + '/' + type + '/' + number + '/actions?' + params);
    if (!res.ok) throw new Error('Congress.gov actions error: ' + res.status);
    const data = await res.json();
    const chamberUpper = type.toUpperCase();
    return (data.actions || []).map(function(raw, idx) {
      return {
        date: raw.actionDate,
        text: raw.text,
        type: raw.type || null,
        actionCode: raw.actionCode || null,
        sourceSystem: raw.sourceSystem ? raw.sourceSystem.name : null,
        committee: raw.committee ? raw.committee.name : null,
        receiptToken: 'ACTION:' + congress + '-' + chamberUpper + number + '-' + (raw.actionCode || idx)
      };
    });
  }

  function normalizeBill(raw) {
    const chamber = (raw.type || 'hr').toUpperCase();
    const slug = chamberSlug(chamber);
    return {
      congress: raw.congress,
      chamber: chamber,
      number: raw.number,
      title: raw.title || '',
      shortTitle: raw.shortTitle || null,
      sponsor: null,
      introducedDate: null,
      latestActionDate: raw.latestAction ? raw.latestAction.actionDate : null,
      latestActionText: raw.latestAction ? raw.latestAction.text : null,
      policyArea: raw.policyArea ? raw.policyArea.name : null,
      summaryText: null,
      congressGovUrl: 'https://www.congress.gov/bill/' + raw.congress + 'th-congress/' + slug + '/' + raw.number,
      receiptToken: 'BILL:' + raw.congress + '-' + chamber + raw.number
    };
  }

  function normalizeBillDetail(raw) {
    if (!raw) return null;
    const chamber = (raw.type || 'hr').toUpperCase();
    const slug = chamberSlug(chamber);
    return {
      congress: raw.congress,
      chamber: chamber,
      number: raw.number,
      title: raw.title || '',
      shortTitle: raw.shortTitle || null,
      sponsor: raw.sponsors && raw.sponsors[0] ? raw.sponsors[0].fullName : null,
      introducedDate: raw.introducedDate || null,
      latestActionDate: raw.latestAction ? raw.latestAction.actionDate : null,
      latestActionText: raw.latestAction ? raw.latestAction.text : null,
      policyArea: raw.policyArea ? raw.policyArea.name : null,
      summaryText: raw.summaries && raw.summaries.billSummaries && raw.summaries.billSummaries[0] ? raw.summaries.billSummaries[0].text : null,
      congressGovUrl: 'https://www.congress.gov/bill/' + raw.congress + 'th-congress/' + slug + '/' + raw.number,
      receiptToken: 'BILL:' + raw.congress + '-' + chamber + raw.number
    };
  }

  function chamberSlug(c) {
    var m = { HR:'house-bill', S:'senate-bill', HJRES:'house-joint-resolution', SJRES:'senate-joint-resolution', HCONRES:'house-concurrent-resolution', SCONRES:'senate-concurrent-resolution', HRES:'house-resolution', SRES:'senate-resolution' };
    return m[c] || 'house-bill';
  }

  /**
   * Main ingestion: take raw text input of bill identifiers, return structured bills.
   */
  async function ingest(text, apiKey, congress, onProgress) {
    const lines = text.split('\n');
    const identifiers = [];
    const errors = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const id = parseIdentifier(trimmed);
      if (id) {
        if (!id.congress) id.congress = congress || 118;
        identifiers.push(id);
      } else {
        errors.push(trimmed);
      }
    }

    if (identifiers.length === 0) {
      return { bills: [], errors: errors.length ? errors : ['No valid bill identifiers found.'] };
    }

    const bills = [];
    for (let i = 0; i < identifiers.length; i++) {
      const id = identifiers[i];
      if (onProgress) onProgress('Fetching ' + id.type.toUpperCase() + ' ' + id.number + '...');
      try {
        const detail = await getBillDetail(id.congress, id.type, id.number, apiKey);
        if (detail) bills.push(detail);
        await sleep(RATE_LIMIT_MS);
      } catch (e) {
        errors.push(id.type.toUpperCase() + ' ' + id.number + ': ' + e.message);
      }
    }

    return { bills, errors };
  }

  return {
    parseIdentifier,
    searchBills,
    getBillDetail,
    getBillActions,
    ingest,
    sleep,
    RATE_LIMIT_MS
  };
})();
