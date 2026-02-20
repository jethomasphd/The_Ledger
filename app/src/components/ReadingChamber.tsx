/**
 * ReadingChamber — Split-Pane Reading View
 *
 * Primary text visible (or one click away).
 * Guided interpretation on the side.
 * The user touches the record.
 */

import { useState, useEffect } from 'react';
import type { Bill, Action, TextVersion, ApiKeys } from '../lib/types';
import { getBillActions, getBillDetail } from '../lib/sources/congress';
import { getBillTextVersions, fetchBillTextHtml } from '../lib/sources/govinfo';

interface ReadingChamberProps {
  bills: Bill[];
  apiKeys: ApiKeys;
  onActionsLoaded: (actions: Action[]) => void;
  onTextVersionsLoaded: (versions: TextVersion[]) => void;
  onProceedToVotes: () => void;
  onBack: () => void;
}

export default function ReadingChamber({
  bills,
  apiKeys,
  onActionsLoaded,
  onTextVersionsLoaded,
  onProceedToVotes,
  onBack,
}: ReadingChamberProps) {
  const [activeBillIndex, setActiveBillIndex] = useState(0);
  const [billDetail, setBillDetail] = useState<Bill | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [textVersions, setTextVersions] = useState<TextVersion[]>([]);
  const [billText, setBillText] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'text' | 'actions'>('summary');

  const bill = bills[activeBillIndex];

  useEffect(() => {
    if (!bill) return;
    loadBillData(bill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBillIndex]);

  async function loadBillData(b: Bill) {
    setLoadingDetail(true);
    setBillText(null);
    setActions([]);
    setTextVersions([]);
    setActiveTab('summary');
    setShowAllActions(false);

    try {
      // Fetch detail and actions from Congress.gov
      if (apiKeys.congressGov) {
        const [detail, acts] = await Promise.all([
          getBillDetail(b.congress, b.chamber, b.number, apiKeys.congressGov),
          getBillActions(b.congress, b.chamber, b.number, apiKeys.congressGov),
        ]);
        setBillDetail(detail);
        setActions(acts);
        onActionsLoaded(acts);
      }

      // Fetch text versions from govinfo
      if (apiKeys.govinfo) {
        const versions = await getBillTextVersions(
          b.congress,
          b.chamber,
          b.number,
          apiKeys.govinfo,
        );
        setTextVersions(versions);
        onTextVersionsLoaded(versions);
      }
    } catch {
      // Errors are non-fatal for reading chamber
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadTextContent(version: TextVersion) {
    setLoadingText(true);
    try {
      const html = await fetchBillTextHtml(version);
      setBillText(html);
      setActiveTab('text');
    } catch {
      setBillText(null);
    } finally {
      setLoadingText(false);
    }
  }

  if (!bill) return null;

  const displayBill = billDetail ?? bill;
  const displayActions = showAllActions ? actions : actions.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
      {/* Phase Header */}
      <div className="text-center space-y-2">
        <p className="glyph text-2xl">◊</p>
        <h2 className="text-lg tracking-wide text-chamber-accent">Mission: Read</h2>
      </div>

      {/* Bill Selector (if multiple) */}
      {bills.length > 1 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {bills.map((b, idx) => (
            <button
              key={b.receiptToken}
              onClick={() => setActiveBillIndex(idx)}
              className={`px-3 py-1 text-xs border transition-colors cursor-pointer ${
                idx === activeBillIndex
                  ? 'border-chamber-accent text-chamber-accent'
                  : 'border-chamber-border text-chamber-muted hover:text-chamber-text'
              }`}
            >
              {b.chamber} {b.number}
            </button>
          ))}
        </div>
      )}

      {loadingDetail ? (
        <div className="text-center py-12">
          <p className="text-sm text-chamber-muted">Loading bill details...</p>
        </div>
      ) : (
        /* Split Pane */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Primary Source */}
          <div className="border border-chamber-border p-4 space-y-4 min-h-[400px]">
            <div className="flex items-center gap-2 border-b border-chamber-border pb-2">
              <button
                onClick={() => setActiveTab('summary')}
                className={`text-xs px-2 py-1 cursor-pointer ${
                  activeTab === 'summary' ? 'text-chamber-text' : 'text-chamber-muted'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`text-xs px-2 py-1 cursor-pointer ${
                  activeTab === 'text' ? 'text-chamber-text' : 'text-chamber-muted'
                }`}
              >
                Full Text
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`text-xs px-2 py-1 cursor-pointer ${
                  activeTab === 'actions' ? 'text-chamber-text' : 'text-chamber-muted'
                }`}
              >
                Actions ({actions.length})
              </button>
            </div>

            {activeTab === 'summary' && (
              <div className="reading-prose text-sm space-y-3">
                {displayBill.summaryText ? (
                  <div dangerouslySetInnerHTML={{ __html: displayBill.summaryText }} />
                ) : (
                  <p className="text-chamber-muted italic">
                    No summary available. View the full text or visit Congress.gov.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-3">
                {textVersions.length > 0 && !billText && (
                  <div className="space-y-2">
                    <p className="text-xs text-chamber-muted">Available text versions:</p>
                    {textVersions.map((v) => (
                      <button
                        key={v.receiptToken}
                        onClick={() => loadTextContent(v)}
                        className="block w-full text-left border border-chamber-border p-2
                                   text-xs hover:border-chamber-muted transition-colors cursor-pointer"
                      >
                        <span className="text-chamber-text">{v.versionLabel}</span>
                        {v.date && (
                          <span className="text-chamber-muted ml-2">({v.date})</span>
                        )}
                        <span className="text-[10px] text-chamber-muted/50 block mt-0.5">
                          {v.receiptToken}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {loadingText && (
                  <p className="text-sm text-chamber-muted">Loading bill text...</p>
                )}

                {billText && (
                  <div
                    className="reading-prose text-sm max-h-[60vh] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: billText }}
                  />
                )}

                {textVersions.length === 0 && !billText && (
                  <div className="text-center py-8">
                    <p className="text-xs text-chamber-muted mb-2">
                      {apiKeys.govinfo
                        ? 'No text versions found via govinfo.'
                        : 'Add a govinfo API key to load bill text.'}
                    </p>
                    <a
                      href={`${displayBill.congressGovUrl}/text`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-chamber-link hover:underline"
                    >
                      Read text on Congress.gov →
                    </a>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-2">
                {displayActions.map((action) => (
                  <div
                    key={action.receiptToken}
                    className="border-l-2 border-chamber-border pl-3 py-1"
                  >
                    <p className="text-xs text-chamber-muted">{action.actionDate}</p>
                    <p className="text-sm text-chamber-text">{action.text}</p>
                    {action.committee && (
                      <p className="text-xs text-chamber-muted">Committee: {action.committee}</p>
                    )}
                    <p className="text-[10px] text-chamber-muted/50 font-mono mt-0.5">
                      {action.receiptToken}
                    </p>
                  </div>
                ))}

                {actions.length > 3 && !showAllActions && (
                  <button
                    onClick={() => setShowAllActions(true)}
                    className="text-xs text-chamber-link hover:underline cursor-pointer"
                  >
                    Show all {actions.length} actions
                  </button>
                )}

                {actions.length === 0 && (
                  <p className="text-xs text-chamber-muted italic">No actions loaded.</p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Guide Panel */}
          <div className="border border-chamber-border p-4 space-y-4">
            <h3 className="text-xs text-chamber-muted tracking-wide uppercase">
              Guide
            </h3>

            {/* Bill Identity */}
            <div className="space-y-1">
              <p className="text-sm text-chamber-text font-medium">
                {displayBill.chamber} {displayBill.number}
              </p>
              <p className="text-sm text-chamber-text leading-snug">{displayBill.title}</p>
            </div>

            {/* Key Facts */}
            <div className="space-y-1 text-xs text-chamber-muted">
              {displayBill.sponsor && <p>Sponsor: {displayBill.sponsor}</p>}
              {displayBill.introducedDate && <p>Introduced: {displayBill.introducedDate}</p>}
              {displayBill.policyArea && <p>Policy Area: {displayBill.policyArea}</p>}
              {displayBill.latestActionText && (
                <p>Latest Action: {displayBill.latestActionText}</p>
              )}
            </div>

            {/* Receipt */}
            <div className="border-t border-chamber-border pt-3 space-y-1">
              <p className="text-[10px] text-chamber-muted uppercase tracking-wider">
                Receipt
              </p>
              <p className="text-xs font-mono receipt-witnessed">
                {displayBill.receiptToken}
              </p>
              <p className="text-[10px] text-chamber-muted">Evidence: WITNESSED</p>
            </div>

            {/* Primary Source Link */}
            <div className="border-t border-chamber-border pt-3">
              <a
                href={displayBill.congressGovUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-chamber-link hover:underline"
              >
                Congress.gov primary source →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-chamber-border">
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs text-chamber-muted hover:text-chamber-text
                     transition-colors cursor-pointer"
        >
          Back to shortlist
        </button>
        <button
          onClick={onProceedToVotes}
          className="px-4 py-2 border border-chamber-border text-xs text-chamber-accent
                     hover:border-chamber-muted hover:text-chamber-text
                     transition-colors cursor-pointer"
        >
          View votes
        </button>
      </div>

      {/* Stopping Point */}
      <div className="text-center pt-4">
        <p className="text-[10px] text-chamber-muted/40">
          ♦ ◊ ♦ End of reading chamber ♦ ◊ ♦
        </p>
      </div>
    </div>
  );
}
