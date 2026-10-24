'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Settings, User, Laptop, Save, Shield, Terminal } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
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
      toast.success('Settings and preferences saved successfully!');
    }, 400);
  };

  return (
    <div className="flex-1 bg-[#090d16] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-indigo-400" />
          <span>Account & IDE Preferences</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Customize your profile, editor defaults, and collaboration identity.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            <span>Profile Information</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name / Handle"
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={email || 'Not connected to Supabase Auth'}
                className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 focus:outline-none cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* IDE Preferences Card */}
        <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Laptop className="w-4 h-4 text-cyan-400" />
            <span>Monaco IDE Default Preferences</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Default Language</label>
              <select
                value={defaultLang}
                onChange={(e) => setDefaultLang(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none cursor-pointer"
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
              <label className="text-xs font-semibold text-slate-300 block mb-1">Font Size</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none cursor-pointer"
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
              <label className="text-xs font-semibold text-slate-300 block mb-1">Tab Size</label>
              <select
                value={tabSize}
                onChange={(e) => setTabSize(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={minimap}
                onChange={(e) => setMinimap(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0"
              />
              <span>Enable Code Minimap</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={wordWrap === 'on'}
                onChange={(e) => setWordWrap(e.target.checked ? 'on' : 'off')}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0"
              />
              <span>Enable Word Wrapping</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
