import React, { useState, useEffect } from 'react';
import { StealthLockScreen } from './components/StealthLockScreen';
import { LeftDropZone } from './components/LeftDropZone';
import { RightSyncPortal } from './components/RightSyncPortal';
import { SystemIntegrationHub } from './components/SystemIntegrationHub';
import { ThreeMeshViewer } from './components/ThreeMeshViewer';
import { FileContentInspectorModal } from './components/FileContentInspectorModal';
import { JavaSourceViewerModal } from './components/JavaSourceViewerModal';
import { SettingsModal } from './components/SettingsModal';
import { MobileSimulatorModal } from './components/MobileSimulatorModal';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { MobilePortalPage } from './components/MobilePortalPage';
import { StagedPackageResult, ReceivedFileItem, NetworkStatus, UserWorkspace } from './types';
import { Shield, Settings, Code2, Lock, Smartphone, HardDrive, Wifi, User, Users } from 'lucide-react';

const DEFAULT_WORKSPACE: UserWorkspace = {
  userId: 'usr_alpha',
  userName: 'Kaif Workstation #1',
  avatarColor: 'from-cyan-500 to-blue-600',
  deviceLabel: 'Host Rig',
  createdAt: Date.now()
};

function getInitialWorkspaces(): { current: UserWorkspace; list: UserWorkspace[] } {
  try {
    const savedList = localStorage.getItem('kaifdrop_user_workspaces');
    const savedActiveId = localStorage.getItem('kaifdrop_active_user_id');
    let list: UserWorkspace[] = savedList ? JSON.parse(savedList) : [];
    if (!Array.isArray(list) || list.length === 0) {
      list = [
        DEFAULT_WORKSPACE,
        {
          userId: 'usr_beta',
          userName: 'Studio Lab Rig #2',
          avatarColor: 'from-purple-500 to-indigo-600',
          deviceLabel: 'Secondary Station',
          createdAt: Date.now()
        }
      ];
      localStorage.setItem('kaifdrop_user_workspaces', JSON.stringify(list));
    }
    const current = list.find((w) => w.userId === savedActiveId) || list[0];
    localStorage.setItem('kaifdrop_active_user_id', current.userId);
    return { current, list };
  } catch {
    return { current: DEFAULT_WORKSPACE, list: [DEFAULT_WORKSPACE] };
  }
}

