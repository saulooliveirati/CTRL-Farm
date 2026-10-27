"use client";

import { useState, type FormEvent } from "react";
import type { SupplierRecord } from "@/lib/server-suppliers";

export function SupplierQuickCreate({
  onCreated,
}: {
  onCreated: (supplier: SupplierRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível cadastrar fornecedor.");
      onCreated(result.data as SupplierRecord);
      setName("");
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao cadastrar fornecedor.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
      >
        ＋ Novo fornecedor
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setOpen(false);
          }}
        >
          <form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-quick-title"
            className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-700 bg-[#0b1220] p-5 shadow-2xl"
          >
            <div>
              <h3 id="supplier-quick-title" className="font-bold text-white">
                Cadastro rápido de fornecedor
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Cadastre o nome agora e complete os dados depois.
              </p>
            </div>
            {error && (
              <p role="alert" className="text-xs text-rose-300">
                {error}
              </p>
            )}
            <label className="grid gap-1.5 text-xs font-semibold text-slate-200">
              Nome do fornecedor *
              <input
                autoFocus
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-10 rounded-lg border border-slate-700 bg-[#101625] px-3 text-sm text-white"
              />
            </label>
            <div className="flex gap-2">
              <button
                disabled={saving}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Cadastrar e selecionar"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
