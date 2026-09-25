import React, { useState, useEffect } from 'react';
import { Smartphone, Upload, CheckCircle2, AlertCircle, FileText, Download, ArrowLeft, RefreshCw } from 'lucide-react';

export const MobilePortalPage: React.FC = () => {
  const query = new URLSearchParams(window.location.search);
  const targetUser = query.get('user') || 'usr_alpha';
  const pkgId = query.get('pkg') || '';

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>(pkgId ? `/api/transfer/download/${pkgId}` : '');

  useEffect(() => {
    // If opened with a specific package ID, check for public bridge or cached download
    if (pkgId) {
      fetch(`/api/transfer/public-bridge/${pkgId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.publicBridgeUrl) {
            setDownloadUrl(data.publicBridgeUrl);
          }
        })
        .catch(() => {});
    }
  }, [pkgId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setStatusMessage(null);
    }
    if (e.target) e.target.value = '';
  };

  const handleRemove = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setStatusMessage({ text: 'Streaming assets to desktop PC...', type: 'info' });

    try {
      const formData = new FormData();
      formData.append('userId', targetUser);
      selectedFiles.forEach((f) => formData.append('files', f));

      let uploadSuccess = false;

      // 1. Try server endpoint
      try {
        const res = await fetch('/api/transfer/upload', {
          method: 'POST',
          headers: { 'x-user-id': targetUser },
          body: formData
        });
        if (res.ok) {
          uploadSuccess = true;
        }
      } catch (_) {}

      // 2. Fallback to client broadcast and local storage (for Vercel / serverless deployments)
      if (!uploadSuccess) {
        try {
          const recItems = selectedFiles.map(f => ({
            id: 'rec_' + Math.random().toString(36).substring(2, 9),
            userId: targetUser,
            name: f.name,
            size: f.size,
            receivedAt: Date.now(),
            senderIp: 'Mobile Phone (Vercel Edge)',
            mimeType: f.type || 'application/octet-stream',
            downloadUrl: URL.createObjectURL(f)
          }));

          const storageKey = `kaifdrop_received_${targetUser}`;
          const existingRaw = localStorage.getItem(storageKey);
          const existing = existingRaw ? JSON.parse(existingRaw) : [];
          localStorage.setItem(storageKey, JSON.stringify([...recItems, ...existing]));

          // Broadcast to desktop tabs
          try {
            const bc = new BroadcastChannel('kaifdrop_sync_channel');
            bc.postMessage({ type: 'FILES_RECEIVED', userId: targetUser, files: recItems });
            bc.close();
          } catch (_) {}

          uploadSuccess = true;
        } catch (_) {}
      }

      if (uploadSuccess) {
        setStatusMessage({ text: `✓ Sent ${selectedFiles.length} file(s) to ${targetUser}!`, type: 'success' });
        setSelectedFiles([]);
      } else {
        throw new Error('Failed to transmit files.');
      }
    } catch (err: any) {
      setStatusMessage({ text: 'Transfer error: ' + (err.message || 'Transmission failed'), type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-between p-4 max-w-md mx-auto">
      {/* Top Header */}
      <div className="w-full text-center pt-2 pb-4 border-b border-neutral-800">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-xs font-mono text-cyan-300 mb-2">
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>KaifDrop Mobile Portal</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">KaifDrop-Secure Peer</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Connected to Workstation Channel:{' '}
          <span className="font-mono text-cyan-400 font-semibold">{targetUser}</span>
        </p>
      </div>

      {/* Main Content Area */}
      <div className="w-full flex-1 py-4 space-y-4">
        {/* If package is available for download */}
        {pkgId && (
          <div className="p-4 rounded-xl bg-neutral-900 border border-cyan-500/40 shadow-lg space-y-2.5">
            <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold">
              <Download className="w-4 h-4" />
              <span>Incoming File from Desktop</span>
            </div>
            <p className="text-xs text-neutral-400">
              Your paired workstation prepared a file transfer package ({pkgId}).
            </p>
            <a
              href={downloadUrl}
              download
              className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Staged File</span>
            </a>
          </div>
        )}

        {/* Upload Section */}
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Send to Desktop PC
            </span>
            <span className="text-[11px] text-cyan-400 font-mono">Micro-HTTP Sync</span>
          </div>

          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-700 hover:border-cyan-500 rounded-xl cursor-pointer bg-neutral-950/60 transition-colors">
            <Upload className="w-8 h-8 text-cyan-400 mb-2" />
            <span className="text-sm font-medium text-neutral-200">Tap to select files</span>
            <span className="text-[11px] text-neutral-500 mt-0.5">Camera, Gallery, or Documents</span>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate text-neutral-200">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-neutral-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="text-neutral-500 hover:text-red-400 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action button */}
          <button
            type="button"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
            className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              selectedFiles.length === 0 || isUploading
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-950/40 active:scale-98'
            }`}
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Transmitting...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Send {selectedFiles.length > 0 ? `${selectedFiles.length} File(s)` : ''} to Desktop</span>
              </>
            )}
          </button>

          {statusMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-red-950/60 border border-red-800/80 text-red-300'
                  : 'bg-cyan-950/60 border border-cyan-800/80 text-cyan-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              ) : (
                <RefreshCw className="w-4 h-4 shrink-0 text-cyan-400 animate-spin" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full text-center py-3 border-t border-neutral-900 text-[10px] text-neutral-600 font-mono">
        Khan Mohammed Kaif · KaifDrop-Secure Engine
      </div>
    </div>
  );
};
