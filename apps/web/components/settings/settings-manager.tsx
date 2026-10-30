"use client";

import { useMemo, useState, useEffect, type FormEvent } from "react";
import type { CompanyUserRecord } from "@/lib/server-users";
import type { CompanyRecord } from "@/lib/server-companies";
import type { PublicUser } from "@/lib/auth-types";
import { LgpdPrivacyTab } from "./lgpd-privacy-tab";
import { LicensingTab } from "./licensing-tab";
import { FirebaseCloudTab } from "./firebase-cloud-tab";
import { BackupRestoreTab } from "./backup-restore-tab";
import { SupportTab } from "./support-tab";
import { useLicensing } from "@/contexts/licensing-context";

export type RoleType = "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER";
export type DocType = "CNPJ" | "CPF";

const BRAZIL_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

const ROLE_CONFIG: Record<
  RoleType,
  {
    name: string;
    badgeClass: string;
    description: string;
    permissionsSummary: string;
    allowedActions: string[];
  }
> = {
  VIEWER: {
    name: "Padrão",
    badgeClass: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    description: "Visualização simples de dados da fazenda e suporte da IA.",
    permissionsSummary:
      "Visualiza Dashboard, filamentos, status de impressoras, clientes, insumos, produção, orçamentos e monitoramento por câmera. Tira dúvidas com a IA e edita o próprio perfil.",
    allowedActions: [
      "Visualizar Dashboard e telemetria",
      "Consultar estoque de carretéis de filamento",
      "Visualizar status de impressoras 3D",
      "Consultar insumos e almoxarifado",
      "Visualizar clientes e orçamentos feitos",
      "Visualizar ordens em produção",
      "Acompanhar monitoramento de câmeras",
      "Tirar dúvidas com o CTRL Bot (IA)",
      "Alterar informações do próprio perfil e senha",
    ],
  },
  OPERATOR: {
    name: "Operação",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    description: "Operação de chão de fábrica, pesagem de carretéis e precificação.",
    permissionsSummary:
      "Tudo do Padrão + ajuste de peso restante em filamentos, horas de uso de impressoras, cálculo de precificação, pausar/retomar/cancelar ordens em produção, novos orçamentos, download de arquivos 3D e ações operacionais com auxílio da IA.",
    allowedActions: [
      "Tudo do nível Padrão",
      "Ajustar peso restante de carretéis de filamento (-100g, -50g, balança)",
      "Ajustar horas de uso de bico e impressoras",
      "Acesso à Calculadora de Precificação para orçar produção",
      "Pausar, retomar ou cancelar ordens na fila de produção",
      "Visualizar e cadastrar novos orçamentos de clientes",
      "Baixar arquivos de projetos 3D (STL, 3MF, G-Code)",
      "Interagir com a IA para apoio em tarefas operacionais permitidas",
    ],
  },
  MANAGER: {
    name: "Moderador",
    badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    description: "Gerenciamento amplo de insumos, equipamentos, clientes e fornecedores.",
    permissionsSummary:
      "Tudo da Operação + cadastrar novos filamentos, cadastrar novas impressoras e alterar status, cadastrar novos clientes e fornecedores, pleno acesso à precificação e cadastro de insumos.",
    allowedActions: [
      "Tudo do nível Operação",
      "Cadastrar novos carretéis de filamento no estoque",
      "Cadastrar novas impressoras 3D e alterar seus status operacionais",
      "Cadastrar novos clientes na base",
      "Cadastrar novos parceiros e fornecedores",
      "Pleno acesso a orçamentos e fórmulas de precificação",
      "Cadastrar novos insumos e materiais no almoxarifado",
      "Interagir com o CTRL Bot com suporte avançado de gestão",
    ],
  },
  ADMIN: {
    name: "Administrador",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    description: "Acesso total irrestrito ao sistema, configurações e gestão de usuários.",
    permissionsSummary:
      "Controle total de todos os recursos da fazenda 3D, incluindo a área de Configuração para cadastrar, editar, redefinir senhas e excluir usuários da empresa.",
    allowedActions: [
      "Acesso Irrestrito e Pleno a todos os módulos do sistema",
      "Acesso exclusivo à área de Configurações do Sistema",
      "Cadastrar novos usuários e definir seus níveis de acesso",
      "Editar permissões, dados cadastrais e ativar/inativar contas",
      "Redefinir senhas de qualquer operador da empresa",
      "Excluir usuários desligados da empresa",
      "Gerenciar políticas corporativas e auditoria de segurança",
    ],
  },
};

export interface PermissionMatrixRow {
  module: string;
  viewer: boolean;
  operator: boolean;
  manager: boolean;
  admin: boolean;
}

