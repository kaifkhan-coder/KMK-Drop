import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Smartphone, Download, RefreshCw, Trash2, CheckCircle2, ArrowDownLeft, ExternalLink, QrCode, Maximize2 } from 'lucide-react';
import { ReceivedFileItem } from '../types';
import { EnlargeQrModal } from './EnlargeQrModal';

interface RightSyncPortalProps {
  receivedFiles: ReceivedFileItem[];
  onRefresh: () => void;
  onOpenMobileSimulator: () => void;
  onSimulateUpload: () => void;
}

export const RightSyncPortal: React.FC<RightSyncPortalProps> = ({
  receivedFiles,
  onRefresh,
  onOpenMobileSimulator,
  onSimulateUpload
}) => {
  const [pairingQrUrl, setPairingQrUrl] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobilePortalUrl, setMobilePortalUrl] = useState<string>('');
  const [hostMode, setHostMode] = useState<'cloud' | 'local'>('cloud');
  const [localIpInput, setLocalIpInput] = useState<string>('192.168.1.100:3000');
  const [showNetworkGuide, setShowNetworkGuide] = useState(false);
  const [showEnlargeModal, setShowEnlargeModal] = useState(false);

  useEffect(() => {
    let targetBase = window.location.origin;
    if (hostMode === 'local' && localIpInput.trim()) {
      targetBase = localIpInput.startsWith('http') ? localIpInput : `http://${localIpInput}`;
    }

    const url = `${targetBase}/m`;
    setMobilePortalUrl(url);

    QRCode.toDataURL(url, {
      width: 360,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((qr) => setPairingQrUrl(qr))
      .catch((err) => console.error('Pairing QR generation failed:', err));
  }, [hostMode, localIpInput]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all received file records from PC storage?')) return;
    try {
      await fetch('/api/transfer/received/clear', { method: 'POST' });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div>
          <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <span>Mobile to PC Sync Portal</span>
            <span className="text-[11px] font-mono font-normal text-emerald-400">· Listening on 8080/3000</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Fixed pairing portal for receiving files from mobile cameras and students
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/mobile"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors"
            title="Open mobile landing portal in a new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Open in Tab</span>
          </a>
          <button
            onClick={onOpenMobileSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition-colors shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Launch Phone Simulator</span>
          </button>
        </div>
      </div>

      {/* Top Fixed Pairing QR Container */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-neutral-950 border border-neutral-800 rounded-xl gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-neutral-200">
              Permanent Sync Gateway
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded">
              READY FOR CAMERA SCAN
            </span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Scan this fixed pairing vector using any phone camera to spin up the zero-install micro-HTTP landing interface. Drop local mobile files directly into the desktop PC receiving directory.
          </p>

          {/* QR Host Mode Switcher */}
          <div className="pt-1 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-500 text-[11px]">QR Target:</span>
              <button
                type="button"
                onClick={() => setHostMode('cloud')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  hostMode === 'cloud'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900'
                }`}
              >
                Current Host
              </button>
              <button
                type="button"
                onClick={() => setHostMode('local')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  hostMode === 'local'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900'
                }`}
              >
                Local Wi-Fi IP (Phone Camera)
              </button>
            </div>

            {hostMode === 'local' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-neutral-400">PC IP:</span>
                <input
                  type="text"
                  value={localIpInput}
                  onChange={(e) => setLocalIpInput(e.target.value)}
                  placeholder="e.g. 192.168.1.15:3000"
                  className="px-2 py-1 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded text-neutral-200 outline-none w-48 focus:border-emerald-500"
                />
                <span className="text-[10px] text-neutral-500">Updates QR in real time</span>
              </div>
            )}
          </div>

          {/* URL & Instant actions */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <a
              href={mobilePortalUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors truncate max-w-xs"
            >
              <span className="truncate">{mobilePortalUrl}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>

          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <button
              onClick={onSimulateUpload}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors"
            >
              <span>⚡ Fast Test: Push Mobile Assignment to PC</span>
            </button>
            <button
              onClick={() => setShowNetworkGuide(!showNetworkGuide)}
              className="text-[11px] text-neutral-400 hover:text-cyan-300 underline transition-colors"
            >
              {showNetworkGuide ? 'Hide Scanner Help' : 'QR Scan Error Help'}
            </button>
          </div>

          {showNetworkGuide && (
            <div className="mt-2 p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs space-y-1 text-neutral-300">
              <div className="font-semibold text-cyan-300">Why does scanning give an error?</div>
              <p className="text-[11px] text-neutral-400">
                1. <strong>Cloud Sandboxes</strong>: AI Studio preview domains (<code className="font-mono text-neutral-300">ais-dev-*.run.app</code>) are authenticated behind Google login cookies. External mobile cameras cannot open them without Google dev authorization.
              </p>
              <p className="text-[11px] text-neutral-400">
                2. <strong>Instant Solution</strong>: Click <strong className="text-white">"Open in Tab"</strong> or <strong className="text-white">"Launch Phone Simulator"</strong> above to test right now with zero friction!
              </p>
              <p className="text-[11px] text-neutral-400">
                3. <strong>For Physical Phone over Wi-Fi</strong>: Select <strong className="text-white">"Local Wi-Fi IP"</strong> and enter your machine's Wi-Fi address (like <code className="font-mono text-neutral-300">192.168.1.15:3000</code>).
              </p>
            </div>
          )}
        </div>

        {/* Pairing Vector QR */}
        <div className="flex flex-col items-center shrink-0 space-y-1.5">
          {pairingQrUrl ? (
            <div
              onClick={() => setShowEnlargeModal(true)}
              className="relative group p-2.5 bg-white rounded-xl shadow-md border-2 border-white cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all"
              title="Click to enlarge QR Code for phone camera"
            >
              <img
                src={pairingQrUrl}
                alt="Permanent Pairing QR"
                className="w-36 h-36 object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="absolute inset-0 bg-neutral-900/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white font-medium text-xs transition-opacity">
                <Maximize2 className="w-4 h-4 text-emerald-300" />
                <span>Enlarge</span>
              </div>
            </div>
          ) : (
            <div className="w-36 h-36 bg-neutral-900 rounded-lg flex items-center justify-center">
              <QrCode className="w-8 h-8 text-neutral-600 animate-pulse" />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEnlargeModal(true)}
              className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-medium px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:border-emerald-800 transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Full Screen QR</span>
            </button>
          </div>

          <span className="text-[10px] text-neutral-500 font-mono">
            {hostMode === 'local' ? 'LAN Wi-Fi Vector' : 'Permanent Pairing Matrix'}
          </span>
        </div>
      </div>

      {/* Enlarge QR Modal */}
      {showEnlargeModal && pairingQrUrl && (
        <EnlargeQrModal
          title="Mobile to PC Sync Portal QR"
          subtitle="Scan with any smartphone camera to open the instant mobile file upload portal"
          qrDataUrl={pairingQrUrl}
          targetUrl={mobilePortalUrl}
          onClose={() => setShowEnlargeModal(false)}
        />
      )}

      {/* Incoming Mobile Sync Ledger */}
      <div className="flex flex-col bg-neutral-950 border border-neutral-800 rounded-lg p-3 flex-1 overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-neutral-300">
              Files Received from Mobile Devices ({receivedFiles.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              title="Refresh received files ledger"
              className="p-1 text-neutral-400 hover:text-neutral-200 rounded transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            {receivedFiles.length > 0 && (
              <button
                onClick={handleClearHistory}
                title="Clear received ledger"
                className="p-1 text-neutral-500 hover:text-red-400 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {receivedFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-2">
              <Smartphone className="w-8 h-8 text-neutral-700" />
              <div className="text-xs">No files received from mobile peers yet.</div>
              <p className="text-[11px] text-neutral-600 max-w-xs">
                Scan the QR code above or click "Launch Phone Simulator" to send files from mobile.
              </p>
            </div>
          ) : (
            receivedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2.5 rounded bg-neutral-900/80 border border-neutral-800 text-xs hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <div className="font-mono text-neutral-200 font-medium truncate">
                      {file.originalName}
                    </div>
                    <div className="text-[10px] text-neutral-500 flex items-center gap-2">
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      <span>·</span>
                      <span>Node: {file.senderIp}</span>
                      <span>·</span>
                      <span>{new Date(file.receivedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <a
                    href={`/api/transfer/received/download/${file.id}`}
                    download={file.originalName}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 transition-colors"
                  >
                    <Download className="w-3 h-3 text-cyan-400" />
                    <span>Save to PC</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
