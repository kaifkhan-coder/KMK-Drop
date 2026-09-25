import React, { useState } from 'react';
import { Activity, ShieldCheck, Lock, Terminal } from 'lucide-react';
import { NetworkStatus } from '../types';

interface SystemIntegrationHubProps {
  networkStatus: NetworkStatus | null;
  onLockTerminal: () => void;
}

export const SystemIntegrationHub: React.FC<SystemIntegrationHubProps> = ({
  networkStatus,
  onLockTerminal
}) => {
  const [bypassInput, setBypassInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string>('Ready · Micro-HTTP 8080/3000 Active');
  const [isError, setIsError] = useState(false);

  const handleBypassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = bypassInput.trim();
    if (!val) return;

    if (val === 'lock') {
      onLockTerminal();
      setBypassInput('');
      return;
    }

    if (val === 'BuildWithKMKaif') {
      setIsError(false);
      setStatusMessage('✓ Authorization Verified via Bypass · Master Clearance Active');
      setBypassInput('');
      setTimeout(() => setStatusMessage('Ready · Micro-HTTP 8080/3000 Active'), 4000);
      return;
    }

    // Test JWT verification against backend
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: val })
      });
      const data = await res.json();
      if (data.valid) {
        setIsError(false);
        setStatusMessage(`✓ Valid JWT Handshake verified for sub: ${data.payload.sub || 'peer'}`);
      } else {
        setIsError(true);
        setStatusMessage(`✗ Authorization Rejected: ${data.error || 'Invalid Token'}`);
      }
    } catch (err: any) {
      setIsError(true);
      setStatusMessage('✗ Authorization Bypass Error: ' + err.message);
    }
    setBypassInput('');
    setTimeout(() => {
      setStatusMessage('Ready · Micro-HTTP 8080/3000 Active');
      setIsError(false);
    }, 4000);
  };

  const bandwidthBytes = networkStatus?.stats.currentBandwidthBytesPerSec || 0;
  const bandwidthMbps = ((bandwidthBytes * 8) / (1024 * 1024)).toFixed(2);
  const bandwidthMBs = (bandwidthBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 bg-neutral-950 border-t border-neutral-800 text-xs font-mono text-neutral-400 gap-3">
      {/* Running Operations & Telemetry */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-neutral-300 font-sans font-medium">Node:</span>
          <span className="text-cyan-400">{networkStatus?.networkInfo.primaryIpv4 || '127.0.0.1'}</span>
        </div>

        <div className="hidden md:flex items-center gap-1">
          <Terminal className="w-3.5 h-3.5 text-neutral-500" />
          <span className={`${isError ? 'text-red-400' : 'text-neutral-300'}`}>
            {statusMessage}
          </span>
        </div>

        {/* Immediate Bandwidth Speeds */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-neutral-400 font-sans">Bandwidth:</span>
          <span className="text-cyan-300 tabular-nums font-semibold">
            {bandwidthMbps} Mbps
          </span>
          <span className="text-neutral-500 text-[10px]">({bandwidthMBs} MB/s)</span>
        </div>
      </div>

      {/* Secure text input container labeled "Authorization Bypass" */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleBypassSubmit} className="flex items-center gap-2">
          <label htmlFor="auth-bypass" className="text-xs font-sans text-neutral-400 whitespace-nowrap">
            Authorization Bypass:
          </label>
          <input
            id="auth-bypass"
            type="password"
            value={bypassInput}
            onChange={(e) => setBypassInput(e.target.value)}
            placeholder="Key / JWT / 'lock'"
            className="w-36 px-2.5 py-1 text-xs font-mono bg-neutral-900 border border-neutral-800 focus:border-cyan-500/70 rounded text-neutral-200 outline-none placeholder:text-neutral-600 transition-colors"
          />
          <button
            type="submit"
            className="px-2.5 py-1 text-xs font-sans font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors whitespace-nowrap"
          >
            Verify
          </button>
        </form>

        <button
          onClick={onLockTerminal}
          title="Manually lock terminal into stealth mode"
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-sans text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lock</span>
        </button>
      </div>
    </div>
  );
};
