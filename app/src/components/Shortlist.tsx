/**
 * Shortlist — Bill Selection
 *
 * The user curates their corpus from search results.
 * System proposes; user selects. Anti-flood enforced:
 * finite list, clear stopping point.
 */

import type { Bill } from '../lib/types';
import BillCard from './BillCard';

interface ShortlistProps {
  bills: Bill[];
  selected: Set<string>; // receipt tokens
  onToggle: (token: string) => void;
  onProceed: () => void;
  onBack: () => void;
  totalResults: number;
}

export default function Shortlist({
  bills,
  selected,
  onToggle,
  onProceed,
  onBack,
  totalResults,
}: ShortlistProps) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
      {/* Phase Header */}
      <div className="text-center space-y-2">
        <p className="glyph text-2xl">◊</p>
        <h2 className="text-lg tracking-wide text-chamber-accent">Mission: Curate</h2>
        <p className="text-xs text-chamber-muted">
          {bills.length} bills retrieved{totalResults > bills.length ? ` (of ${totalResults} total)` : ''}.
          Select the bills you want to examine.
        </p>
      </div>

      {/* Anti-Flood Notice */}
      {bills.length === 0 && (
        <div className="border border-chamber-border p-4 text-center">
          <p className="text-sm text-chamber-muted">No bills matched your query.</p>
          <button
            onClick={onBack}
            className="mt-3 text-xs text-chamber-link hover:underline cursor-pointer"
          >
            Refine your search
          </button>
        </div>
      )}

      {/* Bill Cards */}
      <div className="space-y-3">
        {bills.map((bill) => (
          <BillCard
            key={bill.receiptToken}
            bill={bill}
            selected={selected.has(bill.receiptToken)}
            onToggle={() => onToggle(bill.receiptToken)}
          />
        ))}
      </div>

      {/* Selection Summary + Proceed */}
      {bills.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-chamber-border">
          <p className="text-xs text-chamber-muted">
            {selected.size} bill{selected.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2 text-xs text-chamber-muted hover:text-chamber-text
                         transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={onProceed}
              disabled={selected.size === 0}
              className="px-4 py-2 border border-chamber-border text-xs text-chamber-accent
                         hover:border-chamber-muted hover:text-chamber-text
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors cursor-pointer"
            >
              Read selected
            </button>
          </div>
        </div>
      )}

      {/* Stopping Point */}
      <div className="text-center pt-4">
        <p className="text-[10px] text-chamber-muted/40">
          ♦ ◊ ♦ End of shortlist ♦ ◊ ♦
        </p>
      </div>
    </div>
  );
}
