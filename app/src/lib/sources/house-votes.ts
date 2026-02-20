/**
 * House Clerk Roll Call Vote Adapter
 *
 * Primary source: House Clerk XML roll call records
 * https://clerk.house.gov/evs/{year}/roll{number}.xml
 */

import type { Vote, VoteDetail, VoteMember } from '../types';
import { makeHouseVoteToken } from '../receipt-tokens';

// ─── Fetch House Roll Call ──────────────────────────────

function congressToYears(congress: number): [number, number] {
  const startYear = 1789 + (congress - 1) * 2;
  return [startYear, startYear + 1];
}

export async function fetchHouseRollCall(
  congress: number,
  session: number,
  rollNumber: number,
): Promise<VoteDetail> {
  const [year1, year2] = congressToYears(congress);
  const year = session === 1 ? year1 : year2;
  const rollStr = String(rollNumber).padStart(3, '0');
  const url = `https://clerk.house.gov/evs/${year}/roll${rollStr}.xml`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`House Clerk error: ${res.status} for roll ${rollNumber}`);
  }

  const xmlText = await res.text();
  return parseHouseRollCallXml(xmlText, congress, session, rollNumber, url);
}

// ─── Parse House XML ────────────────────────────────────

function parseHouseRollCallXml(
  xml: string,
  congress: number,
  session: number,
  rollNumber: number,
  sourceUrl: string,
): VoteDetail {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const getEl = (tag: string): string =>
    doc.querySelector(tag)?.textContent?.trim() ?? '';

  const question = getEl('vote-question');
  const result = getEl('vote-result');
  const description = getEl('vote-desc') || null;
  const actionDate = getEl('action-date');

  // Parse vote totals
  const totals = doc.querySelector('vote-totals');
  const yeas = parseInt(totals?.querySelector('yea-total')?.textContent ?? '0', 10);
  const nays = parseInt(totals?.querySelector('nay-total')?.textContent ?? '0', 10);
  const present = parseInt(totals?.querySelector('present-total')?.textContent ?? '0', 10);
  const notVoting = parseInt(totals?.querySelector('not-voting-total')?.textContent ?? '0', 10);

  // Parse individual votes
  const members: VoteMember[] = [];
  const recorded = doc.querySelectorAll('recorded-vote');
  recorded.forEach((rv) => {
    const legislator = rv.querySelector('legislator');
    if (!legislator) return;
    const name = legislator.textContent?.trim() ?? '';
    const party = legislator.getAttribute('party') ?? null;
    const state = legislator.getAttribute('state') ?? null;
    const voteText = rv.querySelector('vote')?.textContent?.trim() ?? '';
    const vote = normalizeVote(voteText);
    members.push({ name, party, state, vote });
  });

  // Try to extract related bill token
  const billNum = getEl('legis-num');
  let billToken: string | null = null;
  if (billNum) {
    // legis-num might be like "H R 1" or "H.R. 1"
    const cleaned = billNum.replace(/[.\s]+/g, '').toUpperCase();
    billToken = `BILL:${congress}-${cleaned}`;
  }

  return {
    congress,
    chamber: 'House',
    session,
    rollNumber,
    date: actionDate,
    question,
    result,
    description,
    billToken,
    yeas,
    nays,
    present,
    notVoting,
    sourceUrl,
    receiptToken: makeHouseVoteToken(congress, rollNumber),
    members,
  };
}

function normalizeVote(raw: string): VoteMember['vote'] {
  const lower = raw.toLowerCase();
  if (lower === 'yea' || lower === 'aye' || lower === 'yes') return 'Yea';
  if (lower === 'nay' || lower === 'no') return 'Nay';
  if (lower === 'present') return 'Present';
  return 'Not Voting';
}

// ─── Search Recent House Votes ──────────────────────────

export async function listRecentHouseVotes(
  congress: number,
  session: number,
  _year: number,
  maxRolls: number = 10,
): Promise<Vote[]> {
  // The House Clerk doesn't have a search API.
  // We try recent roll numbers by counting down from a high number.
  // This is a best-effort approach; a real implementation would
  // scrape the index page or use a cached list.
  const votes: Vote[] = [];
  let rollNumber = 500; // Start from a reasonable high point
  let misses = 0;

  while (votes.length < maxRolls && misses < 5 && rollNumber > 0) {
    try {
      const detail = await fetchHouseRollCall(congress, session, rollNumber);
      votes.push(detail);
      misses = 0;
    } catch {
      misses++;
    }
    rollNumber--;
  }

  return votes;
}
