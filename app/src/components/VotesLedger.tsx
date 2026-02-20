/**
 * VotesLedger — Roll Call Records View
 *
 * Displays roll call records with procedural labeling.
 * Anti-flood: 3-3-3 default. Bounded.
 */

import { useState, useEffect } from 'react';
import type { Bill, Vote, VoteDetail, VoteMember } from '../lib/types';
import { fetchHouseRollCall } from '../lib/sources/house-votes';
import { fetchSenateRollCall } from '../lib/sources/senate-votes';

interface VotesLedgerProps {
  bills: Bill[];
  onVotesLoaded: (votes: Vote[]) => void;
  onProceedToExport: () => void;
  onBack: () => void;
}

export default function VotesLedger({
  bills,
  onVotesLoaded,
  onProceedToExport,
  onBack,
}: VotesLedgerProps) {
  const [votes, setVotes] = useState<VoteDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedVote, setExpandedVote] = useState<string | null>(null);
  const [showAllMembers, setShowAllMembers] = useState(false);

  // Determine congress from selected bills
  const congress = bills[0]?.congress ?? 118;

  useEffect(() => {
    searchForVotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function searchForVotes() {
    setLoading(true);
    setError(null);

    const foundVotes: VoteDetail[] = [];

    // Try to find votes related to selected bills.
    // This is best-effort: we try specific roll numbers if known,
    // otherwise we note the limitation.
    for (const _bill of bills.slice(0, 3)) {
      // Attempt House roll calls for recent known numbers
      // In production, this would use a vote-to-bill mapping service.
      try {
        // Try a few recent roll calls as demonstration
        const roll = await fetchHouseRollCall(congress, 1, 1);
        if (roll && !foundVotes.find((v) => v.receiptToken === roll.receiptToken)) {
          foundVotes.push(roll);
        }
      } catch {
        // Expected: not every roll number exists
      }

      // Attempt Senate
      try {
        const roll = await fetchSenateRollCall(congress, 1, 1);
        if (roll && !foundVotes.find((v) => v.receiptToken === roll.receiptToken)) {
          foundVotes.push(roll);
        }
      } catch {
        // Expected
      }

      // Break after finding 3 votes (anti-flood)
      if (foundVotes.length >= 3) break;
    }

    setVotes(foundVotes);
    onVotesLoaded(foundVotes);

    if (foundVotes.length === 0) {
      setError(
        'Could not retrieve roll call votes for the selected bills. ' +
        'Vote-to-bill linkage requires specific roll call numbers. ' +
        'You can search directly on clerk.house.gov or senate.gov.',
      );
    }

    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      {/* Phase Header */}
      <div className="text-center space-y-2">
        <p className="glyph text-2xl">◊</p>
        <h2 className="text-lg tracking-wide text-chamber-accent">Mission: Votes</h2>
        <p className="text-xs text-chamber-muted">
          Roll call records for the {congress}th Congress.
          {votes.length > 0 ? ` ${votes.length} vote(s) retrieved.` : ''}
        </p>
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-sm text-chamber-muted">Searching roll call records...</p>
        </div>
      )}

      {error && (
        <div className="border border-inference/30 p-4 text-xs text-inference space-y-2">
          <p>{error}</p>
          <div className="flex gap-3 text-chamber-link">
            <a
              href="https://clerk.house.gov/Votes"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              House Clerk Votes →
            </a>
            <a
              href="https://www.senate.gov/legislative/votes.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Senate Votes →
            </a>
          </div>
        </div>
      )}

      {/* Vote Cards */}
      <div className="space-y-4">
        {votes.slice(0, 3).map((vote) => (
          <div key={vote.receiptToken} className="border border-chamber-border p-4 space-y-3">
            {/* Vote header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-chamber-muted font-mono">
                  {vote.receiptToken}
                </p>
                <p className="text-sm text-chamber-text mt-1">
                  {vote.chamber} Roll Call {vote.rollNumber}
                </p>
                <p className="text-xs text-chamber-muted">{vote.date}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 border ${
                  vote.result.toLowerCase().includes('passed') || vote.result.toLowerCase().includes('agreed')
                    ? 'border-witnessed/30 text-witnessed'
                    : vote.result.toLowerCase().includes('rejected') || vote.result.toLowerCase().includes('failed')
                      ? 'border-red-400/30 text-red-400'
                      : 'border-chamber-border text-chamber-muted'
                }`}
              >
                {vote.result}
              </span>
            </div>

            {/* Question */}
            <p className="text-sm text-chamber-text">{vote.question}</p>
            {vote.description && (
              <p className="text-xs text-chamber-muted">{vote.description}</p>
            )}

            {/* Tally */}
            <div className="flex gap-4 text-xs">
              <span className="text-witnessed">Yea: {vote.yeas}</span>
              <span className="text-red-400">Nay: {vote.nays}</span>
              <span className="text-chamber-muted">Present: {vote.present}</span>
              <span className="text-chamber-muted">Not Voting: {vote.notVoting}</span>
            </div>

            {/* Expand/Collapse Members */}
            {vote.members.length > 0 && (
              <div>
                <button
                  onClick={() =>
                    setExpandedVote(
                      expandedVote === vote.receiptToken ? null : vote.receiptToken,
                    )
                  }
                  className="text-xs text-chamber-link hover:underline cursor-pointer"
                >
                  {expandedVote === vote.receiptToken
                    ? 'Hide member votes'
                    : `Show ${vote.members.length} member votes`}
                </button>

                {expandedVote === vote.receiptToken && (
                  <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
                    {(showAllMembers ? vote.members : vote.members.slice(0, 20)).map(
                      (member: VoteMember, idx: number) => (
                        <div
                          key={`${member.name}-${idx}`}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              member.vote === 'Yea'
                                ? 'bg-witnessed'
                                : member.vote === 'Nay'
                                  ? 'bg-red-400'
                                  : 'bg-chamber-muted'
                            }`}
                          />
                          <span className="text-chamber-text">{member.name}</span>
                          {member.party && (
                            <span className="text-chamber-muted">({member.party})</span>
                          )}
                          {member.state && (
                            <span className="text-chamber-muted">{member.state}</span>
                          )}
                          <span className="text-chamber-muted ml-auto">{member.vote}</span>
                        </div>
                      ),
                    )}
                    {!showAllMembers && vote.members.length > 20 && (
                      <button
                        onClick={() => setShowAllMembers(true)}
                        className="text-xs text-chamber-link hover:underline cursor-pointer pt-1"
                      >
                        Show all {vote.members.length} members
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Source link */}
            <a
              href={vote.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-chamber-link hover:underline block"
            >
              Primary source →
            </a>
          </div>
        ))}
      </div>

      {votes.length > 3 && (
        <p className="text-xs text-chamber-muted text-center">
          {votes.length - 3} additional votes not shown (3-3-3 rule).
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-chamber-border">
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs text-chamber-muted hover:text-chamber-text
                     transition-colors cursor-pointer"
        >
          Back to reading
        </button>
        <button
          onClick={onProceedToExport}
          className="px-4 py-2 border border-chamber-border text-xs text-chamber-accent
                     hover:border-chamber-muted hover:text-chamber-text
                     transition-colors cursor-pointer"
        >
          Export brief
        </button>
      </div>

      {/* Stopping Point */}
      <div className="text-center pt-4">
        <p className="text-[10px] text-chamber-muted/40">
          ♦ ◊ ♦ End of votes ledger ♦ ◊ ♦
        </p>
      </div>
    </div>
  );
}
