/**
 * Receipt Token System
 *
 * Every factual claim in The Ledger must be tethered to a primary source
 * via a Receipt Token. If a claim cannot be tethered, it does not ship.
 *
 * Token formats:
 *   BILL:{congress}-{chamber}{number}
 *   TEXT:{congress}-{chamber}{number}-{version}
 *   SECTION:{congress}-{chamber}{number}-{section}
 *   ACTION:{congress}-{chamber}{number}-{actionCode}
 *   VOTE:HOUSE:{congress}-{rollNumber}
 *   VOTE:SENATE:{congress}-{rollNumber}
 */

import type { ReceiptToken, ReceiptTokenType, EvidenceClass } from './types';

// ─── Token Construction ─────────────────────────────────

export function makeBillToken(congress: number, chamber: string, number_: number): string {
  return `BILL:${congress}-${chamber}${number_}`;
}

export function makeTextToken(congress: number, chamber: string, number_: number, version: string): string {
  return `TEXT:${congress}-${chamber}${number_}-${version}`;
}

export function makeSectionToken(congress: number, chamber: string, number_: number, section: string): string {
  return `SECTION:${congress}-${chamber}${number_}-${section}`;
}

export function makeActionToken(congress: number, chamber: string, number_: number, actionCode: string): string {
  return `ACTION:${congress}-${chamber}${number_}-${actionCode}`;
}

export function makeHouseVoteToken(congress: number, rollNumber: number): string {
  return `VOTE:HOUSE:${congress}-${rollNumber}`;
}

export function makeSenateVoteToken(congress: number, rollNumber: number): string {
  return `VOTE:SENATE:${congress}-${rollNumber}`;
}

// ─── Token Parsing ──────────────────────────────────────

interface ParsedToken {
  type: ReceiptTokenType;
  congress: number;
  chamber?: string;
  number?: number;
  version?: string;
  section?: string;
  actionCode?: string;
  rollNumber?: number;
}

const TOKEN_PATTERNS: Array<{
  regex: RegExp;
  type: ReceiptTokenType;
  extract: (m: RegExpMatchArray) => Omit<ParsedToken, 'type'>;
}> = [
  {
    regex: /^VOTE:HOUSE:(\d+)-(\d+)$/,
    type: 'VOTE:HOUSE',
    extract: (m) => ({ congress: +m[1], rollNumber: +m[2] }),
  },
  {
    regex: /^VOTE:SENATE:(\d+)-(\d+)$/,
    type: 'VOTE:SENATE',
    extract: (m) => ({ congress: +m[1], rollNumber: +m[2] }),
  },
  {
    regex: /^SECTION:(\d+)-([A-Z]+)(\d+)-(.+)$/,
    type: 'SECTION',
    extract: (m) => ({ congress: +m[1], chamber: m[2], number: +m[3], section: m[4] }),
  },
  {
    regex: /^ACTION:(\d+)-([A-Z]+)(\d+)-(.+)$/,
    type: 'ACTION',
    extract: (m) => ({ congress: +m[1], chamber: m[2], number: +m[3], actionCode: m[4] }),
  },
  {
    regex: /^TEXT:(\d+)-([A-Z]+)(\d+)-(.+)$/,
    type: 'TEXT',
    extract: (m) => ({ congress: +m[1], chamber: m[2], number: +m[3], version: m[4] }),
  },
  {
    regex: /^BILL:(\d+)-([A-Z]+)(\d+)$/,
    type: 'BILL',
    extract: (m) => ({ congress: +m[1], chamber: m[2], number: +m[3] }),
  },
];

export function parseToken(token: string): ParsedToken | null {
  for (const pattern of TOKEN_PATTERNS) {
    const match = token.match(pattern.regex);
    if (match) {
      return { type: pattern.type, ...pattern.extract(match) };
    }
  }
  return null;
}

// ─── Token → URL Resolution ─────────────────────────────

export function resolveTokenUrl(token: string): string | null {
  const parsed = parseToken(token);
  if (!parsed) return null;

  const { type, congress, chamber, number: num } = parsed;

  // Map chamber codes to Congress.gov URL slugs
  const chamberSlug: Record<string, string> = {
    HR: 'house-bill',
    S: 'senate-bill',
    HJRES: 'house-joint-resolution',
    SJRES: 'senate-joint-resolution',
    HCONRES: 'house-concurrent-resolution',
    SCONRES: 'senate-concurrent-resolution',
    HRES: 'house-resolution',
    SRES: 'senate-resolution',
  };

  switch (type) {
    case 'BILL': {
      const slug = chamber ? chamberSlug[chamber] : null;
      if (!slug) return null;
      return `https://www.congress.gov/bill/${congress}th-congress/${slug}/${num}`;
    }
    case 'TEXT': {
      const slug = chamber ? chamberSlug[chamber] : null;
      if (!slug) return null;
      return `https://www.congress.gov/bill/${congress}th-congress/${slug}/${num}/text`;
    }
    case 'SECTION': {
      const slug = chamber ? chamberSlug[chamber] : null;
      if (!slug) return null;
      return `https://www.congress.gov/bill/${congress}th-congress/${slug}/${num}/text`;
    }
    case 'ACTION': {
      const slug = chamber ? chamberSlug[chamber] : null;
      if (!slug) return null;
      return `https://www.congress.gov/bill/${congress}th-congress/${slug}/${num}/all-actions`;
    }
    case 'VOTE:HOUSE': {
      const year = congressToYear(congress);
      const rollStr = String(parsed.rollNumber).padStart(3, '0');
      return `https://clerk.house.gov/evs/${year}/roll${rollStr}.xml`;
    }
    case 'VOTE:SENATE': {
      const session = congressToSession(congress);
      const rollStr = String(parsed.rollNumber).padStart(5, '0');
      return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${rollStr}.xml`;
    }
  }
}

// ─── Receipt Token Creation ─────────────────────────────

export function createReceipt(
  token: string,
  evidenceClass: EvidenceClass,
  label: string,
): ReceiptToken {
  const parsed = parseToken(token);
  return {
    token,
    type: parsed?.type ?? 'BILL',
    evidenceClass,
    resolvedUrl: resolveTokenUrl(token),
    label,
  };
}

// ─── Helpers ────────────────────────────────────────────

function congressToYear(congress: number): number {
  // The 1st Congress began in 1789. Each Congress is 2 years.
  // Congress N starts in year 1789 + (N-1)*2.
  // Return the first year of the Congress as a reasonable default.
  return 1789 + (congress - 1) * 2;
}

function congressToSession(congress: number): number {
  // Default to session 1. Callers can override for session 2.
  void congress;
  return 1;
}

// ─── Format for Display ─────────────────────────────────

export function formatTokenForDisplay(token: string): string {
  return token;
}

export function formatTokenAsMarkdown(receipt: ReceiptToken): string {
  const url = receipt.resolvedUrl;
  const cls = receipt.evidenceClass;
  if (url) {
    return `[${receipt.token}](${url}) (${cls})`;
  }
  return `${receipt.token} (${cls})`;
}
