import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, QrCode } from 'lucide-react';

interface EnlargeQrModalProps {
  title: string;
  subtitle: string;
  qrDataUrl: string;
  targetUrl: string;
  onClose: () => void;
}

export const EnlargeQrModal: React.FC<EnlargeQrModalProps> = ({
  title,
  subtitle,
  qrDataUrl,
  targetUrl,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center max-w-md w-full bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden p-6 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
          title="Close QR"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-cyan-400 mb-1">
          <QrCode className="w-5 h-5" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider">
            High-Contrast Vector QR
          </span>
        </div>

        <h3 className="text-base font-bold text-neutral-100">{title}</h3>
        <p className="text-xs text-neutral-400 mb-5">{subtitle}</p>

        {/* Large White High-Contrast Box */}
        <div className="p-5 bg-white rounded-2xl shadow-xl border-4 border-white flex items-center justify-center">
          <img
            src={qrDataUrl}
            alt={title}
            className="w-72 h-72 sm:w-80 sm:h-80 object-contain image-rendering-crisp"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        <p className="text-xs text-neutral-300 mt-4 font-medium">
          Point phone camera directly at the code above
        </p>

        {/* Direct Link & Copy */}
        <div className="mt-3 w-full flex items-center gap-2 p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
          <span className="font-mono text-neutral-400 truncate flex-1 text-left px-1">
            {targetUrl}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 transition-colors shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <a
            href={targetUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1 text-neutral-400 hover:text-cyan-300 transition-colors shrink-0"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
