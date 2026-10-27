"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type ApiMessage = {
  message?: string | string[];
};

export function RegisterForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: formData.get("companyName"),
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as ApiMessage;

      if (!response.ok) {
        setError(
          Array.isArray(result.message)
            ? result.message.join(" ")
            : (result.message ?? "Não foi possível criar a conta."),
        );
        return;
      }

      setCreated(true);
    } catch {
      setError("Não foi possível conectar ao CTRL+Farm. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (created) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Empresa e administrador cadastrados. Agora entre com seu e-mail e senha.
        </p>
        <Link
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          href="/login"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="companyName">
          Nome da empresa
        </label>
        <input
          autoComplete="organization"
          className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          id="companyName"
          maxLength={120}
          name="companyName"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="name">
          Seu nome
        </label>
        <input
          autoComplete="name"
          className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          id="name"
          maxLength={120}
          name="name"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          E-mail
        </label>
        <input
          autoComplete="email"
          className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          id="email"
          maxLength={254}
          name="email"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Senha
        </label>
        <input
          autoComplete="new-password"
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
        {pending ? "Criando conta..." : "Criar empresa e administrador"}
      </button>
    </form>
  );
}
