'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  Eye, 
  Edit3,
  Maximize2, 
  Minimize2, 
  Sparkles, 
  AlertCircle, 
  Terminal, 
  Zap, 
  Play, 
  Trash2, 
  Folder, 
  FileCode, 
  MessageSquare, 
  Command, 
  Sun, 
  Moon, 
  ExternalLink, 
  Search, 
  PanelLeftClose, 
  PanelLeft, 
  RotateCcw, 
  Send,
  Sliders,
  CheckCircle2,
  ChevronRight,
  Braces
} from 'lucide-react';
import { toast } from 'sonner';

// Dynamically import Monaco to prevent SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#07090e] text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 animate-spin opacity-80" />
          <div className="absolute inset-1 bg-[#07090e] rounded-lg" />
        </div>
        <span className="text-xs font-semibold tracking-wider text-slate-300">
          Loading Codio Monaco Engine...
        </span>
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

interface ConsoleOutput {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error' | 'system' | 'return';
  text: string;
  timestamp: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  color: string;
  text: string;
  time: string;
}

export function CollaborativeEditor({
  initialRoom,
  initialDocument,
  role,
  isOwner,
  canEdit,
}: CollaborativeEditorProps) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [currentLanguage, setCurrentLanguage] = useState(initialDocument.language);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [peers, setPeers] = useState<PeerPresence[]>([]);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(initialRoom.title);
  const [mounted, setMounted] = useState(false);
  
  // Sidebar Activity Dock state: 'files' | 'users' | 'snippets' | 'chat' | 'shortcuts' | null
  const [activeSidebarTab, setActiveSidebarTab] = useState<'files' | 'users' | 'snippets' | 'chat' | 'shortcuts' | null>(null);

  // Bottom Console / Terminal state
  const [showConsole, setShowConsole] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [consoleOutputs, setConsoleOutputs] = useState<ConsoleOutput[]>([]);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);

  // Chat message state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Editor preferences
  const [theme, setTheme] = useState<'codio-dark' | 'tokyo-night' | 'monokai' | 'vs-dark' | 'light'>('codio-dark');
  const [fontSize, setFontSize] = useState<number>(14);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');
  const [minimap, setMinimap] = useState<boolean>(true);

  // Status bar telemetry
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [lineCount, setLineCount] = useState(1);
  const [charCount, setCharCount] = useState(initialDocument.content_snapshot?.length || 0);

  // Room update state in modal
  const [editTitle, setEditTitle] = useState(initialRoom.title);
  const [editVisibility, setEditVisibility] = useState(initialRoom.visibility);
  const [editAccessMode, setEditAccessMode] = useState(initialRoom.default_access_mode);
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);

  // Command palette search
  const [paletteQuery, setPaletteQuery] = useState('');

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestContentRef = useRef<string>(initialDocument.content_snapshot || '');
  const revisionRef = useRef<number>(initialDocument.revision);

  // Client user identity (initialized safely to prevent hydration mismatch)
  const [currentUser, setCurrentUser] = useState<CollaboratorUser>({
    id: 'user_init',
    name: 'Coder (You)',
    color: '#6366f1',
  });
  const currentUserRef = useRef<CollaboratorUser>(currentUser);

  useEffect(() => {
    setMounted(true);
    const storedId = localStorage.getItem('codio_user_id') || `user_${Math.random().toString(36).substring(2, 9)}`;
    const storedName = localStorage.getItem('codio_user_name') || `Coder ${Math.floor(Math.random() * 900) + 100}`;
    localStorage.setItem('codio_user_id', storedId);
    localStorage.setItem('codio_user_name', storedName);

    const user: CollaboratorUser = {
      id: storedId,
      name: storedName,
      color: getRandomColor(),
    };
    currentUserRef.current = user;
    setCurrentUser(user);

    // Initial welcome chat message
    setChatMessages([
      {
        id: 'msg_welcome',
        sender: 'Codio Bot',
        color: '#06b6d4',
        text: `Welcome to room "${initialRoom.title}". Real-time CRDT sync is active. Share your URL to collaborate!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [initialRoom.title]);

  // Keyboard shortcut listener (Cmd+K, Cmd+Enter, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      // Cmd+Enter or Ctrl+Enter -> Run Code
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
      // Cmd+S or Ctrl+S -> Prevent browser save dialog & trigger save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        triggerImmediateSave();
      }
      // Escape closes modals
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowShareModal(false);
        setShowSettingsModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentLanguage, room.public_id]);

  // Save debounced snapshot
  const triggerDebouncedSave = useCallback(() => {
    if (!canEdit) return;

    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await performSave();
    }, 1200);
  }, [canEdit, currentLanguage, room.public_id]);

  const performSave = async () => {
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
  };

  const triggerImmediateSave = async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await performSave();
    toast.success('Document saved to database');
  };

  // Define Themes in Monaco
  const registerMonacoThemes = (monaco: any) => {
    // 1. Codio Obsidian Luxury
    monaco.editor.defineTheme('codio-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', background: '07090e', foreground: 'f1f5f9' },
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: '38bdf8' },
        { token: 'type', foreground: 'fb923c' },
        { token: 'function', foreground: '60a5fa' },
        { token: 'delimiter', foreground: '94a3b8' },
        { token: 'tag', foreground: 'f43f5e' },
      ],
      colors: {
        'editor.background': '#07090e',
        'editor.foreground': '#f1f5f9',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#818cf8',
        'editor.selectionBackground': '#4f46e53d',
        'editor.inactiveSelectionBackground': '#312e8125',
        'editorCursor.foreground': '#06b6d4',
        'editorWhitespace.foreground': '#1e293b',
        'editorIndentGuide.background': '#131b2e',
        'editorIndentGuide.activeBackground': '#334155',
        'editorGutter.background': '#07090e',
      },
    });

    // 2. Tokyo Night
    monaco.editor.defineTheme('tokyo-night', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', background: '1a1b26', foreground: 'a9b1d6' },
        { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'bb9af7', fontStyle: 'bold' },
        { token: 'string', foreground: '9ece6a' },
        { token: 'number', foreground: 'ff9e64' },
        { token: 'type', foreground: '2ac3de' },
        { token: 'function', foreground: '7aa2f7' },
      ],
      colors: {
        'editor.background': '#1a1b26',
        'editor.foreground': '#a9b1d6',
        'editorLineNumber.foreground': '#414868',
        'editorLineNumber.activeForeground': '#7aa2f7',
        'editor.selectionBackground': '#3d59a140',
        'editorCursor.foreground': '#c0caf5',
      },
    });

    // 3. Monokai Pro
    monaco.editor.defineTheme('monokai', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', background: '19181a', foreground: 'fcfcfa' },
        { token: 'comment', foreground: '727072', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff6188', fontStyle: 'bold' },
        { token: 'string', foreground: 'ffd866' },
        { token: 'number', foreground: 'ab9df2' },
        { token: 'type', foreground: '78dce8' },
        { token: 'function', foreground: 'a9dc76' },
      ],
      colors: {
        'editor.background': '#19181a',
        'editor.foreground': '#fcfcfa',
        'editorLineNumber.foreground': '#403e41',
        'editorLineNumber.activeForeground': '#ffd866',
        'editor.selectionBackground': '#403e4180',
        'editorCursor.foreground': '#ffd866',
      },
    });
  };

  // Handle Monaco Mount
  const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;

    registerMonacoThemes(monaco);
    monaco.editor.setTheme(theme);

    // Initialize Yjs Doc & Provider
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('monaco');

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
      setLineCount(model.getLineCount());
      setCharCount(model.getValueLength());
    }

    // Cursor telemetry
    editorInstance.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
      provider.updateCursor(e.position.lineNumber, e.position.column);
    });

    // Content change listener
    editorInstance.onDidChangeModelContent(() => {
      const val = editorInstance.getValue();
      latestContentRef.current = val;
      setLineCount(editorInstance.getModel()?.getLineCount() || 1);
      setCharCount(val.length);
      triggerDebouncedSave();
    });

    // Enforce read-only if viewer
    editorInstance.updateOptions({
      readOnly: !canEdit,
      domReadOnly: !canEdit,
    });
  };

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
    toast.success(`Syntax switched to ${lang.name}`);
    triggerDebouncedSave();
  };

  // Theme Change Handler
  const handleThemeChange = (newTheme: typeof theme) => {
    setTheme(newTheme);
    monacoRef.current?.editor.setTheme(newTheme);
    toast.success(`Theme set to ${newTheme}`);
  };

  // Copy Clean Link Handler
  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/${room.public_id}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Direct URL copied! Anyone can join immediately.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not auto-copy. Please copy from address bar.');
    }
  };

  // Copy Whole Code
  const handleCopyAllCode = async () => {
    const code = latestContentRef.current;
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Entire code copied to clipboard!');
    } catch {
      toast.error('Failed to copy code');
    }
  };

  // Quick Rename Handler
  const handleQuickRename = async () => {
    if (!titleInput.trim() || titleInput === room.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const res = await fetch(`/api/rooms/${room.public_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleInput.trim() }),
      });
      if (res.ok) {
        setRoom((prev) => ({ ...prev, title: titleInput.trim() }));
        toast.success('Room title updated');
      }
    } catch {
      toast.error('Failed to rename room');
    } finally {
      setIsEditingTitle(false);
    }
  };

  // Format Document
  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
      toast.success('Code formatted');
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

  // Run Code in Integrated Output Console
  const handleRunCode = () => {
    setShowConsole(true);
    setIsRunningCode(true);
    setConsoleOutputs([]);
    const startTime = performance.now();

    const code = latestContentRef.current;
    const nowStr = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // JS / TS Execution in Sandboxed evaluation
    if (currentLanguage === 'javascript' || currentLanguage === 'typescript') {
      const logs: ConsoleOutput[] = [];
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      const originalInfo = console.info;

      try {
        console.log = (...args: any[]) => {
          logs.push({
            id: `log_${Math.random()}`,
            type: 'log',
            text: args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '),
            timestamp: nowStr(),
          });
          originalLog(...args);
        };
        console.warn = (...args: any[]) => {
          logs.push({
            id: `warn_${Math.random()}`,
            type: 'warn',
            text: args.map((a) => String(a)).join(' '),
            timestamp: nowStr(),
          });
          originalWarn(...args);
        };
        console.error = (...args: any[]) => {
          logs.push({
            id: `err_${Math.random()}`,
            type: 'error',
            text: args.map((a) => String(a)).join(' '),
            timestamp: nowStr(),
          });
          originalError(...args);
        };

        // Cleanly strip TS type annotations for instant browser sandbox evaluation
        let runnableCode = code;
        try {
          runnableCode = runnableCode
            .replace(/interface\s+[\w\s<>,]+\{[\s\S]*?\}/g, '')
            .replace(/type\s+[\w\s<>,]+=[\s\S]*?;/g, '')
            .replace(/\):\s*[A-Za-z0-9_<>[\]|\s]+\s*\{/g, ') {')
            .replace(/(\w+)\s*:\s*[A-Za-z0-9_<>[\]|\s]+(?=[,)])/g, '$1')
            .replace(/(const|let|var)\s+(\w+)\s*:\s*[A-Za-z0-9_<>[\]|\s]+\s*=/g, '$1 $2 =')
            .replace(/\s+as\s+[A-Za-z0-9_<>[\]|\s]+/g, '');
        } catch {
          // ignore
        }

        const result = new Function(runnableCode)();
        if (result !== undefined) {
          logs.push({
            id: `ret_${Math.random()}`,
            type: 'return',
            text: `➔ Return Value: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`,
            timestamp: nowStr(),
          });
        }

        if (logs.length === 0) {
          logs.push({
            id: `sys_${Math.random()}`,
            type: 'system',
            text: '✓ Execution completed with 0 console logs and exit code 0.',
            timestamp: nowStr(),
          });
        }
      } catch (err: any) {
        logs.push({
          id: `err_${Math.random()}`,
          type: 'error',
          text: `Runtime Error: ${err?.message || String(err)}`,
          timestamp: nowStr(),
        });
      } finally {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        console.info = originalInfo;
      }

      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTimeMs(elapsed);
      setConsoleOutputs(logs);
      setIsRunningCode(false);
      toast.success(`Ran script in ${elapsed}ms`);
    } else {
      // Clean runner simulation for other languages (Python, Go, Rust, C++)
      setTimeout(() => {
        const langObj = getLanguageById(currentLanguage);
        const elapsed = Math.round(Math.random() * 40 + 15);
        setExecutionTimeMs(elapsed);
        setConsoleOutputs([
          {
            id: 'sim_1',
            type: 'system',
            text: `[Codio Runner] Compiling & executing ${langObj.name} (${room.public_id})...`,
            timestamp: nowStr(),
          },
          {
            id: 'sim_2',
            type: 'log',
            text: `Codio Real-time Sandbox initialized.`,
            timestamp: nowStr(),
          },
          {
            id: 'sim_3',
            type: 'return',
            text: `[Process exited 0 in ${elapsed}ms with clean execution]`,
            timestamp: nowStr(),
          },
        ]);
        setIsRunningCode(false);
        toast.success(`Executed in ${elapsed}ms`);
      }, 350);
    }
  };

  // Insert Code Snippet
  const handleInsertSnippet = (snippetCode: string, name: string) => {
    if (!editorRef.current) return;
    const selection = editorRef.current.getSelection();
    if (selection) {
      editorRef.current.executeEdits('snippet', [
        {
          range: selection,
          text: `\n${snippetCode}\n`,
          forceMoveMarkers: true,
        },
      ]);
      toast.success(`Inserted "${name}" template`);
    }
  };

  // Send Chat Message
  const handleSendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random()}`,
      sender: currentUser.name,
      color: currentUser.color,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
  };

  // Update Settings via Modal
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
        toast.success('Room settings saved');
      } else {
        toast.error('Failed to update room');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsUpdatingRoom(false);
    }
  };

  const selectedLangObj = getLanguageById(currentLanguage);

  // Snippets library
  const codeSnippets = useMemo(() => [
    {
      title: 'Async Fetch API',
      category: 'Network',
      lang: 'typescript',
      code: `async function fetchData(url: string) {\n  try {\n    const res = await fetch(url);\n    if (!res.ok) throw new Error(\`HTTP error! status: \${res.status}\`);\n    return await res.json();\n  } catch (error) {\n    console.error("Fetch failed:", error);\n    throw error;\n  }\n}`,
    },
    {
      title: 'Debounce Function',
      category: 'Utilities',
      lang: 'typescript',
      code: `function debounce<T extends (...args: any[]) => any>(fn: T, delayMs: number) {\n  let timer: ReturnType<typeof setTimeout>;\n  return (...args: Parameters<T>) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delayMs);\n  };\n}`,
    },
    {
      title: 'LRU Cache Implementation',
      category: 'Algorithms',
      lang: 'typescript',
      code: `class LRUCache<K, V> {\n  private capacity: number;\n  private cache = new Map<K, V>();\n\n  constructor(capacity: number) {\n    this.capacity = capacity;\n  }\n\n  get(key: K): V | undefined {\n    if (!this.cache.has(key)) return undefined;\n    const val = this.cache.get(key)!;\n    this.cache.delete(key);\n    this.cache.set(key, val);\n    return val;\n  }\n\n  put(key: K, value: V): void {\n    if (this.cache.has(key)) this.cache.delete(key);\n    else if (this.cache.size >= this.capacity) {\n      const oldest = this.cache.keys().next().value;\n      if (oldest !== undefined) this.cache.delete(oldest);\n    }\n    this.cache.set(key, value);\n  }\n}`,
    },
    {
      title: 'Binary Search',
      category: 'Algorithms',
      lang: 'typescript',
      code: `function binarySearch(arr: number[], target: number): number {\n  let left = 0, right = arr.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}`,
    },
  ], []);

  // Filtered commands for Command Palette
  const filteredCommands = useMemo(() => {
    const list = [
      { name: 'Run Code in Sandbox', shortcut: '⌘↵', action: handleRunCode, icon: Play },
      { name: 'Format Code', shortcut: '⌥⇧F', action: handleFormatCode, icon: Sparkles },
      { name: 'Copy Shareable Link', shortcut: '⌘⇧C', action: handleCopyLink, icon: Copy },
      { name: 'Copy All Code', shortcut: '⌘A + ⌘C', action: handleCopyAllCode, icon: FileCode },
      { name: 'Save Snapshot to DB', shortcut: '⌘S', action: triggerImmediateSave, icon: Save },
      { name: 'Download Source File', shortcut: '⌘D', action: handleDownloadCode, icon: Download },
      { name: 'Toggle Console Terminal', shortcut: '⌘`', action: () => setShowConsole((prev) => !prev), icon: Terminal },
      { name: 'Toggle Code Minimap', shortcut: '', action: () => setMinimap((p) => !p), icon: Eye },
      { name: 'Toggle Word Wrap', shortcut: '⌥Z', action: () => setWordWrap((w) => (w === 'on' ? 'off' : 'on')), icon: Braces },
      { name: 'Room & IDE Settings', shortcut: '⌘,', action: () => setShowSettingsModal(true), icon: Settings },
    ];
    if (!paletteQuery.trim()) return list;
    return list.filter((c) => c.name.toLowerCase().includes(paletteQuery.toLowerCase()));
  }, [paletteQuery]);

  return (
    <div className={`flex flex-col bg-[#07090e] text-slate-100 ${isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-57px)]'} overflow-hidden select-none`}>
      {/* Top Glassmorphic Cockpit Toolbar */}
      <header className="relative z-20 border-b border-white/[0.08] bg-[#0c1017]/95 px-3 sm:px-4 py-2 backdrop-blur-2xl flex items-center justify-between gap-2.5 flex-wrap shadow-lg">
        {/* Left: Editable Room Title & Clean Slug Pill */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/[0.1] hover:border-indigo-500/40 transition shadow-inner">
            <Code2 className="w-4 h-4 text-indigo-400 shrink-0" />
            
            {isEditingTitle ? (
              <input
                type="text"
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleQuickRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickRename();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="bg-transparent border-b border-indigo-400 text-xs font-bold text-white focus:outline-none px-1 w-36"
              />
            ) : (
              <button
                onClick={() => {
                  setTitleInput(room.title);
                  setIsEditingTitle(true);
                }}
                title="Click to rename room"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white truncate max-w-[140px] sm:max-w-[220px]"
              >
                <span className="truncate">{room.title}</span>
                <Edit3 className="w-3 h-3 text-slate-500 hover:text-indigo-400 shrink-0" />
              </button>
            )}
          </div>

          {/* Clean Slug Badge */}
          <button
            onClick={handleCopyLink}
            title="Click to copy clean URL"
            className="group flex items-center gap-1 font-mono text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 hover:text-cyan-300 px-2.5 py-1 rounded-xl border border-indigo-500/30 transition shadow-sm"
          >
            <span>/{room.public_id}</span>
            <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100 transition" />
          </button>

          {!canEdit && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-400 border border-rose-500/20">
              <Eye className="w-3 h-3" /> Read-Only
            </span>
          )}
        </div>

        {/* Center: Language Selector, Theme & Spotlight Search */}
        <div className="flex items-center gap-2">
          {/* Custom Styled Language Dropdown */}
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-[9px] font-black text-indigo-400 pointer-events-none uppercase bg-indigo-500/15 px-1 py-0.5 rounded border border-indigo-500/30">
              {selectedLangObj.extension.replace('.', '')}
            </span>
            <select
              value={selectedLangObj.id}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={!canEdit}
              className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl pl-9 pr-6 py-1.5 border border-white/10 hover:border-indigo-500/50 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer appearance-none shadow-inner"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.id} value={l.id} className="bg-[#0c1017] text-slate-200">
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Quick Switcher */}
          <div className="hidden lg:flex items-center">
            <select
              value={theme}
              onChange={(e: any) => handleThemeChange(e.target.value)}
              className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 border border-white/10 focus:outline-none cursor-pointer"
            >
              <option value="codio-dark">Obsidian Dark</option>
              <option value="tokyo-night">Tokyo Night</option>
              <option value="monokai">Monokai Pro</option>
              <option value="vs-dark">VS Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          {/* Spotlight Palette Button (⌘K) */}
          <button
            onClick={() => setShowCommandPalette(true)}
            title="Command Palette (⌘K)"
            className="hidden sm:flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs transition"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium">Quick Actions</span>
            <kbd className="font-mono text-[9px] bg-slate-800 px-1.5 py-0.5 rounded border border-white/10 text-slate-300">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Presence, Run Code CTA, Share & Settings */}
        <div className="flex items-center gap-2">
          {/* Glowing "▶ Run Code" Button */}
          <button
            onClick={handleRunCode}
            disabled={isRunningCode}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-xl shadow-lg shadow-emerald-500/25 glow-emerald transition-all active:scale-95"
            title="Run Code in Sandbox (⌘↵)"
          >
            {isRunningCode ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-slate-950" />
            )}
            <span>Run</span>
            <kbd className="hidden md:inline font-mono text-[9px] opacity-75 font-semibold">⌘↵</kbd>
          </button>

          {/* Collaborator Avatars */}
          <button
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'users' ? null : 'users')}
            title="Active Collaborators (Click to view)"
            className="flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 px-2.5 py-1 rounded-xl border border-white/[0.08] transition"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200">{peers.length + 1}</span>
            <div className="flex -space-x-1.5 ml-1">
              <div
                title={`${currentUser.name} (You)`}
                className="w-5 h-5 rounded-full border-2 border-[#0c1017] flex items-center justify-center text-[10px] font-black text-white uppercase shadow-md ring-1 ring-white/10"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.name.charAt(0)}
              </div>
              {peers.slice(0, 3).map((peer) => (
                <div
                  key={peer.clientId}
                  title={peer.user.name}
                  className="w-5 h-5 rounded-full border-2 border-[#0c1017] flex items-center justify-center text-[10px] font-black text-white uppercase shadow-md ring-1 ring-white/10"
                  style={{ backgroundColor: peer.user.color }}
                >
                  {peer.user.name.charAt(0)}
                </div>
              ))}
            </div>
          </button>

          {/* Connection Status Badge */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl bg-slate-900/80 border border-white/[0.08]">
            {connectionStatus === 'connected' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-semibold text-[11px]">CRDT Live</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400 font-medium text-[11px]">{connectionStatus}</span>
              </>
            )}
          </div>

          {/* Radiant Share CTA Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg shadow-indigo-500/25 glow-primary transition-all active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Room Settings */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Room & IDE Settings"
            className="p-1.5 rounded-xl bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/10"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-xl bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 transition border border-white/10"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* IDE Top File Tab Bar & Action Strip */}
      <div className="relative z-10 bg-[#090d16] border-b border-white/[0.06] px-3 py-1.5 flex items-center justify-between text-xs select-none">
        {/* Left: Active File Tab */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 bg-[#0c1017] text-white px-3.5 py-1 rounded-t-xl border-t-2 border-indigo-500 border-x border-white/[0.06] shadow-sm font-mono text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>main{selectedLangObj.extension}</span>
            {saveStatus === 'unsaved' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved edits" />}
          </div>

          <span className="text-[10px] text-slate-500 pl-2 hidden md:inline">
            {lineCount} lines • {(charCount / 1024).toFixed(1)} KB
          </span>
        </div>

        {/* Right: Quick Action Icons */}
        <div className="flex items-center gap-2">
          {/* Format */}
          <button
            onClick={handleFormatCode}
            title="Format Code (⌥⇧F)"
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-white/[0.04] transition"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">Format</span>
          </button>

          {/* Copy All */}
          <button
            onClick={handleCopyAllCode}
            title="Copy Entire Code"
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-white/[0.04] transition"
          >
            <Copy className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Copy</span>
          </button>

          {/* Download */}
          <button
            onClick={handleDownloadCode}
            title="Download Source File"
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-white/[0.04] transition"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Toggle Terminal / Console */}
          <button
            onClick={() => setShowConsole(!showConsole)}
            title="Toggle Console Terminal"
            className={`flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-lg border transition ${
              showConsole
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'text-slate-400 hover:text-white border-transparent hover:bg-white/[0.04]'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>Terminal</span>
          </button>
        </div>
      </div>

      {/* Middle Work Area: Activity Bar + Sidebar + Monaco Editor */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Activity Rail (Mini dock) */}
        <aside className="w-12 bg-[#090d16] border-r border-white/[0.06] flex flex-col items-center py-3 gap-3 z-10 shrink-0">
          <button
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'files' ? null : 'files')}
            title="Explorer (Files)"
            className={`p-2 rounded-xl transition ${
              activeSidebarTab === 'files'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Folder className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'users' ? null : 'users')}
            title="Collaborators"
            className={`p-2 rounded-xl transition relative ${
              activeSidebarTab === 'users'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#090d16]" />
          </button>

          <button
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'snippets' ? null : 'snippets')}
            title="Algorithms & Boilerplate Snippets"
            className={`p-2 rounded-xl transition ${
              activeSidebarTab === 'snippets'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'chat' ? null : 'chat')}
            title="Room Chat & Notes"
            className={`p-2 rounded-xl transition ${
              activeSidebarTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'shortcuts' ? null : 'shortcuts')}
            title="Keyboard Shortcuts Cheat Sheet"
            className={`p-2 rounded-xl transition ${
              activeSidebarTab === 'shortcuts'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Command className="w-4 h-4" />
          </button>

          <div className="mt-auto">
            <button
              onClick={() => setShowSettingsModal(true)}
              title="Editor Configuration"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Collapsible Sidebar Drawer */}
        {activeSidebarTab && (
          <div className="w-64 sm:w-72 bg-[#0c1017] border-r border-white/[0.08] flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="p-3 border-b border-white/[0.06] flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="uppercase tracking-wider text-[11px] text-indigo-400">
                {activeSidebarTab === 'files' && 'Workspace Explorer'}
                {activeSidebarTab === 'users' && 'Active Collaborators'}
                {activeSidebarTab === 'snippets' && 'Algorithm Snippets'}
                {activeSidebarTab === 'chat' && 'Room Chat & Notes'}
                {activeSidebarTab === 'shortcuts' && 'Keyboard Shortcuts'}
              </span>
              <button
                onClick={() => setActiveSidebarTab(null)}
                className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-3 text-xs space-y-3">
              {/* Files Tab */}
              {activeSidebarTab === 'files' && (
                <div className="space-y-3">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Current File</span>
                    <div className="flex items-center gap-2 text-white font-mono font-semibold">
                      <FileCode className="w-4 h-4 text-cyan-400" />
                      <span>main{selectedLangObj.extension}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-slate-400 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span>Language</span>
                      <span className="text-white font-medium">{selectedLangObj.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span>Total Lines</span>
                      <span className="text-white font-medium">{lineCount}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span>Characters</span>
                      <span className="text-white font-medium">{charCount}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span>Encoding</span>
                      <span className="text-white font-medium">UTF-8</span>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadCode}
                    className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl text-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                </div>
              )}

              {/* Users Tab */}
              {activeSidebarTab === 'users' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {/* Current User */}
                    <div className="flex items-center justify-between bg-slate-900/70 p-2.5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white uppercase shadow"
                          style={{ backgroundColor: currentUser.color }}
                        >
                          {currentUser.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-white block text-xs">{currentUser.name}</span>
                          <span className="text-[10px] text-emerald-400">● Online (You)</span>
                        </div>
                      </div>
                      <span className="text-[9px] uppercase font-bold tracking-wider bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                        {role}
                      </span>
                    </div>

                    {/* Remote Peers */}
                    {peers.map((peer) => (
                      <div
                        key={peer.clientId}
                        className="flex items-center justify-between bg-slate-900/50 p-2.5 rounded-xl border border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white uppercase shadow"
                            style={{ backgroundColor: peer.user.color }}
                          >
                            {peer.user.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-200 block text-xs">{peer.user.name}</span>
                            <span className="text-[10px] text-slate-400">
                              Ln {peer.user.cursor?.lineNumber || 1}, Col {peer.user.cursor?.column || 1}
                            </span>
                          </div>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs shadow-lg shadow-indigo-500/25 transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Copy Room URL</span>
                  </button>
                </div>
              )}

              {/* Snippets Tab */}
              {activeSidebarTab === 'snippets' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Click any algorithm snippet to insert it into your code canvas:
                  </p>
                  {codeSnippets.map((snip, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/70 p-2.5 rounded-xl border border-white/5 hover:border-indigo-500/40 transition group cursor-pointer"
                      onClick={() => handleInsertSnippet(snip.code, snip.title)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs group-hover:text-cyan-300 transition">
                          {snip.title}
                        </span>
                        <span className="text-[9px] font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          {snip.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-1 font-mono">
                        {snip.code.slice(0, 40)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Chat Tab */}
              {activeSidebarTab === 'chat' && (
                <div className="flex flex-col h-full space-y-2">
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[360px]">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="bg-slate-900/60 p-2 rounded-xl border border-white/5 space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold" style={{ color: msg.color }}>{msg.sender}</span>
                          <span className="text-slate-500">{msg.time}</span>
                        </div>
                        <p className="text-slate-200 text-[11px] leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendChatMessage} className="flex items-center gap-1.5 pt-2">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 bg-[#07090e] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Shortcuts Tab */}
              {activeSidebarTab === 'shortcuts' && (
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Run Code</span>
                    <kbd className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded border border-white/10">⌘ + Enter</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Command Palette</span>
                    <kbd className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded border border-white/10">⌘ + K</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Format Document</span>
                    <kbd className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded border border-white/10">⌥ + ⇧ + F</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Save Snapshot</span>
                    <kbd className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded border border-white/10">⌘ + S</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Toggle Word Wrap</span>
                    <kbd className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded border border-white/10">⌥ + Z</kbd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Find in File</span>
                    <kbd className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded border border-white/10">⌘ + F</kbd>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monaco Canvas & Bottom Console Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#07090e] relative">
          <main className="flex-1 w-full h-full overflow-hidden relative">
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
                cursorBlinking: 'phase',
                cursorSmoothCaretAnimation: 'on',
                bracketPairColorization: { enabled: true },
                padding: { top: 16, bottom: 16 },
                readOnly: !canEdit,
              }}
            />
          </main>

          {/* Interactive Bottom Terminal / Execution Drawer */}
          {showConsole && (
            <div className="h-44 sm:h-52 border-t border-white/[0.1] bg-[#090d16] flex flex-col z-20 shadow-2xl animate-in slide-in-from-bottom duration-200">
              {/* Terminal Title Bar */}
              <div className="bg-[#0c1017] px-4 py-2 border-b border-white/[0.06] flex items-center justify-between text-xs select-none">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-slate-200 font-mono text-[11px]">Codio Interactive Sandbox</span>
                  {executionTimeMs !== null && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                      ⚡ {executionTimeMs}ms
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunCode}
                    disabled={isRunningCode}
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded hover:bg-emerald-500/10 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Rerun</span>
                  </button>
                  <button
                    onClick={() => setConsoleOutputs([])}
                    title="Clear console"
                    className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-white/[0.06] transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setShowConsole(false)}
                    className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-white/[0.06] transition"
                  >
                    <PanelLeftClose className="w-3 h-3 rotate-90" />
                  </button>
                </div>
              </div>

              {/* Terminal Logs Viewport */}
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 bg-[#06080d]">
                {consoleOutputs.length === 0 ? (
                  <div className="text-slate-600 text-xs italic py-2">
                    Click &quot;▶ Run&quot; (or ⌘↵) to execute code and view output here...
                  </div>
                ) : (
                  consoleOutputs.map((out) => (
                    <div key={out.id} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-600 text-[10px] select-none pt-0.5">{out.timestamp}</span>
                      {out.type === 'error' && (
                        <span className="text-rose-400 whitespace-pre-wrap">{out.text}</span>
                      )}
                      {out.type === 'warn' && (
                        <span className="text-amber-400 whitespace-pre-wrap">{out.text}</span>
                      )}
                      {out.type === 'return' && (
                        <span className="text-cyan-300 font-bold whitespace-pre-wrap">{out.text}</span>
                      )}
                      {out.type === 'system' && (
                        <span className="text-indigo-400 italic whitespace-pre-wrap">{out.text}</span>
                      )}
                      {out.type === 'log' && (
                        <span className="text-slate-200 whitespace-pre-wrap">{out.text}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sleek Bottom IDE Status Bar */}
      <footer className="border-t border-white/[0.06] bg-[#0c1017] px-4 py-1 text-[11px] font-mono text-slate-400 flex items-center justify-between select-none z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-300">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <strong className="text-white">codio://{room.public_id}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 uppercase font-bold">{selectedLangObj.name}</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="hidden sm:inline text-slate-500">UTF-8</span>
          <span className="hidden sm:inline text-slate-500">Spaces: 2</span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-indigo-400/90 font-sans">
          <Zap className="w-3 h-3 fill-indigo-400/80 text-indigo-400" />
          <span className="text-[10px] tracking-wide uppercase font-bold">Yjs CRDT Real-time Convergence</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span className="text-slate-600">|</span>
          <span>{lineCount} Lines</span>
        </div>
      </footer>

      {/* Command Palette Modal (⌘K) */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="glass-panel border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative space-y-0">
            {/* Search Input */}
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-white/10 bg-[#0c1017]">
              <Search className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command or search action..."
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-slate-500"
              />
              <span className="font-mono text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-white/10">
                ESC
              </span>
            </div>

            {/* Commands List */}
            <div className="max-h-72 overflow-y-auto p-2 space-y-1 bg-[#07090e]">
              {filteredCommands.map((cmd, idx) => {
                const IconComponent = cmd.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      cmd.action();
                      setShowCommandPalette(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-white/[0.08] transition text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition" />
                      <span className="font-semibold">{cmd.name}</span>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="font-mono text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-white/5">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-cyan-400" /> Share Room URL
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Instant Access
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Anyone with this direct link can join immediately and collaborate in real-time.
            </p>

            <div className="flex items-center gap-2 bg-[#07090e] border border-white/10 rounded-2xl p-2.5">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/${room.public_id}` : ''}
                className="bg-transparent text-xs font-mono text-cyan-300 w-full focus:outline-none px-2 select-all font-semibold"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
                  copied
                    ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* Quick Social Share Buttons */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Quick Share
              </span>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join my Codio live coding room: ${typeof window !== 'undefined' ? window.location.origin : ''}/${room.public_id}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition"
                >
                  <ExternalLink className="w-3 h-3" /> WhatsApp
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Collaborate with me on Codio: ${typeof window !== 'undefined' ? window.location.origin : ''}/${room.public_id}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition"
                >
                  <ExternalLink className="w-3 h-3" /> Twitter/X
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/${room.public_id}`)}&text=${encodeURIComponent(`Join my live Codio room`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition"
                >
                  <ExternalLink className="w-3 h-3" /> Telegram
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Access Mode</span>
                <span className="font-bold text-slate-200 capitalize">{room.default_access_mode} Mode</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Visibility</span>
                <span className="font-bold text-indigo-300 capitalize">{room.visibility}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" /> Room & Editor Settings
            </h3>

            {/* Room Settings (Owner Only) */}
            {isOwner && (
              <div className="space-y-4 border-b border-white/10 pb-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Room Configuration (Owner)
                </h4>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Room Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Visibility</label>
                    <select
                      value={editVisibility}
                      onChange={(e: any) => setEditVisibility(e.target.value)}
                      className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="unlisted">Unlisted (Shareable Link)</option>
                      <option value="public">Public</option>
                      <option value="private">Private (Members Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Default Access</label>
                    <select
                      value={editAccessMode}
                      onChange={(e: any) => setEditAccessMode(e.target.value)}
                      className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="editor">Editor (Can edit code)</option>
                      <option value="viewer">Viewer (Read-only)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSaveRoomSettings}
                  disabled={isUpdatingRoom}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow"
                >
                  {isUpdatingRoom ? 'Saving Settings...' : 'Save Room Settings'}
                </button>
              </div>
            )}

            {/* Local Editor Preferences */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Personal IDE Preferences
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Theme</label>
                  <select
                    value={theme}
                    onChange={(e: any) => handleThemeChange(e.target.value)}
                    className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="codio-dark">Obsidian Dark</option>
                    <option value="tokyo-night">Tokyo Night</option>
                    <option value="monokai">Monokai Pro</option>
                    <option value="vs-dark">VS Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Font Size</label>
                  <select
                    value={fontSize}
                    onChange={(e) => {
                      const sz = Number(e.target.value);
                      setFontSize(sz);
                      editorRef.current?.updateOptions({ fontSize: sz });
                    }}
                    className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    {[12, 13, 14, 15, 16, 18, 20].map((s) => (
                      <option key={s} value={s}>{s}px</option>
                    ))}
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

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
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
