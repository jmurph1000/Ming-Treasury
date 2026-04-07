'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthMode {
  mode: 'local' | 'okta';
  authorizationUrl?: string;
  clientId?: string;
  callbackUrl?: string;
  realm?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);

  // Check for error from Okta callback redirect
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) setError(urlError);
  }, [searchParams]);

  // Fetch auth mode from backend
  useEffect(() => {
    fetch('/api/auth/mode')
      .then(r => r.json())
      .then(data => {
        if (data.success) setAuthMode(data.data);
        else setAuthMode({ mode: 'local' });
      })
      .catch(() => setAuthMode({ mode: 'local' }));
  }, []);

  function handleSsoRedirect() {
    if (!authMode?.authorizationUrl || !authMode?.clientId || !authMode?.callbackUrl) {
      setError('SSO is not configured. Contact IT.');
      return;
    }
    const params = new URLSearchParams({
      client_id: authMode.clientId,
      response_type: 'code',
      scope: 'openid email profile',
      redirect_uri: authMode.callbackUrl,
      state: crypto.randomUUID(),
    });
    window.location.href = `${authMode.authorizationUrl}?${params}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || !authMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a5c36] to-[#107848]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c8a951]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a5c36] to-[#107848]">
      <div className="max-w-md w-full mx-4">
        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Gold accent stripe at top */}
          <div className="h-1.5 bg-gradient-to-r from-[#c8a951] via-[#d4b86a] to-[#c8a951]"></div>

          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#0a5c36]">
                Gusto Treasury
              </h1>
              <p className="text-gray-600 mt-2">Payment Management System</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-6">
                {error}
              </div>
            )}

            {authMode.mode === 'okta' ? (
              /* ── Okta SSO Mode ── */
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={handleSsoRedirect}
                  className="w-full bg-[#c8a951] hover:bg-[#b89a42] text-white font-semibold py-2.5 px-4 rounded-md transition-colors shadow-sm"
                >
                  Sign in with Gusto SSO
                </button>
                <p className="text-center text-sm text-gray-500">
                  You will be redirected to the Gusto login page.
                </p>
              </div>
            ) : (
              /* ── Local Auth Mode ── */
              <>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0a5c36] focus:border-transparent"
                      placeholder="your.name@gusto.com"
                      autoComplete="email"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="w-full bg-[#c8a951] hover:bg-[#b89a42] text-white font-semibold py-2.5 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                  </button>

                  <p className="text-center text-sm text-gray-500">
                    Contact IT if you need access to this system.
                  </p>
                </form>

                {/* Development Mode Notice */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-6 p-4 bg-[#0a5c36]/5 border border-[#0a5c36]/20 rounded-md">
                    <p className="text-sm text-[#0a5c36] font-medium">Development Mode</p>
                    <p className="text-xs text-gray-600 mt-1">
                      AUTH_MODE=local — enter any @gusto.com email to log in.
                      Set AUTH_MODE=okta to test SSO flow.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-white/70 mt-4">
          &copy; {new Date().getFullYear()} Gusto. All rights reserved.
        </p>
      </div>
    </div>
  );
}
