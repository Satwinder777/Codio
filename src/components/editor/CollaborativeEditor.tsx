'use client';

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import * as Y from 'yjs';
import type { editor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import { MonacoBinding } from '@/lib/yjs/MonacoBinding';
import type {
  Room,
  DocumentSnapshot,
  MemberRole,
  ConnectionStatus,
  SaveStatus,
  PeerPresence,
  CollaboratorUser,
} from '@/types';
import { SUPPORTED_LANGUAGES, getLanguageById } from '@/lib/languages';
import { SupabaseYjsProvider } from '@/lib/yjs/SupabaseYjsProvider';
import { getRandomColor } from '@/lib/yjs/utils';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  Check,
  CircleAlert,
  Code2,
  Copy,
  Download,
  Edit3,
  Eye,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Share2,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const subscribeToHydration = () => () => {};

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading editor…
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

function registerEditorThemes(monaco: Monaco) {
  monaco.editor.defineTheme('codio-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '777A9B', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'B69CFF', fontStyle: 'bold' },
      { token: 'string', foreground: '5EEAD4' },
      { token: 'number', foreground: '7DD3FC' },
      { token: 'type', foreground: 'FDBA74' },
      { token: 'function', foreground: '93C5FD' },
    ],
    colors: {
      'editor.background': '#090B18',
      'editor.foreground': '#F1F0FF',
      'editorLineNumber.foreground': '#555875',
      'editorLineNumber.activeForeground': '#C4B5FD',
      'editor.selectionBackground': '#8B5CF640',
      'editor.inactiveSelectionBackground': '#8B5CF620',
      'editorCursor.foreground': '#67E8F9',
      'editorGutter.background': '#090B18',
    },
  });

  monaco.editor.defineTheme('codio-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
      { token: 'keyword', foreground: '6D28D9', fontStyle: 'bold' },
      { token: 'string', foreground: '047857' },
      { token: 'number', foreground: '0369A1' },
      { token: 'type', foreground: 'C2410C' },
      { token: 'function', foreground: '1D4ED8' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#0F172A',
      'editorLineNumber.foreground': '#94A3B8',
      'editorLineNumber.activeForeground': '#312E81',
      'editor.selectionBackground': '#DDD6FE',
      'editor.inactiveSelectionBackground': '#E2E8F0',
      'editorCursor.foreground': '#4F46E5',
      'editorGutter.background': '#FFFFFF',
    },
  });
}

function makeClientId(): string {
  try {
    return 'client_' + window.crypto.randomUUID();
  } catch {
    return 'client_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
  }
}

