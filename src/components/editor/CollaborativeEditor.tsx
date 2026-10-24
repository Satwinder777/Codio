'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import * as Y from 'yjs';
import { MonacoBinding } from '@/lib/yjs/MonacoBinding';
import type { editor } from 'monaco-editor';
import { 
  Room, 
  DocumentSnapshot, 
  MemberRole, 
  ConnectionStatus, 
  SaveStatus, 
  PeerPresence,
  CollaboratorUser 
} from '@/types';
import { SUPPORTED_LANGUAGES, getLanguageById } from '@/lib/languages';
import { SupabaseYjsProvider } from '@/lib/yjs/SupabaseYjsProvider';
import { getRandomColor } from '@/lib/yjs/utils';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { 
  Share2, 
  Save, 
  Check, 
  Copy, 
  Settings, 
  Download, 
  Code2, 
  Users, 
  Wifi, 
  WifiOff, 
  Lock, 
  Globe, 
  FileCode, 
  Eye, 
  Edit3,
  Maximize2,
  Minimize2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Dynamically import Monaco to prevent SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#090d16] text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <span className="text-sm font-medium tracking-wide">Initializing Codio IDE engine...</span>
      </div>
    </div>
  ),
});

interface CollaborativeEditorProps {
  initialRoom: Room;
  initialDocument: DocumentSnapshot;
  role: MemberRole;
  isOwner: boolean;
  canEdit: boolean;
}

