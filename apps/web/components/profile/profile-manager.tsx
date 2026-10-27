"use client";

import { useState, useEffect, type FormEvent } from "react";
import type { UserProfileRecord } from "@/lib/server-users";
import { LogoutButton } from "@/components/layout/logout-button";

const AVATAR_PRESETS = [
  { id: "robot", icon: "🤖", label: "Robô Maker" },
  { id: "engineer", icon: "👨‍💻", label: "Engenheiro 3D" },
  { id: "scientist", icon: "👩‍🔬", label: "Especialista em Polímeros" },
  { id: "tech", icon: "🛠️", label: "Técnico de Manutenção" },
  { id: "leader", icon: "🚀", label: "Líder de Produção" },
  { id: "designer", icon: "🎨", label: "Modelador 3D" },
  { id: "speed", icon: "⚡", label: "Operador Rápido" },
  { id: "admin", icon: "👑", label: "Administrador Geral" },
];

const AVATAR_BG_COLORS = [
  { name: "Esmeralda", bg: "bg-emerald-500", hex: "#10b981" },
  { name: "Ciano", bg: "bg-cyan-500", hex: "#06b6d4" },
  { name: "Azul Real", bg: "bg-blue-600", hex: "#2563eb" },
  { name: "Roxo", bg: "bg-purple-600", hex: "#9333ea" },
  { name: "Rosa", bg: "bg-pink-600", hex: "#db2777" },
  { name: "Âmbar", bg: "bg-amber-500", hex: "#f59e0b" },
  { name: "Laranja", bg: "bg-orange-500", hex: "#ea580c" },
];

type ProfileTab = "data" | "avatar" | "security" | "preferences" | "company";