export function CollaborativeEditor({
  initialRoom,
  initialDocument,
  role,
  isOwner,
  canEdit,
}: CollaborativeEditorProps) {
  const [room, setRoom] = useState(initialRoom);
  const [currentLanguage, setCurrentLanguage] = useState(initialDocument.language);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [peers, setPeers] = useState<PeerPresence[]>([]);
  const [isDocumentReady, setIsDocumentReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(initialRoom.title);
  const [copied, setCopied] = useState(false);
  const [currentUser] = useState<CollaboratorUser>(() => ({
    id: typeof window === 'undefined' ? 'server-client' : makeClientId(),
    name: 'Coder',
    color: getRandomColor('Codio'),
  }));
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');
  const [minimap, setMinimap] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [lineCount, setLineCount] = useState(1);
  const [charCount, setCharCount] = useState(initialDocument.content_snapshot.length);
  const [editTitle, setEditTitle] = useState(initialRoom.title);
  const [editVisibility, setEditVisibility] = useState(initialRoom.visibility);
  const [editAccessMode, setEditAccessMode] = useState(initialRoom.default_access_mode);
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);

  const { theme } = useTheme();
  const editorTheme = theme === 'light' ? 'codio-light' : theme === 'dark' ? 'vs-dark' : 'codio-dark';
  const selectedLanguage = getLanguageById(currentLanguage);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const editorDisposablesRef = useRef<Array<{ dispose: () => void }>>([]);
  const currentUserRef = useRef(currentUser);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef(initialDocument.content_snapshot || '');
  const revisionRef = useRef(initialDocument.revision);
  const contentVersionRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef(false);

  const performSave = useCallback(async (): Promise<boolean> => {
    if (!canEdit) return false;
    if (saveInFlightRef.current) {
      pendingSaveRef.current = true;
      return false;
    }

    saveInFlightRef.current = true;
    setSaveStatus('saving');
    let content = latestContentRef.current;
    let contentVersion = contentVersionRef.current;
    let success = false;

    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch('/api/rooms/' + room.public_id + '/snapshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            language: currentLanguage,
            revision: revisionRef.current,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as { revision?: unknown };

        if (response.ok && typeof data.revision === 'number' && Number.isFinite(data.revision)) {
          revisionRef.current = data.revision;
          success = true;
          if (contentVersionRef.current !== contentVersion) {
            pendingSaveRef.current = true;
            setSaveStatus('unsaved');
          } else {
            setSaveStatus('saved');
          }
          break;
        }

        if (response.status === 409 && typeof data.revision === 'number' && Number.isFinite(data.revision)) {
          revisionRef.current = data.revision;
          content = latestContentRef.current;
          contentVersion = contentVersionRef.current;
          continue;
        }

        setSaveStatus('error');
        break;
      }
    } catch (error) {
      console.error('Error saving collaborative snapshot:', error);
      setSaveStatus('error');
    } finally {
      saveInFlightRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        window.setTimeout(() => {
          void performSave();
        }, 0);
      }
    }

    return success;
  }, [canEdit, currentLanguage, room.public_id]);

  const triggerDebouncedSave = useCallback(() => {
    if (!canEdit) return;
    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void performSave();
    }, 800);
  }, [canEdit, performSave]);

  const triggerImmediateSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const saved = await performSave();
    if (saved) toast.success('Changes saved');
    else if (!saveInFlightRef.current) toast.error('Could not save changes. Try again.');
  }, [performSave]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void triggerImmediateSave();
      }
      if (event.key === 'Escape') {
        setShowShare(false);
        setShowSettings(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerImmediateSave]);

  const handleEditorDidMount = useCallback((editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;
    registerEditorThemes(monaco);
    monaco.editor.setTheme(editorTheme);

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('monaco');
    const model = editorInstance.getModel();
    if (model) {
      bindingRef.current = new MonacoBinding(ytext, model, editorInstance);
      setLineCount(model.getLineCount());
      setCharCount(model.getValueLength());
    }

    const provider = new SupabaseYjsProvider(
      room.public_id,
      ydoc,
      currentUserRef.current,
      getSupabaseBrowserClient(),
      {
        initialSnapshot: {
          content: initialDocument.content_snapshot || '',
          revision: initialDocument.revision,
        },
        onStatusChange: setConnectionStatus,
        onPeersChange: setPeers,
        onInitialStateReady: () => setIsDocumentReady(true),
      },
    );
    providerRef.current = provider;

    editorDisposablesRef.current.push(
      editorInstance.onDidChangeCursorPosition((event) => {
        setCursorPos({ line: event.position.lineNumber, column: event.position.column });
        provider.updateCursor(event.position.lineNumber, event.position.column);
      }),
      editorInstance.onDidChangeModelContent(() => {
        const value = editorInstance.getValue();
        latestContentRef.current = value;
        contentVersionRef.current += 1;
        setLineCount(editorInstance.getModel()?.getLineCount() || 1);
        setCharCount(value.length);
        triggerDebouncedSave();
      }),
    );
    editorInstance.updateOptions({
      readOnly: true,
      domReadOnly: true,
      fontSize,
      wordWrap,
      minimap: { enabled: minimap },
    });
  }, [editorTheme, fontSize, initialDocument.content_snapshot, initialDocument.revision, minimap, room.public_id, triggerDebouncedSave, wordWrap]);

  useEffect(() => {
    monacoRef.current?.editor.setTheme(editorTheme);
  }, [editorTheme]);

  useEffect(() => {
    editorRef.current?.updateOptions({
      readOnly: !canEdit || !isDocumentReady,
      domReadOnly: !canEdit || !isDocumentReady,
    });
  }, [canEdit, isDocumentReady]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      editorDisposablesRef.current.forEach((disposable) => disposable.dispose());
      editorDisposablesRef.current = [];
      providerRef.current?.destroy();
      bindingRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, []);

  const handleLanguageChange = (languageId: string) => {
    const language = getLanguageById(languageId);
    setCurrentLanguage(language.monacoId);
    const model = editorRef.current?.getModel();
    if (model && monacoRef.current) monacoRef.current.editor.setModelLanguage(model, language.monacoId);
    triggerDebouncedSave();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/' + room.public_id);
      setCopied(true);
      toast.success('Room link copied');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Clipboard access failed. Copy the link from the address bar.');
    }
  };

  const handleRename = async () => {
    const title = titleInput.trim();
    if (!title || title === room.title) {
      setTitleInput(room.title);
      setIsEditingTitle(false);
      return;
    }
    try {
      const response = await fetch('/api/rooms/' + room.public_id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error('Request failed');
      setRoom((previous) => ({ ...previous, title }));
      setEditTitle(title);
      toast.success('Room name updated');
    } catch {
      toast.error('Could not update the room name');
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(latestContentRef.current);
      toast.success('Code copied');
    } catch {
      toast.error('Could not copy code');
    }
  };

  const handleDownloadCode = () => {
    const blob = new Blob([latestContentRef.current], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = room.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'codio_room';
    link.href = url;
    link.download = safeTitle + selectedLanguage.extension;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSaveRoomSettings = async () => {
    const title = editTitle.trim();
    if (!title) {
      toast.error('Room name cannot be empty');
      return;
    }
    setIsUpdatingRoom(true);
    try {
      const response = await fetch('/api/rooms/' + room.public_id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, visibility: editVisibility, defaultAccessMode: editAccessMode }),
      });
      if (!response.ok) throw new Error('Request failed');
      setRoom((previous) => ({
        ...previous,
        title,
        visibility: editVisibility,
        default_access_mode: editAccessMode,
      }));
      setTitleInput(title);
      setShowSettings(false);
      toast.success('Room settings saved');
    } catch {
      toast.error('Could not save room settings');
    } finally {
      setIsUpdatingRoom(false);
    }
  };

  const saveLabel = saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Unsaved changes';
  const connectionLabel = !isDocumentReady ? 'Syncing' : connectionStatus === 'connected' ? 'Live' : connectionStatus;
  const roleLabel = role === 'owner' ? 'Owner' : role === 'viewer' ? 'Viewer' : 'Editor';

  return (
    <div className={(isFullscreen
      ? 'fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-white text-slate-900 dark:bg-[#080a13] dark:text-slate-100'
      : 'flex h-[100dvh] flex-col overflow-hidden bg-white text-slate-900 dark:bg-[#080a13] dark:text-slate-100') + ' room-editor-enter'}>
      <header className="z-20 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-white/[0.08] dark:bg-[#0c0e1b]/95 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Code2 className="h-4 w-4 shrink-0 text-violet-500" />
            {isEditingTitle ? (
              <input
                autoFocus
                maxLength={100}
                value={titleInput}
                onChange={(event) => setTitleInput(event.target.value)}
                onBlur={() => void handleRename()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleRename();
                  if (event.key === 'Escape') {
                    setTitleInput(room.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="w-36 rounded border-b border-violet-400 bg-transparent px-1 py-0.5 text-sm font-semibold outline-none sm:w-52"
                aria-label="Room name"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!isOwner) return;
                  setTitleInput(room.title);
                  setIsEditingTitle(true);
                }}
                disabled={!isOwner}
                title={isOwner ? 'Rename room' : room.title}
                className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold hover:text-violet-600 disabled:cursor-default disabled:hover:text-inherit dark:hover:text-violet-300"
              >
                <span className="truncate">{room.title}</span>
                {isOwner && <Edit3 className="h-3 w-3 shrink-0 text-slate-400" />}
              </button>
            )}
          </div>
          {!canEdit && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
              <Eye className="h-3 w-3" /> Read only
            </span>
          )}
          <span className="hidden rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500 dark:bg-white/[0.06] dark:text-slate-400 sm:inline">{roleLabel}</span>
        </div>

        <label className="flex items-center gap-2">
          <span className="sr-only">Programming language</span>
          <select
            value={selectedLanguage.id}
            onChange={(event) => handleLanguageChange(event.target.value)}
            disabled={!canEdit}
            className="max-w-40 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium outline-none focus:border-violet-400 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900"
          >
            {SUPPORTED_LANGUAGES.map((language) => (
              <option key={language.id} value={language.id}>{language.name}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] sm:flex" title="Document save status">
            {saveStatus === 'error'
              ? <CircleAlert className="h-3.5 w-3.5 text-rose-500" />
              : saveStatus === 'saved'
                ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                : <LoaderCircle className="h-3.5 w-3.5 animate-spin text-amber-500" />}
            <span className="text-slate-500 dark:text-slate-400">{saveLabel}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-white/10" title="Online collaborators">
            <span className="relative flex h-2 w-2">
              <span className={'absolute inline-flex h-full w-full rounded-full opacity-60 ' + (connectionStatus === 'connected' ? 'animate-ping bg-emerald-400' : 'bg-amber-400')} />
              <span className={'relative inline-flex h-2 w-2 rounded-full ' + (connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500')} />
            </span>
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span>{peers.length + 1}</span>
            <span className="hidden text-slate-500 sm:inline">{connectionLabel}</span>
          </div>

          <ThemeToggle />
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-500"
          >
            <Share2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Share</span>
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              aria-label="Room settings"
              title="Room settings"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/[0.06]"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFullscreen((value) => !value)}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/[0.06]"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-white/[0.06] dark:bg-[#0a0c17] sm:px-4">
        <div className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
          <span className="font-mono">main{selectedLanguage.extension}</span>
          <span className="hidden text-slate-400 sm:inline">{lineCount} lines · {(charCount / 1024).toFixed(1)} KB</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void handleCopyCode()} title="Copy code" aria-label="Copy code" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-white/[0.08] dark:hover:text-white">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={handleDownloadCode} title="Download code" aria-label="Download code" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-white/[0.08] dark:hover:text-white">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <main className="relative min-h-0 flex-1 overflow-hidden bg-white dark:bg-[#090b18]">
        {mounted && (
          <MonacoEditor
            height="100%"
            language={selectedLanguage.monacoId}
            theme={editorTheme}
            onMount={handleEditorDidMount}
            options={{
              fontSize,
              wordWrap,
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
              readOnly: !canEdit || !isDocumentReady,
              domReadOnly: !canEdit || !isDocumentReady,
            }}
          />
        )}
        {!isDocumentReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs font-medium text-slate-500 backdrop-blur-[2px] dark:bg-[#090b18]/80 dark:text-slate-300">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin text-violet-500" /> Syncing the latest code…
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 dark:border-white/[0.06] dark:bg-[#0a0c17] sm:px-4">
        <div className="flex items-center gap-3">
          <span>{selectedLanguage.name}</span>
          <span className="hidden sm:inline">{connectionLabel}</span>
          {saveStatus === 'error' && <span className="text-rose-500">Changes could not be saved</span>}
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span>Ln {cursorPos.line}, Col {cursorPos.column}</span>
          <span className="hidden sm:inline">{lineCount} lines</span>
        </div>
      </footer>

      {showShare && (
        <div className="room-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowShare(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="share-room-title" className="room-dialog-enter w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#111426]">
            <div className="flex items-center justify-between">
              <h2 id="share-room-title" className="flex items-center gap-2 text-sm font-semibold"><Share2 className="h-4 w-4 text-violet-500" /> Share this room</h2>
              <button type="button" onClick={() => setShowShare(false)} aria-label="Close share dialog" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08]"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Send the room link to your collaborators. Room access follows its current settings.</p>
            <div className="flex gap-2">
              <input readOnly value={typeof window === 'undefined' ? '' : window.location.origin + '/' + room.public_id} aria-label="Room link" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none dark:border-white/10 dark:bg-[#090b18] dark:text-slate-200" onFocus={(event) => event.currentTarget.select()} />
              <button type="button" onClick={() => void handleCopyLink()} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </section>
        </div>
      )}

      {showSettings && isOwner && (
        <div className="room-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSettings(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="room-settings-title" className="room-dialog-enter max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#111426]">
            <div className="flex items-center justify-between">
              <h2 id="room-settings-title" className="flex items-center gap-2 text-sm font-semibold"><Settings className="h-4 w-4 text-violet-500" /> Room settings</h2>
              <button type="button" onClick={() => setShowSettings(false)} aria-label="Close settings" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08]"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-3 border-b border-slate-200 pb-4 dark:border-white/10">
              <label className="block space-y-1.5 text-xs font-medium">
                <span>Room name</span>
                <input maxLength={100} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-900" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 text-xs font-medium">
                  <span>Visibility</span>
                  <select value={editVisibility} onChange={(event) => setEditVisibility(event.target.value as typeof editVisibility)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 outline-none dark:border-white/10 dark:bg-slate-900">
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-medium">
                  <span>Default access</span>
                  <select value={editAccessMode} onChange={(event) => setEditAccessMode(event.target.value as typeof editAccessMode)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 outline-none dark:border-white/10 dark:bg-slate-900">
                    <option value="editor">Can edit</option>
                    <option value="viewer">View only</option>
                  </select>
                </label>
              </div>
              <button type="button" onClick={() => void handleSaveRoomSettings()} disabled={isUpdatingRoom} className="w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60">
                {isUpdatingRoom ? 'Saving…' : 'Save room settings'}
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Editor preferences</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 text-xs font-medium">
                  <span>Font size</span>
                  <select value={fontSize} onChange={(event) => {
                    const size = Number(event.target.value);
                    setFontSize(size);
                    editorRef.current?.updateOptions({ fontSize: size });
                  }} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 outline-none dark:border-white/10 dark:bg-slate-900">
                    {[12, 13, 14, 15, 16, 18, 20].map((size) => <option key={size} value={size}>{size}px</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-medium">
                  <span>Word wrap</span>
                  <select value={wordWrap} onChange={(event) => {
                    const value = event.target.value as 'on' | 'off';
                    setWordWrap(value);
                    editorRef.current?.updateOptions({ wordWrap: value });
                  }} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 outline-none dark:border-white/10 dark:bg-slate-900">
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </label>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={minimap} onChange={(event) => {
                  setMinimap(event.target.checked);
                  editorRef.current?.updateOptions({ minimap: { enabled: event.target.checked } });
                }} />
                Show minimap
              </label>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowSettings(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/[0.06]">Done</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