export function CollaborativeEditor({
  initialRoom,
  initialDocument,
  role,
  isOwner,
  canEdit,
}: CollaborativeEditorProps) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [documentMeta, setDocumentMeta] = useState<DocumentSnapshot>(initialDocument);
  const [currentLanguage, setCurrentLanguage] = useState(initialDocument.language);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [peers, setPeers] = useState<PeerPresence[]>([]);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Editor preferences
  const [theme, setTheme] = useState<'codio-dark' | 'vs-dark' | 'light'>('codio-dark');
  const [fontSize, setFontSize] = useState<number>(14);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');
  const [minimap, setMinimap] = useState<boolean>(true);

  // Room update state in modal
  const [editTitle, setEditTitle] = useState(initialRoom.title);
  const [editVisibility, setEditVisibility] = useState(initialRoom.visibility);
  const [editAccessMode, setEditAccessMode] = useState(initialRoom.default_access_mode);
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestContentRef = useRef<string>(initialDocument.content_snapshot || '');
  const revisionRef = useRef<number>(initialDocument.revision);

  // Generate random client user identity
  const currentUserRef = useRef<CollaboratorUser>({
    id: typeof window !== 'undefined' ? localStorage.getItem('codio_user_id') || `user_${Math.random().toString(36).substring(2, 9)}` : 'anon',
    name: typeof window !== 'undefined' ? localStorage.getItem('codio_user_name') || `Coder ${Math.floor(Math.random() * 900) + 100}` : 'Coder',
    color: getRandomColor(),
  });

  // Save debounced snapshot
  const triggerDebouncedSave = useCallback(() => {
    if (!canEdit) return;

    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        const content = latestContentRef.current;
        const res = await fetch(`/api/rooms/${room.public_id}/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            language: currentLanguage,
            revision: revisionRef.current,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          revisionRef.current = data.revision;
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error('Error saving snapshot:', err);
        setSaveStatus('error');
      }
    }, 1200);
  }, [canEdit, currentLanguage, room.public_id]);

  // Handle Monaco Mount
  const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;

    // Define Custom "Codio Obsidian Dark" Theme
    monaco.editor.defineTheme('codio-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', background: '090d16', foreground: 'e2e8f0' },
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: '38bdf8' },
        { token: 'type', foreground: 'a78bfa' },
        { token: 'function', foreground: '60a5fa' },
        { token: 'delimiter', foreground: '94a3b8' },
      ],
      colors: {
        'editor.background': '#090d16',
        'editor.foreground': '#e2e8f0',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#818cf8',
        'editor.selectionBackground': '#312e8166',
        'editor.inactiveSelectionBackground': '#1e1b4b44',
        'editorCursor.foreground': '#6366f1',
        'editorWhitespace.foreground': '#1e293b',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#334155',
      },
    });

    monaco.editor.setTheme(theme);

    // Initialize Yjs Doc & Provider
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const ytext = ydoc.getText('monaco');

    // Populate initial text if ytext is empty
    if (initialDocument.content_snapshot && ytext.length === 0) {
      ytext.insert(0, initialDocument.content_snapshot);
    }

    const supabase = getSupabaseBrowserClient();

    const provider = new SupabaseYjsProvider(
      room.public_id,
      ydoc,
      currentUserRef.current,
      supabase,
      {
        onStatusChange: (status) => setConnectionStatus(status),
        onPeersChange: (newPeers) => setPeers(newPeers),
      }
    );
    providerRef.current = provider;

    // Attach Monaco Binding
    const model = editorInstance.getModel();
    if (model) {
      const binding = new MonacoBinding(ytext, model, editorInstance);
      bindingRef.current = binding;
    }

    // Track Cursor position
    editorInstance.onDidChangeCursorPosition((e) => {
      provider.updateCursor(e.position.lineNumber, e.position.column);
    });

    // Listen to changes to trigger debounced persistence
    editorInstance.onDidChangeModelContent(() => {
      latestContentRef.current = editorInstance.getValue();
      triggerDebouncedSave();
    });

    // Set read-only if user cannot edit
    editorInstance.updateOptions({
      readOnly: !canEdit,
      domReadOnly: !canEdit,
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, []);

  // Language Change Handler
  const handleLanguageChange = (newLangId: string) => {
    const lang = getLanguageById(newLangId);
    setCurrentLanguage(lang.monacoId);
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, lang.monacoId);
      }
    }
    toast.success(`Language switched to ${lang.name}`);
    triggerDebouncedSave();
  };

  // Copy Link Handler
  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Room link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy link. Please copy the URL manually.');
    }
  };

  // Format Code
  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
      toast.success('Formatted code');
    }
  };

  // Download Code
  const handleDownloadCode = () => {
    const content = latestContentRef.current;
    const lang = getLanguageById(currentLanguage);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${room.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}${lang.extension}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${link.download}`);
  };

  // Update Room Settings (Owner Only)
  const handleSaveRoomSettings = async () => {
    setIsUpdatingRoom(true);
    try {
      const res = await fetch(`/api/rooms/${room.public_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          visibility: editVisibility,
          defaultAccessMode: editAccessMode,
        }),
      });

      if (res.ok) {
        setRoom((prev) => ({
          ...prev,
          title: editTitle,
          visibility: editVisibility,
          default_access_mode: editAccessMode,
        }));
        setShowSettingsModal(false);
        toast.success('Room settings saved successfully');
      } else {
        toast.error('Failed to update room settings');
      }
    } catch {
      toast.error('Network error updating room');
    } finally {
      setIsUpdatingRoom(false);
    }
  };

  const selectedLangObj = getLanguageById(currentLanguage);

  return (
    <div className={`flex flex-col bg-[#090d16] text-slate-100 ${isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-64px)]'}`}>
      {/* Top Action Bar */}
      <header className="glass-panel border-b border-white/[0.08] px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap select-none z-10">
        {/* Left: Title & Room Details */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-wide truncate max-w-[200px] md:max-w-[320px] text-sm">
              {room.title}
            </span>
            {room.visibility === 'private' ? (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
                <Lock className="w-3 h-3" /> Private
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                <Globe className="w-3 h-3" /> {room.visibility === 'public' ? 'Public' : 'Shareable Link'}
              </span>
            )}
            {!canEdit && (
              <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/20">
                <Eye className="w-3 h-3" /> Read-Only
              </span>
            )}
          </div>
        </div>

        {/* Center: Language & Theme Controls */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative">
            <select
              value={selectedLangObj.id}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={!canEdit}
              className="bg-slate-900/90 text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-white/10 hover:border-indigo-500/50 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer font-medium"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.id} value={l.id} className="bg-slate-900 text-slate-200">
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Selector */}
          <select
            value={theme}
            onChange={(e: any) => {
              setTheme(e.target.value);
              monacoRef.current?.editor.setTheme(e.target.value);
            }}
            className="hidden sm:inline-block bg-slate-900/90 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 border border-white/10 hover:border-indigo-500/50 focus:outline-none transition-all cursor-pointer"
          >
            <option value="codio-dark" className="bg-slate-900 text-slate-200">Codio Obsidian</option>
            <option value="vs-dark" className="bg-slate-900 text-slate-200">VS Dark</option>
            <option value="light" className="bg-slate-900 text-slate-200">Light</option>
          </select>
        </div>

        {/* Right: Presence, Status Badges & Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Active Collaborators Presence Stack */}
          <div className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-full border border-white/[0.06]">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">
              {peers.length + 1}
            </span>
            <div className="flex -space-x-1.5 ml-1">
              {/* Current User Pill */}
              <div
                title={`${currentUserRef.current.name} (You)`}
                className="w-5 h-5 rounded-full border-2 border-[#090d16] flex items-center justify-center text-[10px] font-bold text-white uppercase shadow"
                style={{ backgroundColor: currentUserRef.current.color }}
              >
                {currentUserRef.current.name.charAt(0)}
              </div>
              {/* Peers */}
              {peers.slice(0, 3).map((peer) => (
                <div
                  key={peer.clientId}
                  title={peer.user.name}
                  className="w-5 h-5 rounded-full border-2 border-[#090d16] flex items-center justify-center text-[10px] font-bold text-white uppercase shadow"
                  style={{ backgroundColor: peer.user.color }}
                >
                  {peer.user.name.charAt(0)}
                </div>
              ))}
              {peers.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-slate-700 border-2 border-[#090d16] flex items-center justify-center text-[9px] text-slate-200 font-bold">
                  +{peers.length - 3}
                </div>
              )}
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-slate-900/60 border border-white/[0.06]">
            {connectionStatus === 'connected' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-medium hidden sm:inline">Live</span>
              </>
            ) : connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400 font-medium hidden sm:inline">{connectionStatus}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400 font-medium hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          {/* Save Status Badge */}
          <div className="hidden md:flex items-center gap-1 text-xs text-slate-400">
            {saveStatus === 'saved' ? (
              <span className="text-slate-400 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" /> Saved
              </span>
            ) : saveStatus === 'saving' ? (
              <span className="text-amber-400 flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full border border-amber-400 border-t-transparent animate-spin" /> Saving...
              </span>
            ) : saveStatus === 'unsaved' ? (
              <span className="text-slate-400">Unsaved edits</span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Save failed
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <button
            onClick={handleFormatCode}
            title="Format Code"
            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/5"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownloadCode}
            title="Download Code"
            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/5"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Share Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md glow-primary transition-all active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          {/* Settings Modal (Owner Only or general preferences) */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Room Settings"
            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/5"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/5"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Editor Canvas Container */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <MonacoEditor
          height="100%"
          language={selectedLangObj.monacoId}
          onMount={handleEditorDidMount}
          options={{
            fontSize: fontSize,
            wordWrap: wordWrap,
            minimap: { enabled: minimap },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 2,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
            padding: { top: 16, bottom: 16 },
            readOnly: !canEdit,
          }}
        />
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-indigo-400" /> Share Collaborative Room
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Anyone with this shareable link can join and collaborate in real-time.
            </p>

            <div className="mt-4 flex items-center gap-2 bg-slate-900/90 border border-white/10 rounded-xl p-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? window.location.href : ''}
                className="bg-transparent text-xs text-slate-200 w-full focus:outline-none px-2 select-all font-mono"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-slate-900/50 p-3 border border-white/5 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Access Mode:</span>
                <span className="font-semibold text-indigo-300 capitalize">{room.default_access_mode} Mode</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Visibility:</span>
                <span className="font-semibold text-emerald-300 capitalize">{room.visibility}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Real-time CRDT:</span>
                <span className="text-slate-200">Yjs + Supabase Provider</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" /> Room & Editor Settings
            </h3>

            {/* Room Settings (Owner Only) */}
            {isOwner && (
              <div className="mt-5 space-y-4 border-b border-white/10 pb-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Room Configuration (Owner)
                </h4>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Room Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Visibility</label>
                    <select
                      value={editVisibility}
                      onChange={(e: any) => setEditVisibility(e.target.value)}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="unlisted">Unlisted (Shareable Link)</option>
                      <option value="public">Public</option>
                      <option value="private">Private (Members Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Default Access</label>
                    <select
                      value={editAccessMode}
                      onChange={(e: any) => setEditAccessMode(e.target.value)}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="editor">Editor (Can edit code)</option>
                      <option value="viewer">Viewer (Read-only)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSaveRoomSettings}
                  disabled={isUpdatingRoom}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg transition"
                >
                  {isUpdatingRoom ? 'Saving Settings...' : 'Save Room Settings'}
                </button>
              </div>
            )}

            {/* Local Editor Preferences */}
            <div className="mt-5 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Personal Editor Preferences
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Font Size</label>
                  <select
                    value={fontSize}
                    onChange={(e) => {
                      const sz = Number(e.target.value);
                      setFontSize(sz);
                      editorRef.current?.updateOptions({ fontSize: sz });
                    }}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    {[12, 13, 14, 15, 16, 18, 20].map((s) => (
                      <option key={s} value={s}>{s}px</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Word Wrap</label>
                  <select
                    value={wordWrap}
                    onChange={(e: any) => {
                      setWordWrap(e.target.value);
                      editorRef.current?.updateOptions({ wordWrap: e.target.value });
                    }}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="on">Enabled</option>
                    <option value="off">Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={minimap}
                    onChange={(e) => {
                      setMinimap(e.target.checked);
                      editorRef.current?.updateOptions({ minimap: { enabled: e.target.checked } });
                    }}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Show Code Minimap</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
