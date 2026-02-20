/**
 * govinfo API Adapter
 *
 * Primary source for bill text packages and bill status packages.
 * API docs: https://api.govinfo.gov/docs/
 *
 * Requires an API key from https://api.govinfo.gov/docs/signup
 */

import type { TextVersion } from '../types';
import { makeBillToken, makeTextToken } from '../receipt-tokens';

const BASE_URL = 'https://api.govinfo.gov';

// ─── Bill Text Packages ─────────────────────────────────

interface GovInfoPackage {
  packageId: string;
  title: string;
  dateIssued?: string;
  packageLink?: string;
  download?: {
    txtLink?: string;
    xmlLink?: string;
    pdfLink?: string;
    htmlLink?: string;
  };
}

interface GovInfoSearchResult {
  results: GovInfoPackage[];
  count: number;
  nextPage?: string;
}

function extractVersionCode(packageId: string): string {
  // GovInfo package IDs look like: BILLS-118hr1ih
  // The version suffix is at the end: ih, rh, eh, enr, etc.
  const match = packageId.match(/[a-z]+$/);
  return match ? match[0].toUpperCase() : 'UNK';
}

const VERSION_LABELS: Record<string, string> = {
  IH: 'Introduced in House',
  IS: 'Introduced in Senate',
  RH: 'Reported in House',
  RS: 'Reported in Senate',
  EH: 'Engrossed in House',
  ES: 'Engrossed in Senate',
  ENR: 'Enrolled Bill',
  RFS: 'Referred in Senate',
  RFH: 'Referred in House',
  CPH: 'Considered and Passed House',
  CPS: 'Considered and Passed Senate',
  PCS: 'Placed on Calendar Senate',
  PCH: 'Placed on Calendar House',
};

export async function getBillTextVersions(
  congress: number,
  chamber: string,
  number_: number,
  apiKey: string,
): Promise<TextVersion[]> {
  // Search for bill text packages
  const billType = chamber.toLowerCase();
  const query = `BILLS-${congress}${billType}${number_}`;

  const params = new URLSearchParams({
    api_key: apiKey,
    collection: 'BILLS',
    query,
    pageSize: '10',
  });

  const res = await fetch(`${BASE_URL}/search?${params}`);
  if (!res.ok) {
    throw new Error(`govinfo API error: ${res.status} ${res.statusText}`);
  }

  const data: GovInfoSearchResult = await res.json();
  const billToken = makeBillToken(congress, chamber, number_);

  return (data.results ?? []).map((pkg) => {
    const versionCode = extractVersionCode(pkg.packageId);
    return {
      billToken,
      versionCode,
      versionLabel: VERSION_LABELS[versionCode] ?? versionCode,
      date: pkg.dateIssued ?? null,
      formats: {
        html: pkg.download?.htmlLink ? `${pkg.download.htmlLink}?api_key=${apiKey}` : null,
        xml: pkg.download?.xmlLink ? `${pkg.download.xmlLink}?api_key=${apiKey}` : null,
        pdf: pkg.download?.pdfLink ? `${pkg.download.pdfLink}?api_key=${apiKey}` : null,
        txt: pkg.download?.txtLink ? `${pkg.download.txtLink}?api_key=${apiKey}` : null,
      },
      receiptToken: makeTextToken(congress, chamber, number_, versionCode),
    };
  });
}

// ─── Fetch Bill Text Content ────────────────────────────

export async function fetchBillTextHtml(
  textVersion: TextVersion,
): Promise<string | null> {
  const url = textVersion.formats.html ?? textVersion.formats.txt;
  if (!url) return null;

  const res = await fetch(url);
  if (!res.ok) return null;

  return await res.text();
}
