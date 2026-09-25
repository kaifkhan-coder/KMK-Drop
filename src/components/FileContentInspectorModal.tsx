import React from 'react';
import { X, ShieldCheck, FileText, Download } from 'lucide-react';

interface FileContentInspectorModalProps {
  fileName: string;
  stampedType: 'text_kaif' | 'pdf' | '3d_animation' | 'standard';
  downloadUrl?: string;
  onClose: () => void;
}

export const FileContentInspectorModal: React.FC<FileContentInspectorModalProps> = ({
  fileName,
  stampedType,
  downloadUrl,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">
                Watermark Pipeline Inspector · {fileName}
              </h3>
              <p className="text-xs text-neutral-400">
                Verified Cryptographic Stamping Signature
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {stampedType === 'text_kaif' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <FileText className="w-4 h-4" />
                <span>Text / .kaif Header Interception Layer Applied</span>
              </div>
              <p className="text-xs text-neutral-400">
                The core parsing engine programmatically injected the required security header block into the first line of the runtime byte array:
              </p>
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg font-mono text-xs text-emerald-300 leading-relaxed overflow-x-auto select-all">
                <span className="text-emerald-400 font-semibold">// [Created by Khan Mohammed Kaif] - 3D Animation &amp; Local Secure Transfer Protocol</span>
                <div className="text-neutral-500 mt-2">// Followed by original script payload bytes...</div>
              </div>
            </div>
          )}

          {stampedType === 'pdf' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-red-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Binary PDF Document Stamping Layer</span>
              </div>
              <p className="text-xs text-neutral-400">
                Integrated file reader framework (Apache PDFBox / PDF Engine) has drawn a semi-transparent dark red tracking stamp inside the lower-left footer boundaries of the first page context:
              </p>
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg relative overflow-hidden">
                {/* Simulated PDF document page view */}
                <div className="h-44 bg-neutral-900 border border-neutral-800 rounded p-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-1/3 bg-neutral-800 rounded"></div>
                    <div className="h-2 w-3/4 bg-neutral-800/60 rounded"></div>
                    <div className="h-2 w-1/2 bg-neutral-800/40 rounded"></div>
                  </div>
                  {/* Stamped tracking stamp */}
                  <div className="pt-2 border-t border-neutral-800/50 flex items-center justify-between">
                    <div className="font-sans text-[11px] font-bold text-red-600/90 tracking-wide select-all bg-red-950/30 px-2 py-0.5 rounded border border-red-900/40">
                      Build by Khan Kaif - Secured Local Protocol
                    </div>
                    <span className="text-[10px] text-neutral-600 font-mono">Page 1 / Lower-Left Footer</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {stampedType === '3d_animation' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>3D Animation Asset Architecture &amp; Companion Ledger</span>
              </div>
              <p className="text-xs text-neutral-400">
                Heavy binary frames were preserved intact with zero binary alteration to protect geometry meshes. The companion metadata ledger was automatically injected into the root structural layout of the compressed archive package:
              </p>
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg font-mono text-xs text-cyan-300 leading-relaxed overflow-x-auto select-all">
                <div className="text-neutral-500 mb-1"># File: animation_manifest.kaif (Archive Root)</div>
                <div className="font-semibold text-cyan-200">Project Architect: Khan Mohammed Kaif (3D Animation Suite)</div>
                <div className="text-neutral-400">Pipeline: KaifDrop-Secure Active Mesh Guard</div>
                <div className="text-neutral-400">Integrity: Verified Unaltered Binary Geometry</div>
              </div>
            </div>
          )}

          {stampedType === 'standard' && (
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300">
              Standard binary asset prepared for secure micro-HTTP peer streaming.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <span className="text-xs text-neutral-500 font-mono">
            Pipeline Verified · SHA-256 HMAC Sealed
          </span>
          <div className="flex items-center gap-3">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Asset</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