export default function App() {
  // Mobile landing route check (runs directly in-browser on Vercel or any hosting)
  const isMobilePortal =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/m') ||
      window.location.pathname.startsWith('/mobile') ||
      window.location.search.includes('view=mobile'));

  if (isMobilePortal) {
    return <MobilePortalPage />;
  }

  // Stealth Shield preference (default OFF for simple direct start without password)
  const [stealthShield, setStealthShield] = useState<boolean>(() => {
    const saved = localStorage.getItem('kaifdrop_stealth_shield');
    return saved !== null ? saved === 'true' : false;
  });

  // Locked state: Always false on start for immediate password-free access
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // User workspace isolation state
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>(() => getInitialWorkspaces().list);
  const [currentWorkspace, setCurrentWorkspace] = useState<UserWorkspace>(() => getInitialWorkspaces().current);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);

  // Network and transferred files state
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFileItem[]>([]);
  const [activePackage, setActivePackage] = useState<StagedPackageResult | null>(null);

  // Modals state
  const [inspecting3DFile, setInspecting3DFile] = useState<string | null>(null);
  const [inspectingFile, setInspectingFile] = useState<{
    name: string;
    type: 'text_kaif' | 'pdf' | '3d_animation' | 'standard';
    downloadUrl?: string;
  } | null>(null);
  const [showJavaSourceModal, setShowJavaSourceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMobileSimulator, setShowMobileSimulator] = useState(false);

  // Poll network status & received files partitioned by active user
  useEffect(() => {
    if (isLocked) return;

    const fetchData = async () => {
      try {
        const [netRes, recRes] = await Promise.all([
          fetch('/api/network/status', {
            headers: { 'x-user-id': currentWorkspace.userId }
          }).catch(() => null),
          fetch('/api/transfer/received', {
            headers: { 'x-user-id': currentWorkspace.userId }
          }).catch(() => null)
        ]);

        if (netRes && netRes.ok) {
          const netData = await netRes.json().catch(() => null);
          if (netData) setNetworkStatus(netData);
        } else {
          // Resilient fallback for Vercel / serverless deployments
          setNetworkStatus((prev) => prev || {
            status: 'online',
            port: 3000,
            simulatedJavaPort: 8080,
            networkInfo: {
              interfaces: [
                { name: 'vercel-edge', address: window.location.hostname || '127.0.0.1', family: 'IPv4', mac: '00:00:00:00:00:00', internal: false }
              ],
              primaryIpv4: window.location.hostname || '127.0.0.1',
              hostname: window.location.hostname || 'localhost',
              platform: 'Vercel / Cloud Edge'
            },
            activeUrl: window.location.origin,
            stats: {
              totalBytesServed: 0,
              totalBytesReceived: 0,
              currentBandwidthBytesPerSec: 0,
              stagedPackagesCount: activePackage ? 1 : 0,
              receivedFilesCount: receivedFiles.length,
              activeUserId: currentWorkspace.userId
            }
          });
        }

        if (recRes && recRes.ok) {
          const recData = await recRes.json().catch(() => null);
          if (recData && recData.files) {
            setReceivedFiles(recData.files);
          }
        } else {
          // Fallback to browser local workspace storage
          try {
            const rawStored = localStorage.getItem(`kaifdrop_received_${currentWorkspace.userId}`);
            if (rawStored) {
              setReceivedFiles(JSON.parse(rawStored));
            }
          } catch (_) {}
        }
      } catch (err) {
        // Polling error silently handled
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2500);

    // Cross-tab real-time receiver sync
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('kaifdrop_sync_channel');
      bc.onmessage = (event) => {
        if (event.data?.userId === currentWorkspace.userId) {
          fetchData();
        }
      };
    } catch (_) {}

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
    };
  }, [isLocked, currentWorkspace.userId]);

  const handleSelectWorkspace = (ws: UserWorkspace) => {
    setCurrentWorkspace(ws);
    localStorage.setItem('kaifdrop_active_user_id', ws.userId);
    setActivePackage(null);
    setReceivedFiles([]);
  };

  const handleCreateWorkspace = (name: string, deviceLabel = 'Workstation') => {
    const newWs: UserWorkspace = {
      userId: 'usr_' + Math.random().toString(36).substring(2, 8),
      userName: name,
      avatarColor: 'from-emerald-500 to-teal-600',
      deviceLabel,
      createdAt: Date.now()
    };
    const updated = [...workspaces, newWs];
    setWorkspaces(updated);
    setCurrentWorkspace(newWs);
    localStorage.setItem('kaifdrop_user_workspaces', JSON.stringify(updated));
    localStorage.setItem('kaifdrop_active_user_id', newWs.userId);
    setActivePackage(null);
    setReceivedFiles([]);
  };

  const handleUpdateWorkspaceName = (id: string, newName: string) => {
    const updated = workspaces.map((w) => (w.userId === id ? { ...w, userName: newName } : w));
    setWorkspaces(updated);
    if (currentWorkspace.userId === id) {
      setCurrentWorkspace((prev) => ({ ...prev, userName: newName }));
    }
    localStorage.setItem('kaifdrop_user_workspaces', JSON.stringify(updated));
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  const handleToggleStealthShield = (enabled: boolean) => {
    setStealthShield(enabled);
    localStorage.setItem('kaifdrop_stealth_shield', enabled ? 'true' : 'false');
  };

  const handleLockTerminal = () => {
    setIsLocked(true);
  };

  const handleRefreshReceived = async () => {
    try {
      const res = await fetch('/api/transfer/received', {
        headers: { 'x-user-id': currentWorkspace.userId }
      });
      if (res.ok) {
        const data = await res.json();
        setReceivedFiles(data.files || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fast test: Simulate Mobile Upload
  const handleFastSimulateMobileUpload = async () => {
    try {
      const blob = new Blob(
        [
          `// Mobile Student Submission\nStudent: Khan Mohammed Kaif\nWorkspace: ${currentWorkspace.userName} (${currentWorkspace.userId})\nStatus: Verified Peer Transfer\n`
        ],
        { type: 'text/plain' }
      );
      const file = new File([blob], `lab_assignment_${Date.now().toString().slice(-4)}.kaif`, { type: 'text/plain' });
      const formData = new FormData();
      formData.append('userId', currentWorkspace.userId);
      formData.append('files', file);

      await fetch('/api/transfer/upload', {
        method: 'POST',
        headers: { 'x-user-id': currentWorkspace.userId },
        body: formData
      });
      handleRefreshReceived();
    } catch (e) {
      console.error(e);
    }
  };

  // If locked, render purely restricted Stealth Lock Screen
  if (isLocked) {
    return <StealthLockScreen onUnlock={handleUnlock} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-neutral-100 overflow-hidden select-none animate-in fade-in duration-300">
      {/* Top Application Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-[#0c0c10] shrink-0">
        {/* Brand & Network Node Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-neutral-100 font-sans">
              KaifDrop-Secure
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-neutral-800 text-xs text-neutral-400">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-neutral-300">
              {networkStatus?.networkInfo.primaryIpv4 || '127.0.0.1'}
            </span>
            <span className="text-neutral-600">·</span>
            <span className="font-mono text-neutral-400">Port 8080/3000</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* User Workspace Switcher Button */}
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-cyan-800/60 hover:border-cyan-500 rounded-lg text-xs transition-colors shadow-sm"
            title="Switch User Workspace / Create Separate User Space"
          >
            <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${currentWorkspace.avatarColor} flex items-center justify-center text-[10px] text-white font-bold shrink-0`}>
              {currentWorkspace.userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="font-semibold text-neutral-200 text-xs max-w-[120px] truncate">{currentWorkspace.userName}</span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1 py-0.2 rounded border border-cyan-800/60">
                  {currentWorkspace.userId}
                </span>
              </div>
              <span className="text-[9px] text-cyan-400/80 font-mono">Separate Per User</span>
            </div>
          </button>

          {/* Java Source Code & Maven Project View */}
          <button
            onClick={() => setShowJavaSourceModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-800/50 rounded-lg transition-colors shadow-sm"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Java Source &amp; Project</span>
          </button>

          {/* Mobile Simulator */}
          <button
            onClick={() => setShowMobileSimulator(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">Phone Simulator</span>
          </button>

          {/* Settings & Stealth Shield master toggle */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
          >
            <Shield className={`w-3.5 h-3.5 ${stealthShield ? 'text-cyan-400' : 'text-neutral-500'}`} />
            <span className="hidden sm:inline">Stealth Shield</span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                stealthShield ? 'bg-cyan-950 text-cyan-400' : 'bg-neutral-800 text-neutral-500'
              }`}
            >
              {stealthShield ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Quick Lock Button */}
          <button
            onClick={handleLockTerminal}
            title="Lock terminal into stealth blank state"
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Split-Pane Workspace */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 overflow-hidden bg-[#09090b]">
        {/* Left Control Panel: PC to Mobile Drop Zone */}
        <div className="h-full overflow-hidden">
          <LeftDropZone
            userId={currentWorkspace.userId}
            userName={currentWorkspace.userName}
            onPackageStaged={(pkg) => setActivePackage(pkg)}
            onInspectFile={(name, type, url) => setInspectingFile({ name, type, downloadUrl: url })}
            onInspect3D={(name) => setInspecting3DFile(name)}
          />
        </div>

        {/* Right Control Panel: Mobile to PC Sync Portal */}
        <div className="h-full overflow-hidden">
          <RightSyncPortal
            userId={currentWorkspace.userId}
            userName={currentWorkspace.userName}
            receivedFiles={receivedFiles}
            onRefresh={handleRefreshReceived}
            onOpenMobileSimulator={() => setShowMobileSimulator(true)}
            onSimulateUpload={handleFastSimulateMobileUpload}
          />
        </div>
      </main>

      {/* System Integration Hub (Bottom Console Strip) */}
      <footer className="shrink-0">
        <SystemIntegrationHub
          networkStatus={networkStatus}
          onLockTerminal={handleLockTerminal}
        />
      </footer>

      {/* User Workspace Switcher Modal */}
      {showUserModal && (
        <UserSwitcherModal
          currentWorkspace={currentWorkspace}
          workspaces={workspaces}
          onSelectWorkspace={handleSelectWorkspace}
          onCreateWorkspace={handleCreateWorkspace}
          onUpdateWorkspaceName={handleUpdateWorkspaceName}
          onClose={() => setShowUserModal(false)}
        />
      )}

      {/* 3D Mesh Inspector Modal */}
      {inspecting3DFile && (
        <ThreeMeshViewer
          fileName={inspecting3DFile}
          onClose={() => setInspecting3DFile(null)}
        />
      )}

      {/* File Content / Watermark Inspector Modal */}
      {inspectingFile && (
        <FileContentInspectorModal
          fileName={inspectingFile.name}
          stampedType={inspectingFile.type}
          downloadUrl={inspectingFile.downloadUrl}
          onClose={() => setInspectingFile(null)}
        />
      )}

      {/* Java Source Code & Project Archive Modal */}
      {showJavaSourceModal && (
        <JavaSourceViewerModal onClose={() => setShowJavaSourceModal(false)} />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          stealthShield={stealthShield}
          onToggleStealthShield={handleToggleStealthShield}
          networkStatus={networkStatus}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Mobile Simulator Modal */}
      {showMobileSimulator && (
        <MobileSimulatorModal
          userId={currentWorkspace.userId}
          userName={currentWorkspace.userName}
          pkgName={activePackage?.name}
          downloadUrl={activePackage?.directDownloadUrl}
          onUploaded={handleRefreshReceived}
          onClose={() => setShowMobileSimulator(false)}
        />
      )}
    </div>
  );
}
