"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type ApiMessage = {
  message?: string | string[];
};

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as ApiMessage;

      if (!response.ok) {
        setError(
          Array.isArray(result.message)
            ? result.message.join(" ")
            : result.message ?? "Não foi possível entrar. Tente novamente.",
        );
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

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
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