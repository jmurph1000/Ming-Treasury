'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email);
      // Router push happens in login function
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
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

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

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
                {isSubmitting ? 'Signing in...' : 'Sign in with Okta'}
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
                  Enter any email ending in @gusto.com to log in.
                  Production uses Okta SSO with MFA.
                </p>
              </div>
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
