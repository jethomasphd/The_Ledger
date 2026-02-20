/**
 * Settings — The Quiet Drawer
 *
 * Minimal. No personalization theater.
 * API keys stay client-side.
 */

import type { ApiKeys } from '../lib/types';

interface SettingsProps {
  apiKeys: ApiKeys;
  onUpdate: (keys: ApiKeys) => void;
  onClose: () => void;
}

export default function Settings({ apiKeys, onUpdate, onClose }: SettingsProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-chamber-surface border border-chamber-border max-w-md w-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm tracking-wide text-chamber-accent">Settings</h2>
          <button
            onClick={onClose}
            className="text-chamber-muted hover:text-chamber-text text-xs cursor-pointer"
          >
            close
          </button>
        </div>

        <p className="text-xs text-chamber-muted leading-relaxed">
          API keys are stored only in your browser&apos;s local storage.
          They are sent directly to the respective government APIs.
          No server intermediary.
        </p>

        <div className="space-y-4">
          <p className="text-xs text-chamber-muted leading-relaxed">
            Both APIs use the same key from{' '}
            <a
              href="https://api.data.gov/signup/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-chamber-link hover:underline"
            >
              api.data.gov/signup
            </a>
            . One registration gives you a key that works for both Congress.gov and govinfo.
          </p>

          <div>
            <label className="block text-xs text-chamber-muted mb-1">
              Congress.gov API Key
            </label>
            <input
              type="password"
              value={apiKeys.congressGov}
              onChange={(e) => onUpdate({ ...apiKeys, congressGov: e.target.value })}
              placeholder="Your api.data.gov key"
              className="w-full bg-chamber-bg border border-chamber-border px-3 py-2
                         text-sm text-chamber-text placeholder:text-chamber-muted/40
                         focus:border-chamber-muted focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-chamber-muted mb-1">
              govinfo API Key
            </label>
            <input
              type="password"
              value={apiKeys.govinfo}
              onChange={(e) => onUpdate({ ...apiKeys, govinfo: e.target.value })}
              placeholder="Same key works here"
              className="w-full bg-chamber-bg border border-chamber-border px-3 py-2
                         text-sm text-chamber-text placeholder:text-chamber-muted/40
                         focus:border-chamber-muted focus:outline-none"
            />
          </div>
        </div>

        <p className="text-[10px] text-chamber-muted/50">
          Keys never leave your browser. The Ledger has no analytics, no tracking,
          no server-side storage.
        </p>
      </div>
    </div>
  );
}
