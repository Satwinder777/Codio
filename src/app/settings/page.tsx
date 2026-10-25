'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Settings, User, Save, Sun, Moon, Sparkles, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme, Theme } from '@/components/theme/ThemeProvider';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [defaultLang, setDefaultLang] = useState('typescript');
  const [fontSize, setFontSize] = useState('14');
  const [tabSize, setTabSize] = useState('2');
  const [wordWrap, setWordWrap] = useState('on');
  const [minimap, setMinimap] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load local storage preferences
    const storedName = localStorage.getItem('codio_user_name') || '';
    const storedLang = localStorage.getItem('codio_default_lang') || 'typescript';
    const storedFontSize = localStorage.getItem('codio_font_size') || '14';
    const storedTabSize = localStorage.getItem('codio_tab_size') || '2';
    const storedWordWrap = localStorage.getItem('codio_word_wrap') || 'on';
    const storedMinimap = localStorage.getItem('codio_minimap') !== 'false';

    setDisplayName(storedName);
    setDefaultLang(storedLang);
    setFontSize(storedFontSize);
    setTabSize(storedTabSize);
    setWordWrap(storedWordWrap);
    setMinimap(storedMinimap);

    // Supabase auth user
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) {
          setEmail(data.user.email);
          if (!storedName) {
            setDisplayName(data.user.user_metadata?.full_name || data.user.email.split('@')[0]);
          }
        }
      });
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    localStorage.setItem('codio_user_name', displayName);
    localStorage.setItem('codio_default_lang', defaultLang);
    localStorage.setItem('codio_font_size', fontSize);
    localStorage.setItem('codio_tab_size', tabSize);
    localStorage.setItem('codio_word_wrap', wordWrap);
    localStorage.setItem('codio_minimap', String(minimap));

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.updateUser({
        data: { full_name: displayName },
      }).catch(console.error);
    }

    setTimeout(() => {
      setSaving(false);
      toast.success('Preferences saved successfully!');
    }, 300);
  };

  const themeOptions: { value: Theme; label: string; icon: typeof Sun; desc: string }[] = [
    { value: 'codio', label: 'Codio', icon: Sparkles, desc: 'Branded midnight colors with violet and cyan accents' },
    { value: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Neutral dark colors for focused coding' },
    { value: 'light', label: 'Light Mode', icon: Sun, desc: 'Crisp daylight interface with high contrast' },
  ];

  return (
    <div className="flex-1 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full space-y-6 transition-colors">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-500" />
          <span>Preferences</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure your appearance theme, editor defaults, and profile details.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Appearance & Theme Preference Card */}
        <div className="bg-white dark:bg-[#111622] p-5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white">
                Interface Theme
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose Codio, Dark, or Light. Your operating system setting will not change this choice.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              Active: {theme.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`p-3 rounded-lg border text-left transition flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'border-slate-900 dark:border-white bg-slate-100/70 dark:bg-slate-800/80 shadow-sm'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/50 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`} />
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                      {opt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-[#111622] p-5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <span>Profile Identity</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={email || 'Local Guest Mode (Unauthenticated)'}
                className="w-full bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* IDE Preferences Card */}
        <div className="bg-white dark:bg-[#111622] p-5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Code2 className="w-4 h-4 text-slate-500" />
            <span>Monaco Editor Configuration</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Default Language</label>
              <select
                value={defaultLang}
                onChange={(e) => setDefaultLang(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Font Size</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="12">12px (Compact)</option>
                <option value="13">13px</option>
                <option value="14">14px (Recommended)</option>
                <option value="15">15px</option>
                <option value="16">16px (Comfortable)</option>
                <option value="18">18px (Large)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Tab Size</label>
              <select
                value={tabSize}
                onChange={(e) => setTabSize(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={minimap}
                onChange={(e) => setMinimap(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Enable Code Minimap</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={wordWrap === 'on'}
                onChange={(e) => setWordWrap(e.target.checked ? 'on' : 'off')}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Enable Word Wrapping</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-medium shadow-sm transition active:scale-95 disabled:opacity-60"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
