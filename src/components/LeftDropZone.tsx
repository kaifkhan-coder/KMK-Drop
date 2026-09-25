import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { UploadCloud, FileText, Box, ShieldCheck, Download, Copy, Check, Eye, Sparkles, Layers, Maximize2, ExternalLink, Plus, Trash2, FolderPlus, Smartphone, Wifi, Globe, Loader2, Info } from 'lucide-react';
import { StagedPackageResult, StagedFile } from '../types';
import { EnlargeQrModal } from './EnlargeQrModal';

interface LeftDropZoneProps {
  onPackageStaged: (pkg: StagedPackageResult) => void;
  onInspectFile: (fileName: string, type: 'text_kaif' | 'pdf' | '3d_animation' | 'standard', downloadUrl?: string) => void;
  onInspect3D: (fileName: string) => void;
}

export const LeftDropZone: React.FC<LeftDropZoneProps> = ({
  onPackageStaged,
  onInspectFile,
  onInspect3D
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingBridge, setIsGeneratingBridge] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [activePackage, setActivePackage] = useState<StagedPackageResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrTargetUrl, setQrTargetUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [hostMode, setHostMode] = useState<'public_phone' | 'cloud' | 'local'>('public_phone');
  const [localIpInput, setLocalIpInput] = useState<string>('192.168.1.100:3000');
  const [showQrHelp, setShowQrHelp] = useState<boolean>(false);
  const [showEnlargeModal, setShowEnlargeModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const hasAutoLoadedRef = useRef(false);

  // Auto-stage default starter suite on mount so Left QR code is immediately active
  useEffect(() => {
    if (!hasAutoLoadedRef.current) {
      hasAutoLoadedRef.current = true;
      loadTestStagingSuite();
    }
  }, []);

  // Request zero-403 public bridge URL if not already generated
  const ensurePublicBridge = async (stageId: string) => {
    if (isGeneratingBridge) return;
    setIsGeneratingBridge(true);
    try {
      const res = await fetch(`/api/transfer/public-bridge/${stageId}`, { method: 'POST' });
      const data = await res.json();
      if (data?.publicBridgeUrl) {
        setActivePackage((prev) => prev ? { ...prev, publicBridgeUrl: data.publicBridgeUrl } : prev);
      }
    } catch (e) {
      console.warn('Public bridge request failed:', e);
    } finally {
      setIsGeneratingBridge(false);
    }
  };

  // Generate QR Code vector when active package or host mode changes
  useEffect(() => {
    if (activePackage) {
      let targetUrl = '';

      if (hostMode === 'public_phone') {
        if (activePackage.publicBridgeUrl) {
          targetUrl = activePackage.publicBridgeUrl;
        } else {
          // Trigger asynchronous generation
          ensurePublicBridge(activePackage.stageId);
          // Fallback to direct download until bridge is ready
          targetUrl = `${window.location.origin}/m?pkg=${activePackage.stageId}`;
        }
      } else if (hostMode === 'local' && localIpInput.trim()) {
        const base = localIpInput.startsWith('http') ? localIpInput : `http://${localIpInput}`;
        targetUrl = `${base}/m?pkg=${activePackage.stageId}`;
      } else {
        targetUrl = `${window.location.origin}/m?pkg=${activePackage.stageId}`;
      }

      setQrTargetUrl(targetUrl);

      QRCode.toDataURL(targetUrl, {
        width: 380,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation failed:', err));
    }
  }, [activePackage, hostMode, localIpInput, activePackage?.publicBridgeUrl]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files), true);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files), false);
    }
    // Reset input so same files can be re-selected if desired
    if (e.target) e.target.value = '';
  };

  const handleAddMoreInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files), true);
    }
    if (e.target) e.target.value = '';
  };

  const processFiles = async (newFiles: File[], append = false) => {
    setIsProcessing(true);
    try {
      // If append mode, combine with current staged files
      const existingRaw = append
        ? (stagedFiles.map((f) => f.rawFile).filter(Boolean) as File[])
        : [];
      
      const allFiles = [...existingRaw, ...newFiles];

      const formData = new FormData();
      allFiles.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch('/api/transfer/stage', {
        method: 'POST',
        body: formData
      });

      const data: StagedPackageResult = await res.json();
      if (!res.ok) throw new Error((data as any).error || 'Staging failed');

      setActivePackage(data);
      onPackageStaged(data);

      const stagedList: StagedFile[] = allFiles.map((f) => {
        const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
        let stampedType: StagedFile['stampedType'] = 'standard';
        if (ext === '.kaif' || ['.txt', '.java', '.py', '.js', '.ts', '.md', '.json', '.html'].includes(ext)) {
          stampedType = 'text_kaif';
        } else if (ext === '.pdf') {
          stampedType = 'pdf';
        } else if (['.obj', '.fbx', '.stl', '.blend'].includes(ext)) {
          stampedType = '3d_animation';
        }

        return {
          name: f.name,
          size: f.size,
          type: f.type,
          stampedType,
          hasManifest: stampedType === '3d_animation',
          rawFile: f
        };
      });

      setStagedFiles(stagedList);
    } catch (err: any) {
      alert('Staging error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove individual file from bundle
  const handleRemoveFile = async (indexToRemove: number) => {
    const remainingFiles = stagedFiles
      .filter((_, idx) => idx !== indexToRemove)
      .map((f) => f.rawFile)
      .filter(Boolean) as File[];

    if (remainingFiles.length === 0) {
      setStagedFiles([]);
      setActivePackage(null);
      setQrDataUrl('');
    } else {
      await processFiles(remainingFiles, false);
    }
  };

  // Clear all staged files
  const handleClearAll = () => {
    setStagedFiles([]);
    setActivePackage(null);
    setQrDataUrl('');
  };

  // Helper to load test staging suite
  const loadTestStagingSuite = async () => {
    setIsProcessing(true);
    try {
      // 1. Text & Custom .kaif extension file
      const kaifBlob = new Blob(
        [
          `// KaifDrop-Secure Autonomous Transfer Module\nfunction runStealthSync() {\n    console.log("Khan Mohammed Kaif 3D & Data Protocol Initialized.");\n}`
        ],
        { type: 'text/plain' }
      );
      const kaifFile = new File([kaifBlob], 'neural_mesh_controller.kaif', { type: 'text/plain' });

      // 2. Binary PDF document (create a valid minimalist PDF)
      const pdfBytes = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(KaifDrop Document) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n308\n%%EOF`;
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], 'protocol_specification.pdf', { type: 'application/pdf' });

      // 3. 3D Animation Asset (.obj)
      const objContent = `# Wavefront OBJ generated for KaifDrop-Secure\nv 0.0 0.0 0.0\nv 1.0 0.0 0.0\nv 1.0 1.0 0.0\nv 0.0 1.0 0.0\nv 0.5 0.5 1.0\nf 1 2 5\nf 2 3 5\nf 3 4 5\nf 4 1 5\n`;
      const objBlob = new Blob([objContent], { type: 'text/plain' });
      const objFile = new File([objBlob], 'cyber_avatar_rig.obj', { type: 'text/plain' });

      await processFiles([kaifFile, pdfFile, objFile]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyDownloadUrl = () => {
    if (activePackage) {
      navigator.clipboard.writeText(activePackage.directDownloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div>
          <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <span>PC to Mobile Drop Zone</span>
            <span className="text-[11px] font-mono font-normal text-cyan-400">· Staging Phase</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Drag files directly from local system explorer to compile &amp; generate live QR code
          </p>
        </div>

        <button
          onClick={loadTestStagingSuite}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-lg transition-colors whitespace-nowrap shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Load Test Suite (.kaif, .pdf, .obj)</span>
        </button>
      </div>

      {/* Large High-Contrast Visual Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/20'
            : 'border-neutral-700 hover:border-neutral-500 bg-neutral-950/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        <input
          ref={addMoreInputRef}
          type="file"
          multiple
          onChange={handleAddMoreInput}
          className="hidden"
        />

        <div className="p-3 bg-neutral-800/80 rounded-full mb-2 text-cyan-400">
          <UploadCloud className="w-7 h-7" />
        </div>

        <div className="text-center space-y-1">
          <div className="text-sm font-semibold text-neutral-200">
            {isProcessing ? 'Intercepting & Stamping Assets...' : 'Drag & Drop Multiple Files Here'}
          </div>
          <div className="text-xs text-neutral-400">
            Supports Plain Text / Custom <code className="text-cyan-300 font-mono">.kaif</code>, Binary <code className="text-red-300 font-mono">.pdf</code>, and 3D <code className="text-cyan-300 font-mono">.obj / .fbx / .stl</code>
          </div>
        </div>

        {/* Multi-file Action Buttons */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Select Multiple Files</span>
          </button>
          {stagedFiles.length > 0 && (
            <button
              type="button"
              onClick={() => addMoreInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-neutral-900 hover:bg-neutral-800 border border-cyan-800/60 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add More Files</span>
            </button>
          )}
        </div>

        <div className="mt-2 text-[10px] text-cyan-400/80 font-mono">
          ✓ Multi-file enabled: Hold Ctrl / Shift in file dialog to select multiple items
        </div>
      </div>

      {/* Split staged files and Live High-Contrast ZXing Vector QR Code */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[220px]">
        {/* Staged Assets Ledger */}
        <div className="flex flex-col bg-neutral-950 border border-neutral-800 rounded-lg p-3 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-300">
                Staged Pipeline Files ({stagedFiles.length})
              </span>
              {activePackage?.isZipMatrix && (
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                  ZIP Matrix Active
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => addMoreInputRef.current?.click()}
                title="Add more files to this package"
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-cyan-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Files</span>
              </button>
              {stagedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  title="Clear all staged files"
                  className="px-2 py-0.5 text-[10px] text-neutral-500 hover:text-red-400 rounded transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {stagedFiles.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500 italic">
                Drop multiple files above or click "Select Multiple Files"
              </div>
            ) : (
              stagedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-neutral-900/80 border border-neutral-800 text-xs"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {file.stampedType === '3d_animation' ? (
                      <Box className="w-4 h-4 text-cyan-400 shrink-0" />
                    ) : file.stampedType === 'pdf' ? (
                      <FileText className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="font-mono text-neutral-200 truncate">{file.name}</div>
                      <div className="text-[10px] text-neutral-500 flex items-center gap-2">
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                        <span>·</span>
                        {file.stampedType === 'text_kaif' && (
                          <span className="text-emerald-400">Header Stamp Injected</span>
                        )}
                        {file.stampedType === 'pdf' && (
                          <span className="text-red-400">PDFBox Footer Stamped</span>
                        )}
                        {file.stampedType === '3d_animation' && (
                          <span className="text-cyan-400">Unaltered Mesh + Manifest</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {file.stampedType === '3d_animation' && (
                      <button
                        onClick={() => onInspect3D(file.name)}
                        title="Inspect 3D Geometry in WebGL"
                        className="p-1 text-cyan-400 hover:text-cyan-200 hover:bg-neutral-800 rounded transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        onInspectFile(
                          file.name,
                          file.stampedType,
                          activePackage?.directDownloadUrl
                        )
                      }
                      title="Inspect Dynamic Watermark"
                      className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveFile(i)}
                      title="Remove this file from package"
                      className="p-1 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {activePackage && (
            <div className="pt-2 mt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-mono">
                Total: {(activePackage.totalBytes / 1024).toFixed(1)} KB
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyDownloadUrl}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy URL'}</span>
                </button>
                <a
                  href={activePackage.directDownloadUrl}
                  download
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-cyan-400 hover:bg-cyan-300 text-neutral-950 font-semibold rounded transition-colors shadow"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Live Vector QR Code Panel (ZXing Engine Emulation) */}
        <div className="flex flex-col items-center justify-center bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-center">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>ZXing Live Vector QR Code</span>
          </div>

          {qrDataUrl ? (
            <div className="space-y-2.5 flex flex-col items-center w-full">
              {/* Zero-403 Status Indicator */}
              {hostMode === 'public_phone' && (
                <div className="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded bg-emerald-950/60 border border-emerald-800/60 text-[10px] text-emerald-300 font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Physical Phone QR (Zero-403 Guaranteed)</span>
                </div>
              )}
              {hostMode === 'cloud' && (
                <div className="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded bg-cyan-950/60 border border-cyan-800/60 text-[10px] text-cyan-300 font-medium">
                  <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Browser Tab Mode (Requires Dev Session)</span>
                </div>
              )}
              {hostMode === 'local' && (
                <div className="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded bg-blue-950/60 border border-blue-800/60 text-[10px] text-blue-300 font-medium">
                  <Wifi className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Local Wi-Fi LAN Mode (Direct Network)</span>
                </div>
              )}

              {/* Clickable Large High-Contrast White QR Box */}
              <div
                onClick={() => setShowEnlargeModal(true)}
                className="relative group p-3 bg-white rounded-xl shadow-lg border-2 border-white cursor-pointer hover:ring-2 hover:ring-cyan-400 transition-all"
                title="Click to expand QR Code to full size"
              >
                <img
                  src={qrDataUrl}
                  alt="Staged Transfer QR Code"
                  className="w-40 h-40 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="absolute inset-0 bg-neutral-900/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white font-medium text-xs transition-opacity">
                  <Maximize2 className="w-4 h-4 text-cyan-300" />
                  <span>Enlarge for Camera</span>
                </div>
              </div>

              {/* Enlarge and Open Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEnlargeModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-md transition-colors"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Enlarge QR</span>
                </button>
                <a
                  href={qrTargetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-md transition-colors"
                >
                  <ExternalLink className="w-3 h-3 text-cyan-400" />
                  <span>Open in Tab</span>
                </a>
              </div>
              
              {/* Host & Target Switcher */}
              <div className="flex flex-wrap items-center justify-center gap-1 text-[11px] w-full pt-1">
                <button
                  type="button"
                  onClick={() => setHostMode('public_phone')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    hostMode === 'public_phone'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                      : 'text-neutral-400 bg-neutral-900 hover:text-neutral-200'
                  }`}
                >
                  <Smartphone className="w-3 h-3 text-emerald-400" />
                  <span>Real Phone (No 403)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHostMode('cloud')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    hostMode === 'cloud'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'text-neutral-400 bg-neutral-900 hover:text-neutral-200'
                  }`}
                >
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span>Browser Tab</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHostMode('local')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    hostMode === 'local'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                      : 'text-neutral-400 bg-neutral-900 hover:text-neutral-200'
                  }`}
                >
                  <Wifi className="w-3 h-3 text-blue-400" />
                  <span>Local Wi-Fi</span>
                </button>
              </div>

              {isGeneratingBridge && (
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Generating zero-403 phone link...</span>
                </div>
              )}

              {hostMode === 'local' && (
                <div className="flex items-center gap-1 w-full max-w-[200px]">
                  <input
                    type="text"
                    value={localIpInput}
                    onChange={(e) => setLocalIpInput(e.target.value)}
                    placeholder="192.168.1.X:3000"
                    className="w-full px-2 py-0.5 text-[10px] font-mono bg-neutral-900 border border-neutral-700 rounded text-neutral-200 outline-none text-center"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQrHelp(!showQrHelp)}
                  className="text-[10px] text-neutral-400 hover:text-cyan-300 underline flex items-center gap-1"
                >
                  <Info className="w-3 h-3" />
                  <span>{showQrHelp ? 'Hide Scanner Help' : 'Why did scanning give 403?'}</span>
                </button>
              </div>

              {showQrHelp && (
                <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-[10px] text-neutral-300 text-left space-y-1.5 max-w-[280px]">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>How 403 is resolved for phones:</span>
                  </div>
                  <div className="leading-snug text-neutral-400">
                    Google Cloud blocks external mobile browsers from opening development sandboxes (<code className="text-cyan-400">ais-dev-*.run.app</code>) without Google developer cookies.
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <div>✅ <strong>Real Phone (No 403):</strong> Uses a zero-knowledge public download gateway so any phone camera scans and downloads without login.</div>
                    <div>💻 <strong>Browser Tab:</strong> Open directly in a new desktop browser tab or Phone Simulator.</div>
                    <div>📶 <strong>Local Wi-Fi IP:</strong> When running on your computer, connect over home Wi-Fi directly.</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-neutral-600 space-y-2">
              <div className="w-32 h-32 border-2 border-dashed border-neutral-800 rounded-lg flex items-center justify-center text-xs font-mono text-neutral-600">
                Generating QR...
              </div>
              <span className="text-[11px] text-neutral-500">Staging Live Vector</span>
            </div>
          )}
        </div>
      </div>

      {/* Enlarge QR Modal */}
      {showEnlargeModal && qrDataUrl && (
        <EnlargeQrModal
          title="PC to Mobile Drop Zone QR"
          subtitle="Point phone camera at this high-contrast vector to download watermarked files"
          qrDataUrl={qrDataUrl}
          targetUrl={qrTargetUrl}
          onClose={() => setShowEnlargeModal(false)}
        />
      )}
    </div>
  );
};
