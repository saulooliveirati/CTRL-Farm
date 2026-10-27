import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "./register-form";
import { getCurrentUser } from "@/lib/server-auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border bg-background p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">CTRL+Farm</p>
          <h1 className="mt-3 text-2xl font-bold">Cadastre sua empresa</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie a empresa e a conta do primeiro administrador.
          </p>
        </div>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href="/login"
          >
            Entrar
          </Link>
        </p>
      </section>
    </main>
  );
}