const PERMISSIONS_MATRIX: PermissionMatrixRow[] = [
  {
    module: "Dashboard & Métricas Gerais",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Visualizar Impressoras & Telemetria",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Editar Horas de Uso / Manutenção",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Cadastrar Nova Impressora 3D",
    viewer: false,
    operator: false,
    manager: true,
    admin: true,
  },
  {
    module: "Visualizar Estoque de Filamentos",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Ajuste Manual de Peso do Carretel",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Cadastrar Nova Bobina de Filamento",
    viewer: false,
    operator: false,
    manager: true,
    admin: true,
  },
  {
    module: "Calculadora de Precificação & Custos",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Pleno Acesso a Custos & Depreciação",
    viewer: false,
    operator: false,
    manager: true,
    admin: true,
  },
  {
    module: "Visualizar Fila de Produção",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Pausar, Retomar ou Cancelar Ordem",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Visualizar Orçamentos Feitos",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Criar Novos Orçamentos de Clientes",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Baixar Arquivos 3D (STL, 3MF, G-Code)",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Visualizar Almoxarifado / Insumos",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  { module: "Cadastrar Novos Insumos", viewer: false, operator: false, manager: true, admin: true },
  { module: "Visualizar Clientes", viewer: true, operator: true, manager: true, admin: true },
  {
    module: "Cadastrar Novos Clientes",
    viewer: false,
    operator: false,
    manager: true,
    admin: true,
  },
  { module: "Visualizar Fornecedores", viewer: false, operator: false, manager: true, admin: true },
  { module: "Cadastrar Fornecedores", viewer: false, operator: false, manager: true, admin: true },
  {
    module: "Monitoramento de Vídeo / Câmeras",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "CTRL Bot (IA) - Dúvidas Gerais",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "CTRL Bot (IA) - Ações Operacionais",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Gestão de Usuários & Configuração",
    viewer: false,
    operator: false,
    manager: false,
    admin: true,
  },
];

function formatDocument(val: string, type: DocType): string {
  const digits = val.replace(/\D/g, "");
  if (type === "CPF") {
    return digits
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatPhone(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  }
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function formatCep(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function SettingsManager({
  initialUsers,
  initialCompany,
  currentUser,
  defaultTab,
}: {
  initialUsers: CompanyUserRecord[];
  initialCompany?: CompanyRecord | null;
  currentUser: PublicUser;
  defaultTab?: string;
}) {
  const [users, setUsers] = useState<CompanyUserRecord[]>(initialUsers);
  const [activeTab, setActiveTab] = useState<
    "company" | "users" | "matrix" | "system" | "lgpd" | "licensing" | "firebase" | "backup" | "support"
  >(
    defaultTab &&
      ["company", "users", "matrix", "system", "lgpd", "licensing", "firebase", "backup", "support"].includes(defaultTab)
      ? (defaultTab as any)
      : "company"
  );

  const selectTab = (tab: "company" | "users" | "matrix" | "system" | "lgpd" | "licensing" | "firebase" | "backup" | "support") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("ctrlfarm:tab-selected", { detail: { key: tab } }));
    }
  };

  useEffect(() => {
    if (
      defaultTab &&
      ["company", "users", "matrix", "system", "lgpd", "licensing", "firebase", "backup", "support"].includes(defaultTab)
    ) {
      setActiveTab(defaultTab as any);
    }
  }, [defaultTab]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  const { hasFeature, isLicensed } = useLicensing();
  const canShowPermissionsMatrix = isLicensed && (hasFeature("permissionsMatrix") || hasFeature("permissions"));

  // Modais de Criação e Edição de Usuário
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUserRecord | null>(null);

  // Estados de feedback de usuário
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const isAdmin = currentUser.role === "ADMIN";

  // ================= ESTADO DA EMPRESA (CPF / CNPJ & DADOS) =================
  const initialDoc = initialCompany?.document ?? "";
  const detectedDocType: DocType = initialDoc.replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ";

  const [companyDocType, setCompanyDocType] = useState<DocType>(detectedDocType);
  const [companyDoc, setCompanyDoc] = useState(
    initialDoc ? formatDocument(initialDoc, detectedDocType) : "",
  );
  const [companyName, setCompanyName] = useState(
    initialCompany?.name ?? currentUser.companyName ?? "",
  );
  const [companyTradeName, setCompanyTradeName] = useState(initialCompany?.tradeName ?? "");
  const [companyEmail, setCompanyEmail] = useState(initialCompany?.email ?? "");
  const [companyPhone, setCompanyPhone] = useState(
    initialCompany?.phone ? formatPhone(initialCompany.phone) : "",
  );
  const [companyIe, setCompanyIe] = useState("");
  const [isIeExempt, setIsIeExempt] = useState(false);
  const [companyIm, setCompanyIm] = useState("");
  const [website, setWebsite] = useState("");

  // Endereço
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SP");
  const [loadingCep, setLoadingCep] = useState(false);

  // Operação & PIX
  const [pixKeyType, setPixKeyType] = useState("CNPJ");
  const [pixKey, setPixKey] = useState("");
  const [specialty, setSpecialty] = useState("Prototipagem Rápida & Impressão 3D FDM");
  const [workingHours, setWorkingHours] = useState("Segunda a Sexta das 08h às 18h (Farm 24/7)");

  // Salvar Empresa
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySuccess, setCompanySuccess] = useState(false);
  const [companyError, setCompanyError] = useState("");

  // Carrega campos estendidos salvos no localStorage para esta empresa
  useEffect(() => {
    try {
      const companyId = initialCompany?.id ?? currentUser.companyId;
      const savedExt = localStorage.getItem(`ctrlfarm_company_ext_${companyId}`);
      if (savedExt) {
        const parsed = JSON.parse(savedExt);
        if (parsed.docType) setCompanyDocType(parsed.docType);
        if (parsed.ie) setCompanyIe(parsed.ie);
        if (parsed.isIeExempt !== undefined) setIsIeExempt(parsed.isIeExempt);
        if (parsed.im) setCompanyIm(parsed.im);
        if (parsed.website) setWebsite(parsed.website);
        if (parsed.cep) setCep(parsed.cep);
        if (parsed.street) setStreet(parsed.street);
        if (parsed.number) setNumber(parsed.number);
        if (parsed.complement) setComplement(parsed.complement);
        if (parsed.neighborhood) setNeighborhood(parsed.neighborhood);
        if (parsed.city) setCity(parsed.city);
        if (parsed.state) setState(parsed.state);
        if (parsed.pixKeyType) setPixKeyType(parsed.pixKeyType);
        if (parsed.pixKey) setPixKey(parsed.pixKey);
        if (parsed.specialty) setSpecialty(parsed.specialty);
        if (parsed.workingHours) setWorkingHours(parsed.workingHours);
      }
    } catch {
      // Ignora erro de storage
    }
  }, [initialCompany?.id, currentUser.companyId]);

  // ================= ESTADO DA MATRIZ DE PERMISSÕES =================
  const [permissionsMatrix, setPermissionsMatrix] =
    useState<PermissionMatrixRow[]>(PERMISSIONS_MATRIX);
  const [isEditingMatrix, setIsEditingMatrix] = useState(false);
  const [draftMatrix, setDraftMatrix] = useState<PermissionMatrixRow[]>(PERMISSIONS_MATRIX);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [matrixMessage, setMatrixMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Carrega permissões salvas no backend com fallback no localStorage
  useEffect(() => {
    async function loadPermissions() {
      const companyId = initialCompany?.id ?? currentUser.companyId;
      try {
        const res = await fetch("/api/companies/me/permissions");
        if (res.ok) {
          const json = await res.json();
          const rows = Array.isArray(json) ? json : json.data;
          if (Array.isArray(rows) && rows.length > 0) {
            setPermissionsMatrix(rows);
            setDraftMatrix(rows);
            return;
          }
        }
      } catch {
        // Fallback local
      }

      try {
        const local = localStorage.getItem(`ctrlfarm_permissions_matrix_${companyId}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPermissionsMatrix(parsed);
            setDraftMatrix(parsed);
          }
        }
      } catch {
        // Mantém matriz padrão
      }
    }

    loadPermissions();
  }, [initialCompany?.id, currentUser.companyId]);

  function handleStartEditMatrix() {
    setDraftMatrix(JSON.parse(JSON.stringify(permissionsMatrix)));
    setIsEditingMatrix(true);
    setMatrixMessage(null);
  }

  function handleCancelEditMatrix() {
    setDraftMatrix(JSON.parse(JSON.stringify(permissionsMatrix)));
    setIsEditingMatrix(false);
    setMatrixMessage(null);
  }

  function handleTogglePermission(moduleName: string, roleKey: "viewer" | "operator" | "manager") {
    setDraftMatrix((prev) =>
      prev.map((row) => {
        if (row.module !== moduleName) return row;
        return {
          ...row,
          [roleKey]: !row[roleKey],
        };
      }),
    );
  }

  async function handleSaveMatrix() {
    const companyId = initialCompany?.id ?? currentUser.companyId;
    setSavingMatrix(true);
    setMatrixMessage(null);

    // Administrador sempre com acesso total irrestrito (regra mandatória)
    const sanitized = draftMatrix.map((r) => ({
      ...r,
      admin: true,
    }));

    try {
      const res = await fetch("/api/companies/me/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: sanitized }),
      });

      if (res.ok) {
        const json = await res.json();
        const updated = Array.isArray(json) ? json : (json.data ?? sanitized);
        setPermissionsMatrix(updated);
        setDraftMatrix(updated);
      } else {
        setPermissionsMatrix(sanitized);
        setDraftMatrix(sanitized);
      }

      try {
        localStorage.setItem(`ctrlfarm_permissions_matrix_${companyId}`, JSON.stringify(sanitized));
      } catch {}

      setMatrixMessage({
        text: "Matriz de permissões atualizada e salva com sucesso!",
        type: "success",
      });
      setIsEditingMatrix(false);
    } catch {
      setPermissionsMatrix(sanitized);
      setDraftMatrix(sanitized);
      try {
        localStorage.setItem(`ctrlfarm_permissions_matrix_${companyId}`, JSON.stringify(sanitized));
      } catch {}
      setMatrixMessage({ text: "Permissões salvas no navegador da empresa.", type: "success" });
      setIsEditingMatrix(false);
    } finally {
      setSavingMatrix(false);
    }
  }

  function handleResetMatrixDefaults() {
    setDraftMatrix(JSON.parse(JSON.stringify(PERMISSIONS_MATRIX)));
    setMatrixMessage({
      text: "Permissões redefinidas para os padrões de fábrica do CTRL+Farm.",
      type: "success",
    });
  }

  // Busca automática de CEP via ViaCEP
  async function handleSearchCep(cepToSearch = cep) {
    const cleanCep = cepToSearch.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        if (data.uf) setState(data.uf);
      }
    } catch {
      // Falha de rede silenciosa
    } finally {
      setLoadingCep(false);
    }
  }

  // Salvar Dados da Empresa
  async function handleSaveCompany(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      setCompanyError("Apenas Administradores têm permissão para alterar os dados da empresa.");
      return;
    }

    setSavingCompany(true);
    setCompanyError("");
    setCompanySuccess(false);

    try {
      const response = await fetch("/api/companies/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName.trim(),
          tradeName: companyTradeName.trim() || undefined,
          document: companyDoc.trim() || undefined,
          email: companyEmail.trim() || undefined,
          phone: companyPhone.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Não foi possível atualizar os dados da empresa.");
      }

      // Salva campos estendidos de endereço e fiscais
      const companyId = initialCompany?.id ?? currentUser.companyId;
      const extData = {
        docType: companyDocType,
        ie: isIeExempt ? "ISENTO" : companyIe,
        isIeExempt,
        im: companyIm,
        website,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        pixKeyType,
        pixKey,
        specialty,
        workingHours,
      };
      localStorage.setItem(`ctrlfarm_company_ext_${companyId}`, JSON.stringify(extData));

      setCompanySuccess(true);
      setTimeout(() => setCompanySuccess(false), 4000);
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : "Erro ao salvar empresa.");
    } finally {
      setSavingCompany(false);
    }
  }

  // Filtragem de Usuários
  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        ROLE_CONFIG[u.role].name.toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter]);

  // Contadores
  const countAdmin = users.filter((u) => u.role === "ADMIN").length;
  const countManager = users.filter((u) => u.role === "MANAGER").length;
  const countOperator = users.filter((u) => u.role === "OPERATOR").length;
  const countViewer = users.filter((u) => u.role === "VIEWER").length;
  const countActive = users.filter((u) => u.active).length;

  async function handleDeleteUser(userToDelete: CompanyUserRecord) {
    if (!isAdmin) {
      setActionError("Apenas administradores podem excluir usuários.");
      return;
    }
    if (userToDelete.id === currentUser.id) {
      setActionError("Você não pode excluir sua própria conta de administrador.");
      return;
    }
    if (
      !window.confirm(
        `Tem certeza que deseja remover permanentemente o usuário "${userToDelete.name}" (${userToDelete.email})?`,
      )
    ) {
      return;
    }

    try {
      setActionError("");
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Não foi possível remover o usuário.");

      setUsers((curr) => curr.filter((u) => u.id !== userToDelete.id));
      setActionSuccess(`Usuário ${userToDelete.name} removido com sucesso.`);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao remover usuário.");
    }
  }

  const field =
    "h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-sm text-white outline-none transition focus:border-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed";
  const label = "grid min-w-0 gap-1.5 text-xs font-semibold text-slate-300";

  return (
    <div className="mx-auto max-w-[1560px] space-y-6 text-slate-100">
      {/* Cabeçalho das Configurações */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <span>⚙</span>
              <span>Painel de Controle Corporativo</span>
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-slate-900 shadow-md">
              ⚙
            </span>
            Configurações do Sistema &amp; Acessos
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Gestão dos dados cadastrais da empresa (CPF/CNPJ), controle de usuários e matriz de
            permissões.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 active:scale-95"
            >
              <span>＋</span>
              <span>Novo Usuário</span>
            </button>
          ) : (
            <span className="rounded-xl border border-slate-800 bg-[#0e1726] px-3.5 py-2 text-xs text-slate-400">
              Modo Leitura · Apenas Administradores podem salvar configurações da empresa e usuários
            </span>
          )}
        </div>
      </header>

      {/* Alertas de Ação de Usuários */}
      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-rose-900 bg-rose-950/60 p-3.5 text-xs text-rose-200"
        >
          <span>⚠ {actionError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            className="text-rose-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-emerald-900 bg-emerald-950/60 p-3.5 text-xs text-emerald-200 animate-in fade-in"
        >
          <span>✓ {actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess("")}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de Navegação Horizontal das Configurações */}
      <nav className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-800 bg-[#0e1626] p-1.5 text-xs font-semibold scrollbar-none">
        {[
          { key: "company", label: "Dados da Empresa", icon: "🏢" },
          { key: "users", label: "Usuários & Equipe", icon: "👥" },
          ...(canShowPermissionsMatrix ? [{ key: "matrix", label: "Matriz de Permissões", icon: "🛡️" }] : []),
          { key: "system", label: "Parâmetros da Farm", icon: "⚙️" },
          { key: "lgpd", label: "Privacidade & LGPD", icon: "📜" },
          { key: "licensing", label: "Assinatura & Updates", icon: "🔑" },
          { key: "firebase", label: "Nuvem & Firebase", icon: "☁️" },
          { key: "backup", label: "Backup do Serviço", icon: "💾" },
          { key: "support", label: "Suporte e Ajuda", icon: "💬" },
        ].map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => selectTab(t.key as any)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 transition shrink-0 ${
                isActive
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ================= ABA 1: DADOS DA EMPRESA (CPF / CNPJ) ================= */}
      {activeTab === "company" && (
        <section className="rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🏢</span>
                <h2 className="text-base font-bold text-white">
                  Identificação Cadastral da Organização
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Configure se sua empresa opera como Pessoa Jurídica (CNPJ) ou Pessoa Física (CPF),
                além dos dados fiscais e de contato.
              </p>
            </div>

            {companySuccess && (
              <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/30 animate-in fade-in">
                ✓ Informações da empresa salvas com sucesso!
              </span>
            )}
          </div>

          {companyError && (
            <p className="rounded-xl border border-rose-900 bg-rose-950/60 p-3.5 text-xs text-rose-200">
              ⚠ {companyError}
            </p>
          )}

          <form onSubmit={handleSaveCompany} className="space-y-6">
            {/* Bloco 1: Tipo de Documento (CPF vs CNPJ) */}
            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4.5 space-y-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                1. Tipo de Empresa &amp; Documento Fiscal
              </span>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="block text-xs font-semibold text-slate-300 mb-2">
                    Tipo de Cadastro *
                  </span>
                  <div className="flex items-center gap-3">
                    <label
                      className={`flex flex-1 items-center gap-2.5 rounded-xl border p-3 cursor-pointer transition ${
                        companyDocType === "CNPJ"
                          ? "border-emerald-500 bg-emerald-500/10 text-white font-bold"
                          : "border-slate-800 bg-[#0b1220] text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="docType"
                        disabled={!isAdmin}
                        checked={companyDocType === "CNPJ"}
                        onChange={() => {
                          setCompanyDocType("CNPJ");
                          setCompanyDoc(formatDocument(companyDoc, "CNPJ"));
                        }}
                        className="accent-emerald-500"
                      />
                      <div>
                        <p className="text-xs">Pessoa Jurídica</p>
                        <p className="text-[10px] text-slate-500 font-normal">
                          CNPJ / MEI / EIRELI / LTDA
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex flex-1 items-center gap-2.5 rounded-xl border p-3 cursor-pointer transition ${
                        companyDocType === "CPF"
                          ? "border-emerald-500 bg-emerald-500/10 text-white font-bold"
                          : "border-slate-800 bg-[#0b1220] text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="docType"
                        disabled={!isAdmin}
                        checked={companyDocType === "CPF"}
                        onChange={() => {
                          setCompanyDocType("CPF");
                          setCompanyDoc(formatDocument(companyDoc, "CPF"));
                        }}
                        className="accent-emerald-500"
                      />
                      <div>
                        <p className="text-xs">Pessoa Física</p>
                        <p className="text-[10px] text-slate-500 font-normal">
                          CPF / Autônomo / Maker
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <label className={label}>
                  Número do {companyDocType} *
                  <div className="relative">
                    <input
                      disabled={!isAdmin}
                      value={companyDoc}
                      onChange={(e) =>
                        setCompanyDoc(formatDocument(e.target.value, companyDocType))
                      }
                      placeholder={
                        companyDocType === "CNPJ" ? "00.000.000/0000-00" : "000.000.000-00"
                      }
                      className={`${field} font-mono`}
                    />
                    <span className="pointer-events-none absolute right-3 top-2.5 text-[11px] font-bold text-emerald-400">
                      {companyDocType}
                    </span>
                  </div>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  Razão Social / Nome Completo *
                  <input
                    required
                    disabled={!isAdmin}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex.: CTRL-Farm Impressão 3D e Prototipagem Ltda"
                    className={field}
                  />
                </label>

                <label className={label}>
                  Nome Fantasia / Nome Operacional
                  <input
                    disabled={!isAdmin}
                    value={companyTradeName}
                    onChange={(e) => setCompanyTradeName(e.target.value)}
                    placeholder="Ex.: CTRL+Farm Matriz"
                    className={field}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Inscrição Estadual (IE)
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isAdmin}
                        checked={isIeExempt}
                        onChange={(e) => setIsIeExempt(e.target.checked)}
                        className="accent-emerald-500"
                      />
                      <span>Isento</span>
                    </label>
                  </div>
                  <input
                    disabled={!isAdmin || isIeExempt}
                    value={isIeExempt ? "ISENTO" : companyIe}
                    onChange={(e) => setCompanyIe(e.target.value)}
                    placeholder="000.000.000.000"
                    className={`${field} font-mono`}
                  />
                </div>

                <label className={label}>
                  Inscrição Municipal (IM)
                  <input
                    disabled={!isAdmin}
                    value={companyIm}
                    onChange={(e) => setCompanyIm(e.target.value)}
                    placeholder="Ex.: 12345678"
                    className={`${field} font-mono`}
                  />
                </label>

                <label className={label}>
                  Website / Portfólio 3D
                  <input
                    type="url"
                    disabled={!isAdmin}
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://suafarm.com.br"
                    className={field}
                  />
                </label>
              </div>
            </div>

            {/* Bloco 2: Contato Corporativo */}
            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4.5 space-y-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                2. Contato Comercial &amp; Financeiro
              </span>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  E-mail Corporativo de Contato
                  <input
                    type="email"
                    disabled={!isAdmin}
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="Ex.: contato@ctrlfarm.com.br"
                    className={field}
                  />
                </label>

                <label className={label}>
                  Telefone / WhatsApp Comercial
                  <input
                    type="tel"
                    disabled={!isAdmin}
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(formatPhone(e.target.value))}
                    placeholder="(11) 98765-4321"
                    className={field}
                  />
                </label>
              </div>
            </div>

            {/* Bloco 3: Endereço da Fazenda 3D com Busca por CEP */}
            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4.5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                  3. Localização &amp; Endereço da Sede
                </span>
                <span className="text-[11px] text-slate-500">Auto-preenchimento via ViaCEP</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-[160px_auto_minmax(0,1fr)_100px]">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">CEP</label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      disabled={!isAdmin}
                      value={cep}
                      onChange={(e) => {
                        const formatted = formatCep(e.target.value);
                        setCep(formatted);
                        if (formatted.replace(/\D/g, "").length === 8) {
                          void handleSearchCep(formatted);
                        }
                      }}
                      placeholder="00000-000"
                      className={`${field} font-mono`}
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={!isAdmin || loadingCep || cep.replace(/\D/g, "").length !== 8}
                    onClick={() => void handleSearchCep()}
                    className="h-10 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-white disabled:opacity-50"
                  >
                    {loadingCep ? "Buscando..." : "Buscar CEP"}
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">
                    Logradouro / Rua
                  </label>
                  <input
                    disabled={!isAdmin}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Ex.: Av. Paulista"
                    className={`mt-1 ${field}`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Número</label>
                  <input
                    disabled={!isAdmin}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="1000"
                    className={`mt-1 ${field}`}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_90px]">
                <label className={label}>
                  Complemento
                  <input
                    disabled={!isAdmin}
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Galpão 03 / Sala 10"
                    className={field}
                  />
                </label>

                <label className={label}>
                  Bairro
                  <input
                    disabled={!isAdmin}
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Bela Vista"
                    className={field}
                  />
                </label>

                <label className={label}>
                  Cidade
                  <input
                    disabled={!isAdmin}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo"
                    className={field}
                  />
                </label>

                <label className={label}>
                  Estado (UF)
                  <select
                    disabled={!isAdmin}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={field}
                  >
                    {BRAZIL_STATES.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Bloco 4: Chave PIX & Operação */}
            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4.5 space-y-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                4. Dados de Pagamento (PIX) &amp; Operação da Farm
              </span>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Chave PIX para Orçamentos
                    </span>
                    <select
                      disabled={!isAdmin}
                      value={pixKeyType}
                      onChange={(e) => setPixKeyType(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-[#0b1220] px-2 py-0.5 text-[10px] text-emerald-400 outline-none"
                    >
                      <option value="CNPJ">CNPJ</option>
                      <option value="CPF">CPF</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="TELEFONE">Telefone</option>
                      <option value="ALEATORIA">Chave Aleatória</option>
                    </select>
                  </div>
                  <input
                    disabled={!isAdmin}
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Informe a chave PIX que constará nos orçamentos"
                    className={`${field} font-mono`}
                  />
                </div>

                <label className={label}>
                  Especialidade / Ramo da Fazenda 3D
                  <input
                    disabled={!isAdmin}
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Ex.: Prototipagem Rápida FDM & Produção de Lotes"
                    className={field}
                  />
                </label>
              </div>

              <label className={label}>
                Horário de Atendimento e Regime de Impressão
                <input
                  disabled={!isAdmin}
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="Ex.: Atendimento Seg-Sex 08h-18h | Fazenda de Impressão 24/7"
                  className={field}
                />
              </label>
            </div>

            {/* Ação Salvar Empresa */}
            {isAdmin ? (
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-lg shadow-emerald-950/30 disabled:opacity-60"
                >
                  {savingCompany ? "Salvando Informações..." : "Salvar Dados da Empresa"}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-[#070c16] p-3 text-center text-xs text-slate-400">
                🔒 Apenas usuários Administradores podem atualizar as informações cadastrais da
                empresa.
              </div>
            )}
          </form>
        </section>
      )}

      {/* ================= ABA 2: LISTA E GESTÃO DE USUÁRIOS ================= */}
      {activeTab === "users" && (
        <section className="space-y-4">
          {/* Cards de Resumo dos 4 Níveis */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-[#101827] p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  Administrador
                </span>
                <span className="text-sm">👑</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <strong className="text-2xl font-black text-white">{countAdmin}</strong>
                <span className="text-xs text-slate-400">usuário(s)</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Acesso pleno e irrestrito ao sistema
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#101827] p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                  Moderador
                </span>
                <span className="text-sm">🚀</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <strong className="text-2xl font-black text-white">{countManager}</strong>
                <span className="text-xs text-slate-400">usuário(s)</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Gestão de máquinas, bobinas e clientes
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#101827] p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                  Operação
                </span>
                <span className="text-sm">🛠️</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <strong className="text-2xl font-black text-white">{countOperator}</strong>
                <span className="text-xs text-slate-400">usuário(s)</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Pesagem de filamentos, precificação e ordens
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#101827] p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                  Padrão
                </span>
                <span className="text-sm">👁️</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <strong className="text-2xl font-black text-white">{countViewer}</strong>
                <span className="text-xs text-slate-400">usuário(s)</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Acesso de consulta e tirar dúvidas na IA
              </p>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0d1424] p-3">
            <div className="flex min-w-[260px] flex-1 items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-2.5 text-xs text-slate-500">
                  🔍
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar usuário por nome, e-mail ou cargo..."
                  className="h-9 w-full rounded-xl border border-slate-700/80 bg-[#070c16] pl-9 pr-3 text-xs text-white outline-none transition focus:border-emerald-400"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-700/80 bg-[#070c16] px-3 text-xs text-slate-200 outline-none"
              >
                <option value="">Todos os Níveis</option>
                <option value="ADMIN">Administrador</option>
                <option value="MANAGER">Moderador</option>
                <option value="OPERATOR">Operação</option>
                <option value="VIEWER">Padrão</option>
              </select>
            </div>

            <span className="text-xs text-slate-400">
              {visibleUsers.length} de {users.length} usuário(s) · {countActive} ativo(s)
            </span>
          </div>

          {/* Tabela de Usuários */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101827]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#0b1220] text-xs font-semibold text-slate-400">
                  <tr>
                    <th className="px-4 py-3.5">Usuário</th>
                    <th className="px-4 py-3.5">Nível de Acesso</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Membro Desde</th>
                    <th className="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {visibleUsers.map((u) => {
                    const roleMeta = ROLE_CONFIG[u.role];
                    const isSelf = u.id === currentUser.id;

                    return (
                      <tr key={u.id} className="transition hover:bg-slate-800/30">
                        {/* Nome & E-mail */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 font-bold text-xs text-slate-950">
                              {u.name.trim().charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] text-emerald-400">
                                    Você
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-[11px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Nível de Acesso */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${roleMeta.badgeClass}`}
                          >
                            <span>{roleMeta.name}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {u.active ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              <span>Ativo</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                              <span>Inativo</span>
                            </span>
                          )}
                        </td>

                        {/* Data */}
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdmin ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingUser(u)}
                                  title="Editar nível de acesso e senha"
                                  className="rounded-lg border border-slate-700 p-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
                                >
                                  ✏
                                </button>
                                <button
                                  type="button"
                                  disabled={isSelf}
                                  onClick={() => void handleDeleteUser(u)}
                                  title={
                                    isSelf
                                      ? "Você não pode excluir sua própria conta"
                                      : "Excluir usuário da empresa"
                                  }
                                  className={`rounded-lg border border-slate-700 p-1.5 text-xs transition ${
                                    isSelf
                                      ? "opacity-30 cursor-not-allowed text-slate-600"
                                      : "text-rose-400 hover:border-rose-800 hover:bg-rose-950/30"
                                  }`}
                                >
                                  🗑
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-500">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ================= ABA 3: MATRIZ DE PERMISSÕES ================= */}
      {activeTab === "matrix" && canShowPermissionsMatrix && (
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-[#101827] p-5 shadow-xl">
            <h2 className="text-base font-bold text-white">Detalhamento dos 4 Níveis de Acesso</h2>
            <p className="mt-1 text-xs text-slate-400">
              Conheça as permissões específicas e responsabilidades operacionais atribuídas a cada
              perfil.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(["VIEWER", "OPERATOR", "MANAGER", "ADMIN"] as const).map((r) => {
                const meta = ROLE_CONFIG[r];
                return (
                  <div
                    key={r}
                    className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#070c16] p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}
                        >
                          {meta.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{r}</span>
                      </div>

                      <h3 className="mt-2 text-xs font-bold text-white">{meta.description}</h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                        {meta.permissionsSummary}
                      </p>
                    </div>

                    <div className="mt-3 border-t border-slate-800/80 pt-2 text-[10px] text-slate-400">
                      <strong>Destaque:</strong> {meta.allowedActions[1] ?? meta.allowedActions[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Matriz Completa Tabela */}
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#101827] shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4 sm:px-6">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Tabela Comparativa de Permissões por Módulo
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isEditingMatrix
                    ? "Edição de privilégios ativada. Modifique os acessos por perfil e clique em Salvar."
                    : "Matriz operacional ativa de privilégios e permissões por função."}
                </p>
              </div>

              {/* Botões de Ação Exclusivos do Administrador */}
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  {!isEditingMatrix ? (
                    <button
                      type="button"
                      onClick={handleStartEditMatrix}
                      className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25 active:scale-95 shadow-sm"
                      title="Editar permissões dos perfis Padrão, Operação e Moderador"
                    >
                      <span>✏️</span>
                      <span>Editar Permissões</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={savingMatrix}
                        onClick={handleSaveMatrix}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 active:scale-95 disabled:opacity-50 shadow"
                      >
                        <span>💾</span>
                        <span>{savingMatrix ? "Salvando…" : "Salvar Alterações"}</span>
                      </button>

                      <button
                        type="button"
                        disabled={savingMatrix}
                        onClick={handleResetMatrixDefaults}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
                        title="Restaurar permissões originais do sistema"
                      >
                        <span>↺</span>
                        <span>Restaurar Padrões</span>
                      </button>

                      <button
                        type="button"
                        disabled={savingMatrix}
                        onClick={handleCancelEditMatrix}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-800/50 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-900/40 disabled:opacity-50"
                      >
                        <span>✕</span>
                        <span>Cancelar</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Alerta de Feedback */}
            {matrixMessage && (
              <div
                className={`mx-4 mt-3 rounded-xl border p-3 text-xs font-medium sm:mx-6 ${
                  matrixMessage.type === "success"
                    ? "border-emerald-600/50 bg-emerald-950/40 text-emerald-200"
                    : "border-rose-600/50 bg-rose-950/40 text-rose-200"
                }`}
              >
                {matrixMessage.text}
              </div>
            )}

            {/* Aviso no modo de edição */}
            {isEditingMatrix && (
              <div className="mx-4 mt-3 rounded-xl border border-amber-600/40 bg-amber-950/25 p-3 text-xs text-amber-200 sm:mx-6">
                💡 <strong>Modo de Edição Ativo:</strong> Clique nos checkboxes para conceder ou
                revogar acessos dos níveis <strong>Padrão</strong>, <strong>Operação</strong> e{" "}
                <strong>Moderador</strong>. O nível <strong>Administrador</strong> tem acesso total
                garantido e irrestrito.
              </div>
            )}

            <div className="overflow-x-auto p-4 sm:p-6 pt-3">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-[#0b1220] text-slate-400 font-semibold rounded-xl">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Módulo / Recurso do Sistema</th>
                    <th className="px-4 py-3 text-center">Padrão</th>
                    <th className="px-4 py-3 text-center">Operação</th>
                    <th className="px-4 py-3 text-center">Moderador</th>
                    <th className="px-4 py-3 text-center text-emerald-400 rounded-r-xl">
                      Administrador (Acesso Total)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(isEditingMatrix ? draftMatrix : permissionsMatrix).map((row) => (
                    <tr
                      key={row.module}
                      className={`transition ${isEditingMatrix ? "hover:bg-slate-800/40 bg-slate-900/20" : "hover:bg-slate-800/30"}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-200">{row.module}</td>

                      {/* Coluna Padrão (Viewer) */}
                      <td className="px-4 py-3 text-center">
                        {isEditingMatrix ? (
                          <label className="inline-flex items-center justify-center cursor-pointer p-1">
                            <input
                              type="checkbox"
                              checked={row.viewer}
                              onChange={() => handleTogglePermission(row.module, "viewer")}
                              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 accent-emerald-500 cursor-pointer focus:ring-emerald-500"
                            />
                          </label>
                        ) : row.viewer ? (
                          <span className="text-emerald-400 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Coluna Operação (Operator) */}
                      <td className="px-4 py-3 text-center">
                        {isEditingMatrix ? (
                          <label className="inline-flex items-center justify-center cursor-pointer p-1">
                            <input
                              type="checkbox"
                              checked={row.operator}
                              onChange={() => handleTogglePermission(row.module, "operator")}
                              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 accent-emerald-500 cursor-pointer focus:ring-emerald-500"
                            />
                          </label>
                        ) : row.operator ? (
                          <span className="text-emerald-400 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Coluna Moderador (Manager) */}
                      <td className="px-4 py-3 text-center">
                        {isEditingMatrix ? (
                          <label className="inline-flex items-center justify-center cursor-pointer p-1">
                            <input
                              type="checkbox"
                              checked={row.manager}
                              onChange={() => handleTogglePermission(row.module, "manager")}
                              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 accent-emerald-500 cursor-pointer focus:ring-emerald-500"
                            />
                          </label>
                        ) : row.manager ? (
                          <span className="text-emerald-400 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Coluna Administrador (Acesso Total Fixo) */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20"
                          title="Administrador possui acesso total a todos os módulos"
                        >
                          ✓ Total
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ================= ABA 4: PARÂMETROS DA FARM ================= */}
      {activeTab === "system" && (
        <section className="space-y-4 rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white">
              Parâmetros &amp; Políticas da Organização
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Diretrizes de segurança e governança ativas no CTRL-Farm.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <span className="text-xs text-slate-400">Organização Licenciada</span>
              <p className="mt-1 text-base font-bold text-white">
                {companyName || currentUser.companyName || "Fazenda 3D"}
              </p>
              <p className="mt-1 text-xs text-emerald-400 font-mono">
                {companyDocType}: {companyDoc || "Não informado"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <span className="text-xs text-slate-400">Políticas de Senha</span>
              <p className="mt-1 text-sm font-bold text-white">Mínimo de 6 Caracteres</p>
              <p className="mt-1 text-xs text-slate-400">Criptografia Bcrypt com Salt Rounds 10</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <span className="text-xs text-slate-400">Sessão &amp; Autenticação</span>
              <p className="mt-1 text-sm font-bold text-white">JWT com Validade de 24 horas</p>
              <p className="mt-1 text-xs text-slate-400">
                Cookies HttpOnly protegidos com SameSite Lax
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <span className="text-xs text-slate-400">Assistente CTRL Bot (IA)</span>
              <p className="mt-1 text-sm font-bold text-white">API Gemini 2.5 Flash / Flash Lite</p>
              <p className="mt-1 text-xs text-slate-400">
                Execução restrita conforme o nível de cada usuário
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ================= ABA 5: PRIVACIDADE & CONFORMIDADE LGPD ================= */}
      {activeTab === "lgpd" && (
        <LgpdPrivacyTab currentUserId={currentUser.id} companyId={currentUser.companyId} />
      )}

      {/* ================= ABA 6: ASSINATURA & CONTROLE DE ATUALIZAÇÕES ================= */}
      {activeTab === "licensing" && <LicensingTab currentUser={currentUser} />}

      {/* ================= ABA 7: NUVEM & FIREBASE ================= */}
      {activeTab === "firebase" && <FirebaseCloudTab />}

      {/* ================= ABA 8: BACKUP COMPLETO DO SERVIÇO ================= */}
      {activeTab === "backup" && (
        <BackupRestoreTab currentUser={currentUser} company={initialCompany} />
      )}

      {/* ================= ABA 9: SUPORTE TÉCNICO INTELIGENTE & HUMANO ================= */}
      {activeTab === "support" && (
        <SupportTab currentUser={currentUser} />
      )}

      {/* ================= MODAL: CRIAR NOVO USUÁRIO ================= */}
      {createModalOpen && (
        <CreateUserModal
          onClose={() => setCreateModalOpen(false)}
          onCreated={(newUser) => {
            setUsers((curr) => [newUser, ...curr]);
            setActionSuccess(`Usuário "${newUser.name}" cadastrado com sucesso!`);
            setTimeout(() => setActionSuccess(""), 4000);
          }}
        />
      )}

      {/* ================= MODAL: EDITAR USUÁRIO ================= */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={(updated) => {
            setUsers((curr) => curr.map((u) => (u.id === updated.id ? updated : u)));
            setActionSuccess(`Dados de "${updated.name}" atualizados com sucesso.`);
            setTimeout(() => setActionSuccess(""), 4000);
          }}
        />
      )}
    </div>
  );
}

// Modal de Criação de Usuário
function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: CompanyUserRecord) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleType>("OPERATOR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleGeneratePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.message ?? "Não foi possível cadastrar o usuário.");
      }

      onCreated(payload.data as CompanyUserRecord);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-sm text-white outline-none transition focus:border-emerald-400";
  const label = "grid min-w-0 gap-1.5 text-xs font-semibold text-slate-300";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-title"
        className="my-auto max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-700 bg-[#0b1220] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 id="create-user-title" className="text-base font-bold text-white">
              Cadastrar Novo Usuário
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Adicione um novo operador ou moderador à sua fazenda 3D e defina seu nível de acesso.
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-rose-900 bg-rose-950/60 p-3 text-xs text-rose-200"
          >
            ⚠ {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className={label}>
            Nome Completo *
            <input
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Lucas Martins"
              className={field}
            />
          </label>

          <label className={label}>
            E-mail Institucional *
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex.: lucas@farm3d.com.br"
              className={field}
            />
          </label>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Senha Provisória *</span>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[11px] font-semibold text-emerald-400 hover:underline"
              >
                ⚡ Gerar Senha Segura
              </button>
            </div>
            <input
              required
              type="text"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite ou gere uma senha"
              className={`mt-1.5 ${field} font-mono`}
            />
          </div>

          <div>
            <label className={label}>Nível de Acesso *</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["VIEWER", "OPERATOR", "MANAGER", "ADMIN"] as const).map((r) => {
                const meta = ROLE_CONFIG[r];
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-xl border p-2.5 text-center transition ${
                      isSelected
                        ? "border-emerald-400 bg-emerald-500/15 font-bold shadow-sm"
                        : "border-slate-800 bg-[#070c16] text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <p className="text-xs">{meta.name}</p>
                    <span className="text-[10px] text-slate-500 font-mono">{r}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 rounded-xl border border-slate-800 bg-[#070c16] p-3 text-xs text-slate-400">
              <strong className="text-white">{ROLE_CONFIG[role].name}: </strong>
              <span>{ROLE_CONFIG[role].permissionsSummary}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-950/20 disabled:opacity-60"
            >
              {saving ? "Cadastrando..." : "Cadastrar Usuário"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de Edição de Usuário
function EditUserModal({
  user,
  onClose,
  onUpdated,
}: {
  user: CompanyUserRecord;
  onClose: () => void;
  onUpdated: (user: CompanyUserRecord) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<RoleType>(user.role);
  const [active, setActive] = useState(user.active);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Nome e e-mail não podem ficar vazios.");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError("Se preenchida, a nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          active,
          ...(newPassword ? { password: newPassword } : {}),
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.message ?? "Não foi possível atualizar o usuário.");
      }

      onUpdated(payload.data as CompanyUserRecord);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-sm text-white outline-none transition focus:border-emerald-400";
  const label = "grid min-w-0 gap-1.5 text-xs font-semibold text-slate-300";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-title"
        className="my-auto max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-700 bg-[#0b1220] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 id="edit-user-title" className="text-base font-bold text-white">
              Editar Usuário &amp; Permissões
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Altere o cargo, ative/inative a conta ou redefina a senha de acesso.
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-rose-900 bg-rose-950/60 p-3 text-xs text-rose-200"
          >
            ⚠ {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
            E-mail *
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </label>

          <div>
            <label className={label}>Nível de Acesso *</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["VIEWER", "OPERATOR", "MANAGER", "ADMIN"] as const).map((r) => {
                const meta = ROLE_CONFIG[r];
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-xl border p-2.5 text-center transition ${
                      isSelected
                        ? "border-emerald-400 bg-emerald-500/15 font-bold shadow-sm"
                        : "border-slate-800 bg-[#070c16] text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <p className="text-xs">{meta.name}</p>
                    <span className="text-[10px] text-slate-500 font-mono">{r}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 rounded-xl border border-slate-800 bg-[#070c16] p-2.5 text-xs text-slate-400">
              <strong className="text-white">{ROLE_CONFIG[role].name}: </strong>
              <span>{ROLE_CONFIG[role].permissionsSummary}</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#070c16] p-3">
            <div>
              <p className="text-xs font-bold text-white">Status da Conta</p>
              <p className="text-[11px] text-slate-400">
                Usuários inativos não conseguem fazer login.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          <div>
            <label className={label}>
              Redefinir Senha do Usuário (Opcional)
              <input
                type="text"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Deixe em branco para manter a senha atual"
                className={`${field} font-mono`}
              />
            </label>
            <p className="mt-1 text-[11px] text-slate-400">
              Se preenchido, o usuário passará a usar esta nova senha imediatamente.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-950/20 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
