import React, { useState } from 'react';
import { UserWorkspace } from '../types';
import { X, User, Plus, Check, Copy, Laptop, RefreshCw, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';

interface UserSwitcherModalProps {
  currentWorkspace: UserWorkspace;
  workspaces: UserWorkspace[];
  onSelectWorkspace: (ws: UserWorkspace) => void;
  onCreateWorkspace: (name: string, deviceLabel?: string) => void;
  onUpdateWorkspaceName: (id: string, newName: string) => void;
  onClose: () => void;
}

const AVATAR_COLORS = [
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-indigo-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600'
];

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({
  currentWorkspace,
  workspaces,
  onSelectWorkspace,
  onCreateWorkspace,
  onUpdateWorkspaceName,
  onClose
}) => {
  const [editingName, setEditingName] = useState(currentWorkspace.userName);
  const [isEditing, setIsEditing] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserDevice, setNewUserDevice] = useState('');
  const [joinUserId, setJoinUserId] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'switch' | 'create' | 'join'>('switch');

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveName = () => {
    if (editingName.trim()) {
      onUpdateWorkspaceName(currentWorkspace.userId, editingName.trim());
      setIsEditing(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    onCreateWorkspace(newUserName.trim(), newUserDevice.trim() || 'Workstation');
    setNewUserName('');
    setNewUserDevice('');
    onClose();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const id = joinUserId.trim();
    if (!id) return;
    const existing = workspaces.find((w) => w.userId.toLowerCase() === id.toLowerCase());
    if (existing) {
      onSelectWorkspace(existing);
    } else {
      const joinedWs: UserWorkspace = {
        userId: id,
        userName: `User Channel ${id.slice(-4)}`,
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        deviceLabel: 'External Peer',
        createdAt: Date.now()
      };
      onSelectWorkspace(joinedWs);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentWorkspace.avatarColor} flex items-center justify-center text-white shadow-sm`}>
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <span>User Workspaces &amp; Isolation</span>
                <span className="text-[10px] bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded font-mono">
                  Separate Per User
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Every user has an isolated disk workspace, private staged packages, and dedicated mobile link.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active User Banner */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800">
          <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold mb-2 flex items-center justify-between">
            <span>Active Isolated Workspace</span>
            <span className="text-neutral-500 font-normal">Active in this session</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentWorkspace.avatarColor} flex items-center justify-center text-white font-bold text-base shadow`}>
                {currentWorkspace.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="px-2 py-1 bg-neutral-950 border border-cyan-500 rounded text-xs text-neutral-100 font-semibold focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-1 text-xs text-emerald-400 hover:bg-neutral-800 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-100">{currentWorkspace.userName}</span>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-[11px] text-neutral-400 hover:text-cyan-300 underline"
                    >
                      Rename
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-mono text-neutral-400 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
                    ID: {currentWorkspace.userId}
                  </span>
                  <button
                    onClick={() => handleCopyId(currentWorkspace.userId)}
                    className="text-[11px] text-neutral-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                    title="Copy User ID"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-neutral-500 block font-mono">Device Label</span>
              <span className="text-xs text-neutral-300 font-medium">{currentWorkspace.deviceLabel}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-4 pt-2">
          <button
            onClick={() => setActiveTab('switch')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'switch'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Switch User ({workspaces.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            + Create New User
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'join'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Join by User ID
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'switch' && (
            <div className="space-y-2">
              <div className="text-xs text-neutral-400">
                Switching users instantly shifts the active drop zone, staged ledger, and received transfers to that user's private storage:
              </div>

              <div className="space-y-2 pt-1">
                {workspaces.map((ws) => {
                  const isActive = ws.userId === currentWorkspace.userId;
                  return (
                    <div
                      key={ws.userId}
                      onClick={() => !isActive && onSelectWorkspace(ws)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-cyan-950/20 border-cyan-500/50 shadow-sm'
                          : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${ws.avatarColor} flex items-center justify-center text-white text-xs font-bold`}>
                          {ws.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                            <span>{ws.userName}</span>
                            {isActive && (
                              <span className="text-[10px] text-cyan-400 bg-cyan-950 border border-cyan-800 px-1.5 py-0.2 rounded font-mono">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            ID: {ws.userId} · {ws.deviceLabel}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isActive ? (
                          <span className="text-xs font-medium text-cyan-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="px-2.5 py-1 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
                          >
                            Switch
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="text-xs text-neutral-400">
                Create a completely independent workspace with its own private storage directory, independent staging queue, and isolated mobile sync channel.
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  User / Workstation Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kaif Mobile, Lab Terminal 2, Student Bob"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 focus:border-cyan-500 rounded-lg text-xs text-neutral-100 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Device Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. MacBook Pro, Android Phone, Linux Rig"
                  value={newUserDevice}
                  onChange={(e) => setNewUserDevice(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 focus:border-cyan-500 rounded-lg text-xs text-neutral-100 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!newUserName.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-bold text-xs rounded-xl transition-colors shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Create &amp; Switch to User</span>
              </button>
            </form>
          )}

          {activeTab === 'join' && (
            <form onSubmit={handleJoin} className="space-y-3.5">
              <div className="text-xs text-neutral-400">
                Connect this browser to another user's isolated channel by entering their User ID (found in their QR code URL or User modal):
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Target User ID
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. usr_a8b9c2"
                    value={joinUserId}
                    onChange={(e) => setJoinUserId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-700 focus:border-cyan-500 rounded-lg text-xs text-neutral-100 font-mono focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!joinUserId.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-bold text-xs rounded-xl transition-colors shadow"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Join Workspace Channel</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer Guarantee */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero Cross-Contamination Guaranteed</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
