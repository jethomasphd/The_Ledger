/**
 * SearchMission — Question Input + Strategy Display
 *
 * The user poses a question. The system proposes retrieval
 * strategies. The user sees exactly what will happen before
 * anything happens. Methods are visible.
 */

import { useState } from 'react';
import type { ApiKeys, Bill } from '../lib/types';
import { searchBills } from '../lib/sources/congress';
import type { ProvenanceLog } from '../lib/types';
import { recordStrategy } from '../lib/provenance';

interface SearchMissionProps {
  apiKeys: ApiKeys;
  provenance: ProvenanceLog;
  onResults: (bills: Bill[], provenance: ProvenanceLog) => void;
  onSettingsOpen: () => void;
}

interface StrategyPlan {
  id: string;
  label: string;
  description: string;
  source: string;
  enabled: boolean;
}

export default function SearchMission({
  apiKeys,
  provenance,
  onResults,
  onSettingsOpen,
}: SearchMissionProps) {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<'input' | 'strategies' | 'searching'>('input');
  const [strategies, setStrategies] = useState<StrategyPlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hasCongressKey = apiKeys.congressGov.length > 0;

  function proposeStrategies() {
    if (!query.trim()) return;

    const proposed: StrategyPlan[] = [];

    if (hasCongressKey) {
      proposed.push({
        id: 'congress-keyword',
        label: 'Congress.gov Keyword Search',
        description: `Search bills matching "${query.trim()}" via Congress.gov API`,
        source: 'Congress.gov API',
        enabled: true,
      });

      // Check if query looks like a bill number
      const billMatch = query.trim().match(/^(HR|S|HJRES|SJRES|HCONRES|SCONRES|HRES|SRES)\s*(\d+)$/i);
      if (billMatch) {
        proposed.push({
          id: 'congress-direct',
          label: 'Direct Bill Lookup',
          description: `Fetch ${billMatch[1].toUpperCase()} ${billMatch[2]} directly`,
          source: 'Congress.gov API',
          enabled: true,
        });
      }
    }

    if (proposed.length === 0) {
      proposed.push({
        id: 'no-keys',
        label: 'No API Keys Configured',
        description: 'Configure at least a Congress.gov API key to search bills',
        source: 'None',
        enabled: false,
      });
    }

    setStrategies(proposed);
    setPhase('strategies');
  }

  async function executeStrategies() {
    setPhase('searching');
    setError(null);

    const enabledStrategies = strategies.filter((s) => s.enabled);
    let allBills: Bill[] = [];
    let updatedProvenance = { ...provenance, query: query.trim() };

    for (const strat of enabledStrategies) {
      try {
        if (strat.id === 'congress-keyword') {
          const result = await searchBills(query.trim(), apiKeys.congressGov, { limit: 10 });
          allBills = [...allBills, ...result.bills];

          updatedProvenance = recordStrategy(updatedProvenance, {
            label: strat.label,
            description: strat.description,
            source: strat.source,
            endpoint: 'https://api.congress.gov/v3/bill',
            parametersUsed: { query: query.trim(), limit: '10' },
            success: true,
            resultCount: result.total,
          });
        }
        if (strat.id === 'congress-direct') {
          const billMatch = query.trim().match(/^(HR|S|HJRES|SJRES|HCONRES|SCONRES|HRES|SRES)\s*(\d+)$/i);
          if (billMatch) {
            const result = await searchBills(
              `${billMatch[1]} ${billMatch[2]}`,
              apiKeys.congressGov,
              { limit: 5 },
            );
            // Deduplicate by receipt token
            const existing = new Set(allBills.map((b) => b.receiptToken));
            for (const bill of result.bills) {
              if (!existing.has(bill.receiptToken)) {
                allBills.push(bill);
              }
            }

            updatedProvenance = recordStrategy(updatedProvenance, {
              label: strat.label,
              description: strat.description,
              source: strat.source,
              endpoint: 'https://api.congress.gov/v3/bill',
              parametersUsed: { query: `${billMatch[1]} ${billMatch[2]}`, limit: '5' },
              success: true,
              resultCount: result.total,
            });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        updatedProvenance = recordStrategy(updatedProvenance, {
          label: strat.label,
          description: strat.description,
          source: strat.source,
          endpoint: strat.id === 'congress-keyword' ? 'https://api.congress.gov/v3/bill' : '',
          parametersUsed: { query: query.trim() },
          success: false,
          resultCount: 0,
        });
      }
    }

    onResults(allBills, updatedProvenance);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
      {/* Mission Header */}
      <div className="text-center space-y-2">
        <p className="glyph text-2xl">◊</p>
        <h2 className="text-lg tracking-wide text-chamber-accent">Mission: Search</h2>
        <p className="text-xs text-chamber-muted">
          Pose a question about federal legislation. The system will propose retrieval strategies.
        </p>
      </div>

      {/* Query Input */}
      {phase === 'input' && (
        <div className="space-y-4">
          {!hasCongressKey && (
            <div className="border border-inference/30 p-3 text-xs text-inference">
              No API key configured.{' '}
              <button onClick={onSettingsOpen} className="underline cursor-pointer">
                Open settings
              </button>{' '}
              to add your Congress.gov API key.
            </div>
          )}

          <div>
            <label className="block text-xs text-chamber-muted mb-2">
              What do you want to find in the public record?
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && proposeStrategies()}
              placeholder="e.g. &quot;data privacy&quot; or &quot;HR 1&quot;"
              className="w-full bg-chamber-bg border border-chamber-border px-4 py-3
                         text-sm text-chamber-text placeholder:text-chamber-muted/40
                         focus:border-chamber-muted focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={proposeStrategies}
              disabled={!query.trim()}
              className="px-4 py-2 border border-chamber-border text-xs text-chamber-accent
                         hover:border-chamber-muted hover:text-chamber-text
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors cursor-pointer"
            >
              Propose strategies
            </button>
          </div>
        </div>
      )}

      {/* Strategy Display */}
      {phase === 'strategies' && (
        <div className="space-y-4">
          <p className="text-xs text-chamber-muted">
            The following retrieval strategies are proposed for your query.
            You may enable or disable each before executing.
          </p>

          <div className="space-y-2">
            {strategies.map((strat) => (
              <div
                key={strat.id}
                className="border border-chamber-border p-3 flex items-start gap-3"
              >
                <input
                  type="checkbox"
                  checked={strat.enabled}
                  onChange={(e) =>
                    setStrategies((prev) =>
                      prev.map((s) =>
                        s.id === strat.id ? { ...s, enabled: e.target.checked } : s,
                      ),
                    )
                  }
                  className="mt-1 accent-chamber-accent"
                  disabled={strat.id === 'no-keys'}
                />
                <div>
                  <p className="text-sm text-chamber-text">{strat.label}</p>
                  <p className="text-xs text-chamber-muted">{strat.description}</p>
                  <p className="text-[10px] text-chamber-muted/50 mt-1">Source: {strat.source}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setPhase('input')}
              className="px-4 py-2 text-xs text-chamber-muted hover:text-chamber-text
                         transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={executeStrategies}
              disabled={!strategies.some((s) => s.enabled && s.id !== 'no-keys')}
              className="px-4 py-2 border border-chamber-border text-xs text-chamber-accent
                         hover:border-chamber-muted hover:text-chamber-text
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors cursor-pointer"
            >
              Execute
            </button>
          </div>
        </div>
      )}

      {/* Searching State */}
      {phase === 'searching' && (
        <div className="text-center space-y-4">
          <p className="text-sm text-chamber-muted">Retrieving from primary sources...</p>
          {error && (
            <div className="border border-red-500/30 p-3 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
