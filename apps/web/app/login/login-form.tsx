"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type ApiMessage = {
  message?: string | string[];
  data?: {
    requires2FA?: boolean;
    email?: string;
  };
};

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // Fluxo de Autenticação em Duas Etapas (2FA)
  const [requires2FA, setRequires2FA] = useState(false);
  const [savedEmail, setSavedEmail] = useState("");
  const [savedPassword, setSavedPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  async function handleInitialLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json().catch(() => ({}))) as ApiMessage;

      if (!response.ok) {
        setError(
          Array.isArray(result.message)
            ? result.message.join(" ")
            : (result.message ?? "Não foi possível entrar. Tente novamente."),
        );
        return;
      }

      // Se o usuário possui 2FA ativo, transiciona para a etapa de desafio
      if (result.data?.requires2FA) {
        setSavedEmail(email);
        setSavedPassword(password);
        setRequires2FA(true);
        setTwoFactorCode("");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao CTRL+Farm. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function handleTwoFactorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: savedEmail,
          password: savedPassword,
          twoFactorCode: twoFactorCode.trim(),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as ApiMessage;

      if (!response.ok) {
        setError(
          Array.isArray(result.message)
            ? result.message.join(" ")
            : (result.message ?? "Código de autenticação incorreto ou expirado."),
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Não foi possível validar o código 2FA. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  function handleCancelTwoFactor() {
    setRequires2FA(false);
    setTwoFactorCode("");
    setError("");
  }

  if (requires2FA) {
    return (
      <form className="space-y-5" onSubmit={handleTwoFactorSubmit}>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl text-emerald-400">
            🛡️
          </div>
          <h2 className="text-base font-bold text-white">Autenticação em Duas Etapas</h2>
          <p className="mt-1 text-xs text-slate-400">
            Digite o código de 6 dígitos do seu app autenticador ou um código de recuperação
            reserva.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="twoFactorCode">
            Código de Verificação (TOTP ou Backup)
          </label>
          <input
            autoFocus
            autoComplete="one-time-code"
            className="h-12 w-full rounded-lg border bg-background px-3 text-center font-mono text-lg tracking-widest uppercase outline-none focus:ring-2 focus:ring-emerald-500"
            id="twoFactorCode"
            maxLength={10}
            name="twoFactorCode"
            onChange={(e) => setTwoFactorCode(e.target.value)}
            placeholder="000 000"
            required
            type="text"
            value={twoFactorCode}
          />
          <p className="text-[11px] text-muted-foreground text-center">
            Compatível com Google Authenticator, Microsoft Authenticator, Apple Keychain, Authy e
            1Password.
          </p>
        </div>

        {error ? (
          <p
            aria-live="polite"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-center text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}

        <button
          className="h-11 w-full rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          disabled={pending || !twoFactorCode.trim()}
          type="submit"
        >
          {pending ? "Validando código..." : "Verificar e Entrar"}
        </button>

        <button
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
          onClick={handleCancelTwoFactor}
          type="button"
        >
          ← Voltar e alterar e-mail ou senha
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleInitialLogin}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          E-mail
        </label>
        <input
          autoComplete="email"
          className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          id="email"
          name="email"
          placeholder="voce@empresa.com"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Senha
        </label>
        <input
          autoComplete="current-password"
          className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          id="password"
          minLength={6}
          name="password"
          required
          type="password"
        />
      </div>

      {error ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem uma conta?{" "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href="/register"
        >
          Criar empresa
        </Link>
      </p>
    </form>
  );
}
