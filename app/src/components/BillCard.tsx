/**
 * BillCard — Finite Structure
 *
 * Headline, 1 sentence, ≤5 bullets, source button, done state.
 * Anti-flood: no expanding lists, no infinite detail.
 */

import type { Bill } from '../lib/types';

interface BillCardProps {
  bill: Bill;
  selected: boolean;
  onToggle: () => void;
}

export default function BillCard({ bill, selected, onToggle }: BillCardProps) {
  return (
    <div
      className={`border p-4 space-y-2 transition-colors ${
        selected
          ? 'border-chamber-accent bg-chamber-surface'
          : 'border-chamber-border hover:border-chamber-muted'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Bill identifier */}
          <p className="text-[10px] text-chamber-muted font-mono">
            {bill.receiptToken}
          </p>

          {/* Title */}
          <h3 className="text-sm text-chamber-text mt-1 leading-snug">
            {bill.chamber} {bill.number}: {truncate(bill.title, 120)}
          </h3>
        </div>

        {/* Select toggle */}
        <button
          onClick={onToggle}
          className={`shrink-0 w-6 h-6 border text-xs flex items-center justify-center
                     transition-colors cursor-pointer ${
                       selected
                         ? 'border-witnessed text-witnessed'
                         : 'border-chamber-border text-chamber-muted hover:border-chamber-muted'
                     }`}
        >
          {selected ? '✓' : ''}
        </button>
      </div>

      {/* Metadata bullets (max 5) */}
      <div className="space-y-0.5 text-xs text-chamber-muted">
        {bill.policyArea && <p>Policy: {bill.policyArea}</p>}
        {bill.sponsor && <p>Sponsor: {bill.sponsor}</p>}
        {bill.introducedDate && <p>Introduced: {bill.introducedDate}</p>}
        {bill.latestActionText && (
          <p>
            Latest: {truncate(bill.latestActionText, 80)}{' '}
            {bill.latestActionDate && <span className="text-chamber-muted/50">({bill.latestActionDate})</span>}
          </p>
        )}
      </div>

      {/* Source link */}
      <div className="pt-1">
        <a
          href={bill.congressGovUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-chamber-link hover:underline"
        >
          View on Congress.gov →
        </a>
      </div>
    </div>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + '…';
}
