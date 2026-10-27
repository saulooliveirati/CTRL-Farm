"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, User, Lock, AlertCircle, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Credenciais administrativas inválidas.");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Falha na conexão com o servidor master.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b14] p-4 font-sans text-slate-100">
      {/* Background glow decoration */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-[128px]" />
      <div className="pointer-events-none fixed -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[128px]" />

      <div className="w-full max-w-md space-y-6">
        {/* Header do Card */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/40 text-[#00df81] shadow-xl shadow-emerald-500/10">
            <Shield className="h-8 w-8 text-[#00df81]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Sistema ADM Gerente
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Controle Comercial, Licenciamento & Planos CTRL-Farm
            </p>
          </div>
        </div>

        {/* Card Formulário */}
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Usuário Administrador
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-3 text-slate-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Administrador"
                  className="h-11 w-full rounded-xl border border-[#1b263b] bg-[#091122] pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition focus:border-[#00df81]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Senha Master
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-11 w-full rounded-xl border border-[#1b263b] bg-[#091122] pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition focus:border-[#00df81]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#00df81] text-xs font-bold text-slate-950 transition hover:bg-[#1fe28c] shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Acessar Painel Master</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-[10px] text-slate-500">
          CTRL-Farm Software Licensing & Cloud Governance © 2026
        </div>
      </div>
    </div>
  );
}
