import React from 'react';
import { X, Shield, Network, KeyRound } from 'lucide-react';
import { NetworkStatus } from '../types';

interface SettingsModalProps {
  stealthShield: boolean;
  onToggleStealthShield: (enabled: boolean) => void;
  networkStatus: NetworkStatus | null;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  stealthShield,
  onToggleStealthShield,
  networkStatus,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Execution Governance &amp; Security Settings</h3>
              <p className="text-xs text-neutral-400">Master runtime controls and network interfaces</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stealth Shield Master Switch */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                  <span>Stealth Shield</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      stealthShield ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/60' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {stealthShield ? 'ACTIVE' : 'BYPASSED'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  When turned <strong className="text-neutral-200">ON</strong>, the application will always require the secret code entry (<code className="font-mono text-cyan-400">BuildWithKMKaif</code>) on launch. When turned <strong className="text-neutral-200">OFF</strong>, the app bypasses the lock screen and opens directly to the dashboard.
                </p>
              </div>

              {/* Master Switch Widget */}
              <button
                type="button"
                onClick={() => onToggleStealthShield(!stealthShield)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  stealthShield ? 'bg-cyan-500' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    stealthShield ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Network Interface Scanning */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <Network className="w-4 h-4 text-cyan-400" />
              <span>Isolated Local Network Interfaces</span>
            </div>
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono space-y-1.5 max-h-36 overflow-y-auto text-neutral-400">
              <div className="flex justify-between text-neutral-200 pb-1 border-b border-neutral-800">
                <span>Primary IPv4 Node:</span>
                <span className="text-cyan-400 font-semibold">{networkStatus?.networkInfo.primaryIpv4 || '127.0.0.1'}</span>
              </div>
              <div className="flex justify-between">
                <span>Micro-HTTP Port:</span>
                <span className="text-neutral-300">3000 (Node) / 8080 (Java)</span>
              </div>
              <div className="flex justify-between">
                <span>Host Platform:</span>
                <span className="text-neutral-300">{networkStatus?.networkInfo.platform || 'linux'} ({networkStatus?.networkInfo.hostname})</span>
              </div>
              {networkStatus?.networkInfo.interfaces && networkStatus.networkInfo.interfaces.map((iface, i) => (
                <div key={i} className="flex justify-between text-[11px] text-neutral-500 pt-1">
                  <span>NIC {iface.name}:</span>
                  <span>{iface.address}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Master Authorization Token */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>HMAC-SHA256 Peer Handshake Token</span>
            </div>
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-400 select-all break-all">
              <span className="text-neutral-500">// Auto-verified JWT Secret Envelope:</span>
              <div className="text-amber-300/90 mt-1">
                KaifDrop_Secure_Master_Key_2026_KMK (HMAC-SHA256 Active)
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-900 bg-neutral-200 hover:bg-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
