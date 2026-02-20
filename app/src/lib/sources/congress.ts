/**
 * Congress.gov API Adapter
 *
 * Primary source for bill metadata, actions, summaries.
 * API docs: https://api.congress.gov/
 *
 * Requires an API key from https://api.congress.gov/sign-up/
 */

import type { Bill, Action } from '../types';
import { makeBillToken, makeActionToken } from '../receipt-tokens';

const BASE_URL = 'https://api.congress.gov/v3';

interface CongressApiResponse<T> {
  bills?: T[];
  bill?: T;
  actions?: T[];
  pagination?: {
    count: number;
    next?: string;
  };
}

// ─── Search Bills ───────────────────────────────────────

interface CongressBillRaw {
  congress: number;
  type: string;
  number: number;
  title: string;
  originChamber?: string;
  latestAction?: {
    actionDate: string;
    text: string;
  };
  url?: string;
  policyArea?: {
    name: string;
  };
}

function normalizeChamberType(type: string): Bill['chamber'] {
  const map: Record<string, Bill['chamber']> = {
    HR: 'HR',
    S: 'S',
    HJRES: 'HJRES',
    SJRES: 'SJRES',
    HCONRES: 'HCONRES',
    SCONRES: 'SCONRES',
    HRES: 'HRES',
    SRES: 'SRES',
  };
  return map[type.toUpperCase()] ?? 'HR';
}

function chamberToUrlSlug(chamber: string): string {
  const slugs: Record<string, string> = {
    HR: 'house-bill',
    S: 'senate-bill',
    HJRES: 'house-joint-resolution',
    SJRES: 'senate-joint-resolution',
    HCONRES: 'house-concurrent-resolution',
    SCONRES: 'senate-concurrent-resolution',
    HRES: 'house-resolution',
    SRES: 'senate-resolution',
  };
  return slugs[chamber] ?? 'house-bill';
}

function rawToBill(raw: CongressBillRaw): Bill {
  const chamber = normalizeChamberType(raw.type);
  const token = makeBillToken(raw.congress, chamber, raw.number);
  const slug = chamberToUrlSlug(chamber);
  return {
    congress: raw.congress,
    chamber,
    number: raw.number,
    title: raw.title ?? '',
    shortTitle: null,
    introducedDate: null,
    sponsor: null,
    latestActionDate: raw.latestAction?.actionDate ?? null,
    latestActionText: raw.latestAction?.text ?? null,
    policyArea: raw.policyArea?.name ?? null,
    summaryText: null,
    congressGovUrl: `https://www.congress.gov/bill/${raw.congress}th-congress/${slug}/${raw.number}`,
    receiptToken: token,
  };
}

export async function searchBills(
  query: string,
  apiKey: string,
  options: { congress?: number; limit?: number } = {},
): Promise<{ bills: Bill[]; total: number }> {
  const limit = options.limit ?? 10;
  const params = new URLSearchParams({
    api_key: apiKey,
    query: query,
    limit: String(limit),
    format: 'json',
  });
  if (options.congress) {
    params.set('congress', String(options.congress));
  }

  const res = await fetch(`${BASE_URL}/bill?${params}`);
  if (!res.ok) {
    throw new Error(`Congress.gov API error: ${res.status} ${res.statusText}`);
  }

  const data: CongressApiResponse<CongressBillRaw> = await res.json();
  const bills = (data.bills ?? []).map(rawToBill);
  const total = data.pagination?.count ?? bills.length;

  return { bills, total };
}

// ─── Get Bill Detail ────────────────────────────────────

interface CongressBillDetailRaw {
  congress: number;
  type: string;
  number: number;
  title: string;
  introducedDate?: string;
  sponsors?: Array<{ fullName: string }>;
  policyArea?: { name: string };
  latestAction?: { actionDate: string; text: string };
  summaries?: {
    billSummaries?: Array<{
      text: string;
      versionCode: string;
    }>;
  };
}

export async function getBillDetail(
  congress: number,
  type: string,
  number_: number,
  apiKey: string,
): Promise<Bill> {
  const params = new URLSearchParams({
    api_key: apiKey,
    format: 'json',
  });

  const res = await fetch(`${BASE_URL}/bill/${congress}/${type.toLowerCase()}/${number_}?${params}`);
  if (!res.ok) {
    throw new Error(`Congress.gov API error: ${res.status} ${res.statusText}`);
  }

  const data: { bill: CongressBillDetailRaw } = await res.json();
  const raw = data.bill;
  const chamber = normalizeChamberType(raw.type);
  const token = makeBillToken(raw.congress, chamber, raw.number);
  const slug = chamberToUrlSlug(chamber);

  return {
    congress: raw.congress,
    chamber,
    number: raw.number,
    title: raw.title ?? '',
    shortTitle: null,
    introducedDate: raw.introducedDate ?? null,
    sponsor: raw.sponsors?.[0]?.fullName ?? null,
    latestActionDate: raw.latestAction?.actionDate ?? null,
    latestActionText: raw.latestAction?.text ?? null,
    policyArea: raw.policyArea?.name ?? null,
    summaryText: raw.summaries?.billSummaries?.[0]?.text ?? null,
    congressGovUrl: `https://www.congress.gov/bill/${raw.congress}th-congress/${slug}/${raw.number}`,
    receiptToken: token,
  };
}

// ─── Get Bill Actions ───────────────────────────────────

interface CongressActionRaw {
  actionDate: string;
  text: string;
  type: string;
  actionCode?: string;
  sourceSystem?: { name: string };
  committee?: { name: string };
}

export async function getBillActions(
  congress: number,
  type: string,
  number_: number,
  apiKey: string,
): Promise<Action[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    format: 'json',
    limit: '50',
  });

  const res = await fetch(
    `${BASE_URL}/bill/${congress}/${type.toLowerCase()}/${number_}/actions?${params}`,
  );
  if (!res.ok) {
    throw new Error(`Congress.gov API error: ${res.status} ${res.statusText}`);
  }

  const data: CongressApiResponse<CongressActionRaw> = await res.json();
  const chamber = normalizeChamberType(type);
  const billToken = makeBillToken(congress, chamber, number_);

  return (data.actions ?? []).map((raw, idx) => ({
    billToken,
    actionDate: raw.actionDate,
    text: raw.text,
    type: raw.type ?? null,
    actionCode: raw.actionCode ?? null,
    sourceSystem: raw.sourceSystem?.name ?? null,
    committee: raw.committee?.name ?? null,
    receiptToken: makeActionToken(congress, chamber, number_, raw.actionCode ?? String(idx)),
  }));
}