export function ProfileManager({ initialProfile }: { initialProfile: UserProfileRecord }) {
  const [profile, setProfile] = useState<UserProfileRecord>(initialProfile);
  const [activeTab, setActiveTab] = useState<ProfileTab>("data");

  // Estado dos Dados Cadastrais
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email);
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [savingData, setSavingData] = useState(false);
  const [dataSuccess, setDataSuccess] = useState(false);
  const [dataError, setDataError] = useState("");

  // Estado do Avatar & Personalização
  const [avatarType, setAvatarType] = useState<"preset" | "initials" | "custom">("initials");
  const [selectedPreset, setSelectedPreset] = useState("robot");
  const [selectedBgColor, setSelectedBgColor] = useState(AVATAR_BG_COLORS[0]!);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  // Estado de Segurança & Troca de Senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Estado de Autenticação em Duas Etapas (2FA)
  const [twoFactorStatus, setTwoFactorStatus] = useState<{
    enabled: boolean;
    createdAt: string | null;
    remainingBackupCodes: number;
  }>({ enabled: false, createdAt: null, remainingBackupCodes: 0 });
  const [loading2FA, setLoading2FA] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    otpauthUri: string;
    qrCode: string;
    backupCodes: string[];
  } | null>(null);
  const [settingUp2FA, setSettingUp2FA] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [enabling2FA, setEnabling2FA] = useState(false);
  const [twoFactorMsg, setTwoFactorMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [regeneratedBackupCodes, setRegeneratedBackupCodes] = useState<string[] | null>(null);
  const [regeneratingCodes, setRegeneratingCodes] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Estado de Preferências da Plataforma
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [defaultView, setDefaultView] = useState<"cards" | "list">("cards");
  const [weightUnit, setWeightUnit] = useState<"g" | "kg">("g");
  const [prefsSuccess, setPrefsSuccess] = useState(false);

  // Carrega preferências salvas no localStorage
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem(`ctrlfarm_prefs_${initialProfile.id}`);
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.avatarType) setAvatarType(parsed.avatarType);
        if (parsed.selectedPreset) setSelectedPreset(parsed.selectedPreset);
        if (parsed.customAvatarUrl) setCustomAvatarUrl(parsed.customAvatarUrl);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.bio) setBio(parsed.bio);
        if (parsed.soundAlerts !== undefined) setSoundAlerts(parsed.soundAlerts);
        if (parsed.lowStockAlerts !== undefined) setLowStockAlerts(parsed.lowStockAlerts);
        if (parsed.defaultView) setDefaultView(parsed.defaultView);
        if (parsed.weightUnit) setWeightUnit(parsed.weightUnit);
        if (parsed.bgColorHex) {
          const matched = AVATAR_BG_COLORS.find((c) => c.hex === parsed.bgColorHex);
          if (matched) setSelectedBgColor(matched);
        }
      }
    } catch {
      // Ignora erro de storage
    }
  }, [initialProfile.id]);

  // Salva dados cadastrais (Nome, E-mail) na API do backend
  async function handleSaveData(e: FormEvent) {
    e.preventDefault();
    setSavingData(true);
    setDataError("");
    setDataSuccess(false);

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Não foi possível atualizar o perfil.");
      }

      setProfile((prev) => ({
        ...prev,
        name: result.data?.name ?? name.trim(),
        email: result.data?.email ?? email.trim(),
      }));

      // Salva dados complementares (phone, bio) no cache local do usuário
      saveToStorage({ phone, bio });

      setDataSuccess(true);
      setTimeout(() => setDataSuccess(false), 3000);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : "Erro ao salvar perfil.");
    } finally {
      setSavingData(false);
    }
  }

  // Salva preferências de Avatar
  function handleSaveAvatar() {
    saveToStorage({
      avatarType,
      selectedPreset,
      customAvatarUrl,
      bgColorHex: selectedBgColor.hex,
    });
    setAvatarSuccess(true);
    setTimeout(() => setAvatarSuccess(false), 3000);
  }

  // Salva preferências da Farm
  function handleSavePreferences() {
    saveToStorage({
      soundAlerts,
      lowStockAlerts,
      defaultView,
      weightUnit,
    });
    setPrefsSuccess(true);
    setTimeout(() => setPrefsSuccess(false), 3000);
  }

  function saveToStorage(updatedFields: Record<string, unknown>) {
    try {
      const storageKey = `ctrlfarm_prefs_${profile.id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "{}");
      const merged = { ...existing, ...updatedFields };
      localStorage.setItem(storageKey, JSON.stringify(merged));
    } catch {
      // Fallback
    }
  }

  // Altera a senha do usuário com segurança na API
  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("A confirmação não coincide com a nova senha digitada.");
      return;
    }

    setSavingPassword(true);

    try {
      const response = await fetch("/api/users/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Não foi possível alterar a senha.");
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Falha ao alterar senha.");
    } finally {
      setSavingPassword(false);
    }
  }

  // Carrega status de 2FA do usuário
  useEffect(() => {
    async function load2FAStatus() {
      try {
        setLoading2FA(true);
        const res = await fetch("/api/auth/2fa/status");
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setTwoFactorStatus(json.data);
          }
        }
      } catch {
        // Fallback silencioso
      } finally {
        setLoading2FA(false);
      }
    }
    load2FAStatus();
  }, []);

  // Inicia configuração do 2FA
  async function handleStart2FASetup() {
    setSettingUp2FA(true);
    setTwoFactorMsg(null);
    setVerifyCode("");
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Não foi possível iniciar a configuração 2FA.");
      }
      setSetupData(json.data);
    } catch (err) {
      setTwoFactorMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao gerar QR Code.",
      });
      setSettingUp2FA(false);
    }
  }

  // Confirma código e ativa o 2FA
  async function handleConfirm2FA(e: FormEvent) {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setEnabling2FA(true);
    setTwoFactorMsg(null);
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Código de verificação incorreto ou expirado.");
      }
      setTwoFactorStatus({
        enabled: true,
        createdAt: new Date().toISOString(),
        remainingBackupCodes: json.data?.remainingBackupCodes ?? 6,
      });
      setSettingUp2FA(false);
      setSetupData(null);
      setVerifyCode("");
      setTwoFactorMsg({
        type: "success",
        text: "Autenticação em Duas Etapas ativada com sucesso!",
      });
      setTimeout(() => setTwoFactorMsg(null), 5000);
    } catch (err) {
      setTwoFactorMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Código de verificação incorreto.",
      });
    } finally {
      setEnabling2FA(false);
    }
  }

  // Desativa o 2FA com confirmação de senha
  async function handleDisable2FA(e: FormEvent) {
    e.preventDefault();
    if (!disablePassword) return;
    setDisabling2FA(true);
    setTwoFactorMsg(null);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: disablePassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Senha atual incorreta.");
      }
      setTwoFactorStatus({
        enabled: false,
        createdAt: null,
        remainingBackupCodes: 0,
      });
      setShowDisableModal(false);
      setDisablePassword("");
      setRegeneratedBackupCodes(null);
      setTwoFactorMsg({
        type: "success",
        text: "Autenticação em Duas Etapas desativada.",
      });
      setTimeout(() => setTwoFactorMsg(null), 5000);
    } catch (err) {
      setTwoFactorMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Falha ao desativar 2FA.",
      });
    } finally {
      setDisabling2FA(false);
    }
  }

  // Gera novos códigos de recuperação reserva
  async function handleRegenerateBackupCodes() {
    setRegeneratingCodes(true);
    setTwoFactorMsg(null);
    try {
      const res = await fetch("/api/auth/2fa/backup-codes", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Não foi possível gerar novos códigos.");
      }
      setRegeneratedBackupCodes(json.data.backupCodes);
      setTwoFactorStatus((prev) => ({
        ...prev,
        remainingBackupCodes: json.data.remainingBackupCodes ?? 6,
      }));
      setTwoFactorMsg({
        type: "success",
        text: "Novos códigos de recuperação gerados com sucesso!",
      });
      setTimeout(() => setTwoFactorMsg(null), 5000);
    } catch (err) {
      setTwoFactorMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Falha ao gerar códigos.",
      });
    } finally {
      setRegeneratingCodes(false);
    }
  }

  // Renderiza o avatar selecionado
  const renderAvatarPreview = (sizeClass = "h-20 w-20 text-3xl") => {
    if (avatarType === "preset") {
      const preset = AVATAR_PRESETS.find((p) => p.id === selectedPreset);
      return (
        <span
          className={`grid ${sizeClass} place-items-center rounded-3xl border-2 border-emerald-400/40 bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl`}
        >
          {preset?.icon ?? "🤖"}
        </span>
      );
    }

    if (avatarType === "custom" && customAvatarUrl.trim()) {
      return (
        // biome-ignore lint/performance/noImgElement: avatar com URL externa customizada definida pelo usuário
        <img
          src={customAvatarUrl}
          alt={profile.name}
          className={`${sizeClass} rounded-3xl border-2 border-emerald-400/40 object-cover shadow-xl`}
          onError={() => setAvatarType("initials")}
        />
      );
    }

    const initial = profile.name.trim().charAt(0).toUpperCase() || "U";
    return (
      <span
        className={`grid ${sizeClass} place-items-center rounded-3xl border-2 border-white/20 font-black text-slate-950 shadow-xl ${selectedBgColor.bg}`}
      >
        {initial}
      </span>
    );
  };

  const roleLabel = {
    ADMIN: "Administrador da Farm",
    MANAGER: "Gerente de Operações",
    OPERATOR: "Operador Técnico",
    VIEWER: "Visualizador",
  }[profile.role];

  const roleBadgeColor = {
    ADMIN: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    MANAGER: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    OPERATOR: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    VIEWER: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  }[profile.role];

  const field =
    "h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-sm text-white outline-none transition focus:border-emerald-400";
  const label = "grid min-w-0 gap-1.5 text-xs font-semibold text-slate-300";

  return (
    <div className="mx-auto max-w-[1300px] space-y-6 text-slate-100">
      {/* Hero Banner do Usuário */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-[#0b1220] via-[#0e1726] to-[#082220] p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {renderAvatarPreview("h-20 w-20 text-3xl")}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-black text-white">{profile.name}</h1>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${roleBadgeColor}`}
                >
                  {roleLabel}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Conta Ativa
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-400">{profile.email}</p>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span>🏢</span>
                  <strong className="text-slate-300">{profile.companyName || "Minha Farm"}</strong>
                </span>
                <span>·</span>
                <span>
                  Membro desde{" "}
                  <strong className="text-slate-300">
                    {new Date(profile.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("avatar")}
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-white"
            >
              🎨 Trocar Avatar
            </button>
            <LogoutButton />
          </div>
        </div>
      </section>

      {/* Navegação por Abas do Perfil */}
      <nav
        aria-label="Abas do perfil"
        className="flex flex-wrap gap-2 border-b border-slate-800 pb-2"
      >
        {(
          [
            { id: "data", label: "👤 Dados Cadastrais" },
            { id: "avatar", label: "🎨 Avatar & Estilo" },
            { id: "security", label: "🔒 Segurança & 2FA" },
            { id: "preferences", label: "⚙ Preferências da Farm" },
            { id: "company", label: "🏢 Empresa & Sessão" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === tab.id
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/20"
                : "border border-slate-800 bg-[#0b1220] text-slate-400 hover:border-slate-700 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ================= ABA 1: DADOS CADASTRAIS ================= */}
      {activeTab === "data" && (
        <section className="rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-xl">
          <div className="mb-6 flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Informações Pessoais &amp; Contato</h2>
              <p className="mt-1 text-xs text-slate-400">
                Mantenha seu nome, e-mail e dados de contato atualizados para identificação na
                fazenda.
              </p>
            </div>
            {dataSuccess && (
              <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/30 animate-in fade-in">
                ✓ Dados salvos com sucesso!
              </span>
            )}
          </div>

          {dataError && (
            <p className="mb-4 rounded-xl border border-rose-900 bg-rose-950/60 p-3 text-xs text-rose-200">
              ⚠ {dataError}
            </p>
          )}

          <form onSubmit={handleSaveData} className="grid gap-4 sm:grid-cols-2">
            <label className={label}>
              Nome Completo *
              <input
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={field}
              />
            </label>

            <label className={label}>
              E-mail de Login *
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </label>

            <label className={label}>
              Telefone / WhatsApp de Contato
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex.: (11) 98765-4321"
                className={field}
              />
            </label>

            <label className={label}>
              Cargo / Nível de Acesso (Definido pelo Administrador)
              <input
                disabled
                value={`${roleLabel} (${profile.role})`}
                className={`${field} opacity-60 cursor-not-allowed`}
              />
            </label>

            <label className={`sm:col-span-2 ${label}`}>
              Bio / Descrição de Função na Farm
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ex.: Responsável pelo pós-processamento, setup de fatiamento no Bambu Studio e controle de carretéis de PETG e ABS."
                className="w-full rounded-xl border border-slate-700 bg-[#070c16] p-3 text-sm text-white outline-none transition focus:border-emerald-400"
              />
            </label>

            <div className="mt-2 flex items-center justify-end sm:col-span-2">
              <button
                type="submit"
                disabled={savingData}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-950/20 disabled:opacity-60"
              >
                {savingData ? "Salvando dados..." : "Salvar Alterações do Perfil"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ================= ABA 2: AVATAR & ESTILO ================= */}
      {activeTab === "avatar" && (
        <section className="rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-xl">
          <div className="mb-6 flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Avatar &amp; Personalização Visual</h2>
              <p className="mt-1 text-xs text-slate-400">
                Escolha um avatar temático da impressão 3D, selecione suas iniciais coloridas ou use
                uma foto personalizada.
              </p>
            </div>
            {avatarSuccess && (
              <span className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                ✓ Avatar atualizado!
              </span>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
            {/* Pré-visualização do Avatar Ativo */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#070c16] p-6 text-center">
              {renderAvatarPreview("h-28 w-28 text-5xl")}
              <p className="mt-3 text-sm font-bold text-white">{profile.name}</p>
              <p className="text-[11px] text-slate-400">{roleLabel}</p>
              <span className="mt-3 rounded-full bg-slate-800/80 px-2.5 py-1 font-mono text-[10px] text-emerald-400">
                Visualização ao Vivo
              </span>
            </div>

            {/* Opções de Avatar */}
            <div className="space-y-5">
              {/* Opção 1: Presets Makers 3D */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <input
                    type="radio"
                    name="avatarType"
                    checked={avatarType === "preset"}
                    onChange={() => setAvatarType("preset")}
                    className="accent-emerald-500"
                  />
                  <span>Avatares Temáticos da Impressão 3D</span>
                </label>

                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {AVATAR_PRESETS.map((preset) => {
                    const isSelected = avatarType === "preset" && selectedPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setAvatarType("preset");
                          setSelectedPreset(preset.id);
                        }}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-500/15 shadow-sm"
                            : "border-slate-800 bg-[#070c16] hover:border-slate-700"
                        }`}
                      >
                        <span className="text-xl">{preset.icon}</span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-white">{preset.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opção 2: Iniciais com Cor */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <input
                    type="radio"
                    name="avatarType"
                    checked={avatarType === "initials"}
                    onChange={() => setAvatarType("initials")}
                    className="accent-emerald-500"
                  />
                  <span>Iniciais com Cor Personalizada</span>
                </label>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {AVATAR_BG_COLORS.map((color) => {
                    const isSelected =
                      avatarType === "initials" && selectedBgColor.hex === color.hex;
                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => {
                          setAvatarType("initials");
                          setSelectedBgColor(color);
                        }}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? "border-white bg-slate-800 text-white shadow-sm"
                            : "border-slate-800 bg-[#070c16] text-slate-400 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full ${color.bg}`} />
                        <span>{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opção 3: Imagem ou URL Personalizada */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <input
                    type="radio"
                    name="avatarType"
                    checked={avatarType === "custom"}
                    onChange={() => setAvatarType("custom")}
                    className="accent-emerald-500"
                  />
                  <span>URL de Foto / Imagem Externa</span>
                </label>

                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => {
                      setAvatarType("custom");
                      setCustomAvatarUrl(e.target.value);
                    }}
                    placeholder="https://exemplo.com/minha-foto.png"
                    className={field}
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={handleSaveAvatar}
                  className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-950/20"
                >
                  Salvar Preferências de Avatar
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= ABA 3: SEGURANÇA & 2FA ================= */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Segurança &amp; Alteração de Senha
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Para sua proteção, utilize senhas fortes com números, letras maiúsculas e
                  caracteres especiais.
                </p>
              </div>
              {passwordSuccess && (
                <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                  ✓ Senha atualizada com sucesso!
                </span>
              )}
            </div>

            {passwordError && (
              <p className="mb-4 rounded-xl border border-rose-900 bg-rose-950/60 p-3 text-xs text-rose-200">
                ⚠ {passwordError}
              </p>
            )}

            <form onSubmit={handleChangePassword} className="max-w-xl space-y-4">
              <label className={label}>
                Senha Atual *
                <input
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Informe sua senha atual"
                  className={field}
                />
              </label>

              <label className={label}>
                Nova Senha (Mínimo de 6 caracteres) *
                <input
                  required
                  type="password"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha segura"
                  className={field}
                />
              </label>

              {/* Indicador de Força de Senha */}
              {newPassword && (
                <div className="space-y-1 rounded-xl border border-slate-800 bg-[#070c16] p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Força da senha:</span>
                    <span
                      className={`font-bold text-[11px] ${
                        newPassword.length >= 8 &&
                        /[A-Z]/.test(newPassword) &&
                        /[0-9]/.test(newPassword)
                          ? "text-emerald-400"
                          : newPassword.length >= 6
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {newPassword.length >= 8 &&
                      /[A-Z]/.test(newPassword) &&
                      /[0-9]/.test(newPassword)
                        ? "Forte"
                        : newPassword.length >= 6
                          ? "Média"
                          : "Fraca"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        newPassword.length >= 8 &&
                        /[A-Z]/.test(newPassword) &&
                        /[0-9]/.test(newPassword)
                          ? "w-full bg-emerald-400"
                          : newPassword.length >= 6
                            ? "w-2/3 bg-amber-400"
                            : "w-1/3 bg-rose-500"
                      }`}
                    />
                  </div>
                </div>
              )}

              <label className={label}>
                Confirmar Nova Senha *
                <input
                  required
                  type="password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha para confirmação"
                  className={field}
                />
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-950/20 disabled:opacity-60"
                >
                  {savingPassword ? "Alterando senha..." : "Atualizar Senha com Segurança"}
                </button>
              </div>
            </form>
          </section>

          {/* Card de Autenticação em Duas Etapas (2FA) */}
          <section className="rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-xl">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛡️</span>
                  <h2 className="text-base font-bold text-white">
                    Autenticação em Duas Etapas (2FA / TOTP)
                  </h2>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Adiciona uma camada extra de segurança à sua conta, exigindo um código de 6
                  dígitos gerado no celular além da sua senha.
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {loading2FA ? (
                  <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400">
                    Carregando status...
                  </span>
                ) : twoFactorStatus.enabled ? (
                  <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300">
                    ✓ Ativo e Protegido
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300">
                    ○ Não Configurado
                  </span>
                )}
              </div>
            </div>

            {/* Mensagem de Feedback */}
            {twoFactorMsg && (
              <div
                className={`mb-6 rounded-2xl border p-4 text-xs font-medium ${
                  twoFactorMsg.type === "success"
                    ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
                    : "border-rose-900 bg-rose-950/60 text-rose-200"
                }`}
              >
                {twoFactorMsg.type === "success" ? "✓ " : "⚠ "}
                {twoFactorMsg.text}
              </div>
            )}

            {/* Cenário 1: 2FA já está ativado */}
            {twoFactorStatus.enabled ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-emerald-500/20 bg-[#070c16] p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>📱</span> Dispositivo Autenticador Vinculado
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {twoFactorStatus.createdAt
                          ? `Ativado em ${new Date(twoFactorStatus.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`
                          : "Protegendo todos os acessos futuros da sua conta."}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="inline-flex items-center rounded-lg bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold text-slate-300 border border-slate-700">
                          🔑 {twoFactorStatus.remainingBackupCodes} de 6 códigos de recuperação
                          restantes
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleRegenerateBackupCodes}
                        disabled={regeneratingCodes}
                        className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-white disabled:opacity-50"
                      >
                        {regeneratingCodes ? "Gerando..." : "Novos Códigos de Backup"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDisableModal(true)}
                        className="rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-900/40 hover:text-rose-200"
                      >
                        Desativar 2FA
                      </button>
                    </div>
                  </div>
                </div>

                {/* Exibição de Códigos de Backup recém-gerados */}
                {regeneratedBackupCodes && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                          <span>⚠</span> Guarde Seus Novos Códigos de Recuperação
                        </h4>
                        <p className="mt-1 text-xs text-slate-300">
                          Estes são seus 6 códigos de uso único. Se você perder o acesso ao seu
                          celular, utilize um deles para entrar na conta.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRegeneratedBackupCodes(null)}
                        className="text-slate-400 hover:text-white text-xs font-bold"
                      >
                        ✕ Fechar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {regeneratedBackupCodes.map((code) => (
                        <div
                          key={`bcode-${code}`}
                          className="rounded-xl border border-slate-800 bg-[#070c16] px-3 py-2 text-center font-mono text-xs font-bold tracking-widest text-emerald-400"
                        >
                          {code}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(regeneratedBackupCodes.join("\n"));
                          setCopiedCodes(true);
                          setTimeout(() => setCopiedCodes(false), 2500);
                        }}
                        className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition"
                      >
                        {copiedCodes ? "✓ Códigos Copiados!" : "📋 Copiar Todos os Códigos"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : settingUp2FA && setupData ? (
              /* Cenário 2: Fluxo de Ativação do 2FA em andamento */
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Coluna do QR Code */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#070c16] p-6 text-center">
                    <p className="text-xs font-semibold text-slate-400 mb-3">
                      1. Escaneie com seu App Autenticador
                    </p>
                    <div className="rounded-2xl bg-white p-3 shadow-2xl">
                      {/* biome-ignore lint/performance/noImgElement: QR code gerado dinamicamente em base64 */}
                      <img
                        src={setupData.qrCode}
                        alt="QR Code Autenticação em Duas Etapas"
                        className="h-44 w-44 object-contain"
                      />
                    </div>
                    <div className="mt-4 w-full">
                      <p className="text-[11px] text-slate-500 mb-1">
                        Não consegue escanear? Digite o código manual:
                      </p>
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5">
                        <code className="font-mono text-xs font-bold text-emerald-400 tracking-wider">
                          {setupData.secret}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(setupData.secret);
                            setCopiedSecret(true);
                            setTimeout(() => setCopiedSecret(false), 2500);
                          }}
                          className="text-[11px] text-slate-400 hover:text-white"
                        >
                          {copiedSecret ? "✓ Copiado" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Coluna dos Códigos de Backup e Confirmação */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* Passo 2: Códigos de Backup */}
                    <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>🔑</span> 2. Salve seus Códigos de Recuperação
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Use estes códigos caso não tenha acesso ao seu celular. Cada um funciona
                            uma única vez.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(setupData.backupCodes.join("\n"));
                            setCopiedCodes(true);
                            setTimeout(() => setCopiedCodes(false), 2500);
                          }}
                          className="text-xs font-bold text-emerald-400 hover:underline"
                        >
                          {copiedCodes ? "✓ Copiados!" : "Copiar Todos"}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                        {setupData.backupCodes.map((code) => (
                          <div
                            key={`setup-bcode-${code}`}
                            className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-center font-mono text-[11px] font-bold text-slate-200"
                          >
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Passo 3: Confirmação do Código */}
                    <form
                      onSubmit={handleConfirm2FA}
                      className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-5 space-y-4"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">
                          3. Confirme o Código de 6 Dígitos
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Informe o código numérico exibido no seu aplicativo autenticador para
                          concluir a ativação.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="000000"
                          value={verifyCode}
                          onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                          className="h-11 w-40 rounded-xl border border-emerald-500/40 bg-[#070c16] text-center font-mono text-lg font-bold tracking-widest text-emerald-300 outline-none focus:border-emerald-400"
                        />

                        <button
                          type="submit"
                          disabled={enabling2FA || verifyCode.trim().length !== 6}
                          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-950/20 disabled:opacity-50"
                        >
                          {enabling2FA ? "Ativando..." : "✓ Confirmar e Ativar 2FA"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSettingUp2FA(false);
                            setSetupData(null);
                            setVerifyCode("");
                            setTwoFactorMsg(null);
                          }}
                          className="rounded-xl border border-slate-700 bg-transparent px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              /* Cenário 3: 2FA não está ativado (Call to Action) */
              <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🔒</span> Proteja sua conta com Autenticação em Duas Etapas
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xl">
                      Ao ativar a verificação em duas etapas, além de sua senha, você precisará
                      digitar um código de 6 dígitos gerado pelo seu app autenticador ao fazer
                      login.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                      <span>✓ Google Authenticator</span>
                      <span>•</span>
                      <span>✓ Microsoft Authenticator</span>
                      <span>•</span>
                      <span>✓ Apple Keychain</span>
                      <span>•</span>
                      <span>✓ 1Password / Authy</span>
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleStart2FASetup}
                      className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-950/20"
                    >
                      <span>🛡️</span> Configurar 2FA Agora
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Confirmação para Desativar 2FA */}
            {showDisableModal && (
              <div className="mt-6 rounded-2xl border border-rose-900/60 bg-rose-950/20 p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                    <span>⚠</span> Confirmar Desativação do 2FA
                  </h4>
                  <p className="mt-1 text-xs text-slate-300">
                    Sua conta perderá a camada de proteção adicional. Para confirmar, digite sua
                    senha de login atual.
                  </p>
                </div>

                <form onSubmit={handleDisable2FA} className="flex flex-wrap items-center gap-3">
                  <input
                    type="password"
                    required
                    placeholder="Sua senha atual"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="h-10 w-64 rounded-xl border border-rose-900 bg-[#070c16] px-3 text-sm text-white outline-none focus:border-rose-400"
                  />

                  <button
                    type="submit"
                    disabled={disabling2FA || !disablePassword}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
                  >
                    {disabling2FA ? "Desativando..." : "Confirmar Desativação"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDisableModal(false);
                      setDisablePassword("");
                    }}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
                  >
                    Cancelar
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ================= ABA 4: PREFERÊNCIAS DA FARM ================= */}
      {activeTab === "preferences" && (
        <section className="rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-xl">
          <div className="mb-6 flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Preferências Operacionais &amp; Notificações
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Personalize como o CTRL-Farm se comunica com você durante a operação diária.
              </p>
            </div>
            {prefsSuccess && (
              <span className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                ✓ Preferências salvas!
              </span>
            )}
          </div>

          <div className="max-w-2xl space-y-4">
            {/* Notificações Sonoras */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <div>
                <p className="text-xs font-bold text-white">Alertas Sonoros de Conclusão</p>
                <p className="text-[11px] text-slate-400">
                  Emitir alerta sonoro suave quando uma impressão 3D finalizar com sucesso.
                </p>
              </div>
              <input
                type="checkbox"
                checked={soundAlerts}
                onChange={(e) => setSoundAlerts(e.target.checked)}
                className="h-5 w-5 accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Alerta de Estoque Baixo */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <div>
                <p className="text-xs font-bold text-white">
                  Notificação de Filamento Baixo (&lt; 300g)
                </p>
                <p className="text-[11px] text-slate-400">
                  Destacar no painel e na IA carretéis que estão perto de esgotar.
                </p>
              </div>
              <input
                type="checkbox"
                checked={lowStockAlerts}
                onChange={(e) => setLowStockAlerts(e.target.checked)}
                className="h-5 w-5 accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Modo de Visualização Padrão */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <div>
                <p className="text-xs font-bold text-white">Modo Padrão da Dashboard</p>
                <p className="text-[11px] text-slate-400">
                  Escolha se prefere iniciar a Dashboard em cards visuais ou em tabela densa.
                </p>
              </div>
              <select
                value={defaultView}
                onChange={(e) => setDefaultView(e.target.value as "cards" | "list")}
                className="h-9 rounded-xl border border-slate-700 bg-[#0b1220] px-3 text-xs text-white outline-none"
              >
                <option value="cards">Cards Interativos</option>
                <option value="list">Tabela Compacta</option>
              </select>
            </div>

            {/* Unidade de Pesagem */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <div>
                <p className="text-xs font-bold text-white">Unidade de Medida de Filamento</p>
                <p className="text-[11px] text-slate-400">
                  Exibição padrão de consumo em gramas (g) ou quilogramas (kg).
                </p>
              </div>
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as "g" | "kg")}
                className="h-9 rounded-xl border border-slate-700 bg-[#0b1220] px-3 text-xs text-white outline-none"
              >
                <option value="g">Gramas (g)</option>
                <option value="kg">Quilogramas (kg)</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSavePreferences}
                className="rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-950/20"
              >
                Salvar Preferências
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ================= ABA 5: EMPRESA & SESSÃO ================= */}
      {activeTab === "company" && (
        <section className="rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-xl">
          <div className="mb-6 border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white">Empresa &amp; Dados da Sessão</h2>
            <p className="mt-1 text-xs text-slate-400">
              Informações sobre a organização vinculada e auditoria do seu acesso ativo.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <p className="text-xs text-slate-400">Empresa / Fazenda 3D</p>
              <p className="mt-1 text-base font-bold text-white">
                {profile.companyName || "Minha Farm"}
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-500">ID: {profile.companyId}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <p className="text-xs text-slate-400">Nível de Permissão</p>
              <p className="mt-1 text-base font-bold text-emerald-400">{roleLabel}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Controle completo de insumos e telemetria
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <p className="text-xs text-slate-400">Status da Conta</p>
              <p className="mt-1 text-sm font-bold text-white">Ativa e Autorizada</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Última atualização: {new Date(profile.updatedAt).toLocaleDateString("pt-BR")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <p className="text-xs text-slate-400">Segurança de Sessão</p>
              <p className="mt-1 text-sm font-bold text-cyan-400">Token JWT Seguro</p>
              <p className="mt-1 text-[11px] text-slate-500">Expira em 24h a partir do login</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-5">
            <div>
              <p className="text-xs font-bold text-white">Deseja sair do sistema?</p>
              <p className="text-[11px] text-slate-400">
                O token será revogado e você precisará logar novamente para acessar a farm.
              </p>
            </div>
            <LogoutButton />
          </div>
        </section>
      )}
    </div>
  );
}
