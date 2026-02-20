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
          <div>
            <label className="block text-xs text-chamber-muted mb-1">
              Congress.gov API Key
            </label>
            <input
              type="password"
              value={apiKeys.congressGov}
              onChange={(e) => onUpdate({ ...apiKeys, congressGov: e.target.value })}
              placeholder="api.congress.gov/sign-up"
              className="w-full bg-chamber-bg border border-chamber-border px-3 py-2
                         text-sm text-chamber-text placeholder:text-chamber-muted/40
                         focus:border-chamber-muted focus:outline-none"
            />
            <a
              href="https://api.congress.gov/sign-up/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-chamber-link hover:underline mt-1 inline-block"
            >
              Get a free key
            </a>
          </div>

          <div>
            <label className="block text-xs text-chamber-muted mb-1">
              govinfo API Key
            </label>
            <input
              type="password"
              value={apiKeys.govinfo}
              onChange={(e) => onUpdate({ ...apiKeys, govinfo: e.target.value })}
              placeholder="api.govinfo.gov/docs/signup"
              className="w-full bg-chamber-bg border border-chamber-border px-3 py-2
                         text-sm text-chamber-text placeholder:text-chamber-muted/40
                         focus:border-chamber-muted focus:outline-none"
            />
            <a
              href="https://api.govinfo.gov/docs/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-chamber-link hover:underline mt-1 inline-block"
            >
              Get a free key
            </a>
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
