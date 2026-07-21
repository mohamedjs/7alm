"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/auth.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";

export default function LoginForm() {
  const { login, loginState } = useAuth();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loading = loginState.isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      // The auth cookie is now set — use a hard navigation so the middleware
      // re-evaluates the session and serves the dashboard.
      window.location.assign("/admin");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("auth.loginFailed");
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6 transition-colors">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gradient">
            7alm
          </h1>
          <p className="text-text-muted mt-2">{t("auth.brandSubtitle")}</p>
        </div>

        {/* Login Card — neumorphic raised */}
        <div className="bg-surface rounded-2xl p-8 neu-raised">
          <h2 className="text-xl font-bold text-text-primary mb-6">{t("auth.signIn")}</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-sm font-medium text-text-muted mb-2"
              >
                {t("auth.email")}
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@7alm.com"
                dir="ltr"
                className="w-full neu-input rounded-xl px-4 py-3 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium text-text-muted mb-2"
              >
                {t("auth.password")}
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full neu-input rounded-xl px-4 py-3 transition-all"
              />
            </div>

            {error && (
              <div className="neu-pressed rounded-xl p-3 text-danger text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-400 text-white font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed neu-btn"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {t("auth.signingIn")}
                </span>
              ) : (
                t("auth.signIn")
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
