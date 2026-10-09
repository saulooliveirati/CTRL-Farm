import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { getCurrentUser } from "@/lib/server-auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            CTRL+Farm
          </p>
          <h1 className="mt-3 text-2xl font-bold">Acesse sua conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre para acompanhar sua operação de impressão.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}