import React, { useState } from 'react';
import { Smartphone, Upload, CheckCircle2, AlertCircle, X, ExternalLink } from 'lucide-react';

interface MobileSimulatorModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onUploaded: () => void;
  downloadUrl?: string;
  pkgName?: string;
}

export const MobileSimulatorModal: React.FC<MobileSimulatorModalProps> = ({
  userId,
  userName,
  onClose,
  onUploaded,
  downloadUrl,
  pkgName
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setStatusMessage(null);
    }
    if (e.target) e.target.value = '';
  };

  const handleRemoveSelected = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setStatusMessage({ text: 'Streaming assets via micro-HTTP socket...', type: 'info' });

    const formData = new FormData();
    formData.append('userId', userId);
    selectedFiles.forEach((file) => formData.append('files', file));

    try {
      const res = await fetch('/api/transfer/upload', {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: `✓ Transmitted to ${userName} (${userId}) directory!`, type: 'success' });
        setSelectedFiles([]);
        onUploaded();
      } else {
        throw new Error(data.error || 'Upload error');
      }
    } catch (err: any) {
      setStatusMessage({ text: 'Transfer error: ' + err.message, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  // Quick preset samples for mobile simulator
  const handleQuickAdd = (type: 'photo' | 'assignment') => {
    if (type === 'photo') {
      const blob = new Blob(['Simulated high-res mobile camera capture content'], { type: 'image/jpeg' });
      const file = new File([blob], `mobile_photo_${Date.now().toString().slice(-4)}.jpg`, { type: 'image/jpeg' });
      setSelectedFiles((prev) => [...prev, file]);
    } else {
      const blob = new Blob(['Student Coursework Report & 3D Lab Assignment'], { type: 'text/plain' });
      const file = new File([blob], `student_lab_submission_${Date.now().toString().slice(-4)}.kaif`, { type: 'text/plain' });
      setSelectedFiles((prev) => [...prev, file]);
    }
    setStatusMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Mobile Device Frame */}
      <div className="relative w-full max-w-[380px] bg-neutral-950 border-[6px] border-neutral-800 rounded-[36px] shadow-2xl overflow-hidden flex flex-col h-[680px]">
        {/* Phone Speaker Notch */}
        <div className="flex justify-center pt-3 pb-2 bg-neutral-950">
          <div className="w-24 h-4 bg-neutral-800 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-neutral-900 rounded-full border border-neutral-700 mr-2"></div>
            <div className="w-10 h-1 bg-neutral-700 rounded-full"></div>
          </div>
        </div>

        {/* Top bar inside simulator */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mobile Device Simulator</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/mobile"
              target="_blank"
              rel="noreferrer"
              title="Open real mobile view in browser tab"
              className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile View Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center pb-2 border-b border-neutral-800">
            <div className="inline-block text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 rounded-full px-2.5 py-0.5 mb-1">
              LOCAL PEER NODE
            </div>
            <h2 className="text-sm font-bold text-neutral-100">KaifDrop Mobile Portal</h2>
            <p className="text-[11px] text-neutral-400">Micro-HTTP Direct Transfer Handshake</p>
          </div>

          {/* Connected Workstation Banner */}
          <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between text-xs">
            <span className="text-neutral-300">👤 Channel: <strong className="text-cyan-300 font-mono">{userId}</strong></span>
            <span className="text-[10px] text-neutral-400 truncate max-w-[110px]">{userName}</span>
          </div>

          {/* Download card if package staged on PC */}
          {downloadUrl && (
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
              <div className="text-xs font-semibold text-neutral-200 flex items-center justify-between">
                <span>📥 PC Staged Asset</span>
                <span className="text-[10px] text-emerald-400 font-mono">Ready</span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate">{pkgName || 'Staged Transfer Package'}</p>
              <a
                href={downloadUrl}
                download
                className="block w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-semibold text-xs text-center rounded-lg transition-colors shadow"
              >
                Download to Mobile
              </a>
            </div>
          )}

          {/* Mobile Upload form */}
          <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
            <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
              <span>📤 Send Mobile Files to PC</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Select student homework, mobile camera snapshots, or project files to send directly to your desktop.
            </p>

            <label className="flex flex-col items-center justify-center p-4 border border-dashed border-neutral-700 hover:border-cyan-500/60 rounded-lg cursor-pointer bg-neutral-950/50 transition-colors">
              <Upload className="w-5 h-5 text-neutral-400 mb-1" />
              <span className="text-xs font-medium text-neutral-300">Tap to select files</span>
              <span className="text-[10px] text-neutral-500 mt-0.5">Camera / Documents</span>
              <input type="file" multiple onChange={handleFileChange} className="hidden" />
            </label>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickAdd('photo')}
                className="flex-1 py-1.5 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors"
              >
                + Add Photo
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd('assignment')}
                className="flex-1 py-1.5 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors"
              >
                + Add .kaif Script
              </button>
            </div>

            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] text-neutral-400 font-medium">Selected for Sync ({selectedFiles.length}):</div>
                <div className="max-h-24 overflow-y-auto space-y-1 text-xs">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2 py-1 bg-neutral-950 rounded text-neutral-300 font-mono text-[11px]"
                    >
                      <span className="truncate max-w-[170px]">{file.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-neutral-500">{(file.size / 1024).toFixed(0)} KB</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelected(idx)}
                          className="text-neutral-500 hover:text-red-400 p-0.5"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-bold text-xs rounded-lg transition-colors shadow"
            >
              {isUploading ? 'Streaming to Desktop PC...' : `Push ${selectedFiles.length} File(s) to PC`}
            </button>

            {statusMessage && (
              <div
                className={`p-2 rounded text-xs flex items-center gap-1.5 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                    : statusMessage.type === 'error'
                    ? 'bg-red-950/40 text-red-300 border border-red-800/40'
                    : 'bg-cyan-950/40 text-cyan-300 border border-cyan-800/40'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Phone Bar */}
        <div className="py-2.5 bg-neutral-950 flex justify-center">
          <div className="w-28 h-1 bg-neutral-700 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};
