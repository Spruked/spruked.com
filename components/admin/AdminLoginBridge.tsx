'use client';

import { FormEvent, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const SESSION_KEY = 'spruked_admin_access_token';

function applyLegacyToken(token: string) {
  const tryApply = (attempt = 0) => {
    const input = document.getElementById('admin-access-token') as HTMLInputElement | null;
    if (!input) {
      if (attempt < 20) {
        window.setTimeout(() => tryApply(attempt + 1), 100);
      }
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, token);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  tryApply();
}

export default function AdminLoginBridge() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [legacyBypass, setLegacyBypass] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [legacyToken, setLegacyToken] = useState('');
  const [status, setStatus] = useState('');
  const [working, setWorking] = useState(false);

  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  useEffect(() => {
    if (!isAdmin || typeof window === 'undefined') {
      setReady(true);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('legacy') === '1') {
      setLegacyBypass(true);
      setReady(true);
      return;
    }

    const saved = window.sessionStorage.getItem(SESSION_KEY) || '';
    if (saved) {
      applyLegacyToken(saved);
      document.documentElement.dataset.sprukedAdminAuthenticated = '1';
      setAuthenticated(true);
    }

    setReady(true);
  }, [isAdmin]);

  useEffect(() => {
    if (authenticated) {
      const saved = window.sessionStorage.getItem(SESSION_KEY) || '';
      if (saved) applyLegacyToken(saved);
    }
  }, [authenticated, pathname]);

  if (!isAdmin || !ready || legacyBypass) return null;

  const completeLogin = (token: string) => {
    window.sessionStorage.setItem(SESSION_KEY, token);
    document.documentElement.dataset.sprukedAdminAuthenticated = '1';
    applyLegacyToken(token);
    setAuthenticated(true);
    setPassword('');
    setLegacyToken('');
    setStatus('');
  };

  const handleSimpleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setStatus('Signing in...');

    try {
      const response = await fetch('/api/admin/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.token) {
        throw new Error(data?.error || 'Login failed.');
      }
      completeLogin(String(data.token));
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const handleLegacyLogin = async (event: FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setStatus('Checking legacy token...');

    try {
      const response = await fetch('/api/admin/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legacy_token: legacyToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.token) {
        throw new Error(data?.error || 'Legacy token rejected.');
      }
      completeLogin(String(data.token));
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const logout = () => {
    window.sessionStorage.removeItem(SESSION_KEY);
    delete document.documentElement.dataset.sprukedAdminAuthenticated;
    setAuthenticated(false);
    setStatus('');
    window.location.assign('/admin');
  };

  if (authenticated) {
    return (
      <>
        <style>{`html[data-spruked-admin-authenticated="1"] label:has(#admin-access-token) { display: none !important; }`}</style>
        <div className="fixed bottom-4 right-4 z-[10001] flex items-center gap-2 rounded-full border border-gray-800 bg-black/90 px-4 py-2 text-xs text-gray-300 shadow-xl backdrop-blur">
          <span>Admin signed in</span>
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-gray-700 px-3 py-1 uppercase tracking-wider hover:border-gray-400 hover:text-white"
          >
            Log out
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 px-6 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#080808] p-7 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Spruked Internal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Admin Login</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Sign in with your admin username and password.
        </p>

        {!showLegacy ? (
          <form className="mt-6 space-y-4" onSubmit={handleSimpleLogin}>
            <label className="block text-sm text-gray-300">
              Username
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-800 bg-black px-4 py-3 text-white outline-none focus:border-gray-500"
              />
            </label>
            <label className="block text-sm text-gray-300">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-800 bg-black px-4 py-3 text-white outline-none focus:border-gray-500"
              />
            </label>
            <button
              type="submit"
              disabled={working || !username.trim() || !password}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-widest text-black disabled:opacity-40"
            >
              {working ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleLegacyLogin}>
            <label className="block text-sm text-gray-300">
              Legacy Admin Token
              <input
                type="password"
                value={legacyToken}
                onChange={(event) => setLegacyToken(event.target.value)}
                placeholder="ADMIN_ACCESS_TOKEN"
                className="mt-2 w-full rounded-lg border border-gray-800 bg-black px-4 py-3 font-mono text-white outline-none focus:border-gray-500"
              />
            </label>
            <button
              type="submit"
              disabled={working || !legacyToken.trim()}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-widest text-black disabled:opacity-40"
            >
              {working ? 'Checking...' : 'Use Legacy Token'}
            </button>
          </form>
        )}

        {status ? <p className="mt-4 text-sm text-amber-300">{status}</p> : null}

        <button
          type="button"
          onClick={() => {
            setShowLegacy((value) => !value);
            setStatus('');
          }}
          className="mt-5 text-xs uppercase tracking-widest text-gray-500 hover:text-gray-200"
        >
          {showLegacy ? 'Back to simple login' : 'Legacy token access'}
        </button>

        <p className="mt-4 text-xs leading-relaxed text-gray-600">
          Original token mode is also preserved at /admin?legacy=1.
        </p>
      </div>
    </div>
  );
}
