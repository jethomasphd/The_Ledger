/**
 * Senate Roll Call Vote Adapter
 *
 * Primary source: Senate.gov LIS roll call records
 * https://www.senate.gov/legislative/LIS/roll_call_votes/
 */

import type { VoteDetail, VoteMember } from '../types';
import { makeSenateVoteToken } from '../receipt-tokens';

// ─── Fetch Senate Roll Call ─────────────────────────────

export async function fetchSenateRollCall(
  congress: number,
  session: number,
  rollNumber: number,
): Promise<VoteDetail> {
  const sessStr = String(session);
  const rollStr = String(rollNumber).padStart(5, '0');
  const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${sessStr}/vote_${congress}_${sessStr}_${rollStr}.xml`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Senate vote error: ${res.status} for roll ${rollNumber}`);
  }

  const xmlText = await res.text();
  return parseSenateRollCallXml(xmlText, congress, session, rollNumber, url);
}

// ─── Parse Senate XML ───────────────────────────────────

function parseSenateRollCallXml(
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

  const question = getEl('question');
  const result = getEl('result');
  const description = getEl('vote_title') || getEl('title') || null;
  const voteDate = getEl('vote_date');

  // Parse counts
  const counts = doc.querySelector('count');
  const yeas = parseInt(counts?.querySelector('yeas')?.textContent ?? '0', 10);
  const nays = parseInt(counts?.querySelector('nays')?.textContent ?? '0', 10);
  const present = parseInt(counts?.querySelector('present')?.textContent ?? '0', 10);
  const notVoting = parseInt(counts?.querySelector('absent')?.textContent ?? '0', 10);

  // Parse individual votes
  const members: VoteMember[] = [];
  const memberEls = doc.querySelectorAll('member');
  memberEls.forEach((m) => {
    const firstName = m.querySelector('first_name')?.textContent?.trim() ?? '';
    const lastName = m.querySelector('last_name')?.textContent?.trim() ?? '';
    const name = `${firstName} ${lastName}`.trim();
    const party = m.querySelector('party')?.textContent?.trim() ?? null;
    const state = m.querySelector('state')?.textContent?.trim() ?? null;
    const voteText = m.querySelector('vote_cast')?.textContent?.trim() ?? '';
    members.push({
      name,
      party,
      state,
      vote: normalizeVote(voteText),
    });
  });

  // Try to find related bill
  const docNum = getEl('document_short_title') || getEl('amendment_number');
  let billToken: string | null = null;
  if (docNum) {
    const cleaned = docNum.replace(/[.\s]+/g, '').toUpperCase();
    if (/^(HR|S|HJRES|SJRES)\d+$/.test(cleaned)) {
      billToken = `BILL:${congress}-${cleaned}`;
    }
  }

  return {
    congress,
    chamber: 'Senate',
    session,
    rollNumber,
    date: voteDate,
    question,
    result,
    description,
    billToken,
    yeas,
    nays,
    present,
    notVoting,
    sourceUrl,
    receiptToken: makeSenateVoteToken(congress, rollNumber),
    members,
  };
}

function normalizeVote(raw: string): VoteMember['vote'] {
  const lower = raw.toLowerCase();
  if (lower === 'yea' || lower === 'aye' || lower === 'yes' || lower === 'guilty') return 'Yea';
  if (lower === 'nay' || lower === 'no' || lower === 'not guilty') return 'Nay';
  if (lower === 'present') return 'Present';
  return 'Not Voting';
}
