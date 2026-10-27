"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { STLFolderIcon } from "@/components/icons/stl-folder-icon";

type ProjectCategory =
  | "PROJECTS"
  | "MARKETPLACE"
  | "IDEAS"
  | "MODEL"
  | "DOCUMENTATION"
  | "IMAGE"
  | "OTHER";

export type ProjectFile = {
  id: string;
  projectName: string;
  version: string | null;
  category: ProjectCategory | string;
  description: string | null;
  tags: string[];
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  productionJob: { id: string; name: string } | null;
};

type ProductionJob = { id: string; name: string; status: string };

type TabType = "all" | "projects" | "marketplace" | "ideas";

export interface ProjectMeta {
  client?: string;
  marketplace?: string;
  source?: string;
  externalUrl?: string;
  coverImageUrl?: string;
  photos: string[];
  extraFiles?: string;
  author?: string;
  ideaStatus?: "analise" | "testando" | "validado" | "aprovado";
  cleanTags: string[];
}

export function parseProjectTags(tags: string[] = []): ProjectMeta {
  let client: string | undefined;
  let marketplace: string | undefined;
  let source: string | undefined;
  let externalUrl: string | undefined;
  let extraFiles: string | undefined;
  let author: string | undefined;
  let ideaStatus: "analise" | "testando" | "validado" | "aprovado" | undefined;
  const photos: string[] = [];
  const cleanTags: string[] = [];

  for (const t of tags) {
    if (t.startsWith("client:")) client = t.slice(7).trim();
    else if (t.startsWith("marketplace:")) marketplace = t.slice(12).trim();
    else if (t.startsWith("source:")) source = t.slice(7).trim();
    else if (t.startsWith("url:")) externalUrl = t.slice(4).trim();
    else if (t.startsWith("img:")) {
      const url = t.slice(4).trim();
      if (url && !photos.includes(url)) photos.push(url);
    } else if (t.startsWith("photo:")) {
      const url = t.slice(6).trim();
      if (url && !photos.includes(url)) photos.push(url);
    } else if (t.startsWith("extras:")) {
      extraFiles = t.slice(7).trim();
    } else if (t.startsWith("author:")) author = t.slice(7).trim();
    else if (t.startsWith("status:")) {
      ideaStatus = t.slice(7).trim() as "analise" | "testando" | "validado" | "aprovado";
    } else {
      cleanTags.push(t);
    }
  }

  const coverImageUrl = photos[0];
  return {
    client,
    marketplace,
    source,
    externalUrl,
    coverImageUrl,
    photos,
    extraFiles,
    author,
    ideaStatus,
    cleanTags,
  };
}

export function buildProjectTags(meta: {
  cleanTags: string[];
  client?: string;
  marketplace?: string;
  source?: string;
  externalUrl?: string;
  photos?: string[];
  coverImageUrl?: string;
  extraFiles?: string;
  author?: string;
  ideaStatus?: string;
}): string[] {
  const result = [...meta.cleanTags];
  if (meta.client?.trim()) result.push(`client:${meta.client.trim()}`);
  if (meta.marketplace?.trim()) result.push(`marketplace:${meta.marketplace.trim()}`);
  if (meta.source?.trim()) result.push(`source:${meta.source.trim()}`);
  if (meta.externalUrl?.trim()) result.push(`url:${meta.externalUrl.trim()}`);

  const photoList = meta.photos ?? (meta.coverImageUrl ? [meta.coverImageUrl] : []);
  for (const p of photoList) {
    if (p.trim()) result.push(`img:${p.trim()}`);
  }

  if (meta.extraFiles?.trim()) result.push(`extras:${meta.extraFiles.trim()}`);
  if (meta.author?.trim()) result.push(`author:${meta.author.trim()}`);
  if (meta.ideaStatus?.trim()) result.push(`status:${meta.ideaStatus.trim()}`);
  return result;
}

const formatSize = (bytes: number) => {
  if (bytes <= 0) return "Atalho Web";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length > 1) {
    return (parts[parts.length - 1] ?? "").toUpperCase();
  }
  return "STL";
}

export function ProjectFilesManager({
  currentUserRole = "ADMIN",
  currentUserName = "Operador",
  defaultTab = "all",
}: {
  currentUserRole?: string;
  currentUserName?: string;
  defaultTab?: string;
}) {
  const canManage = currentUserRole === "ADMIN" || currentUserRole === "MANAGER";

  // Estados principais
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Aba ativa e filtros
  const [activeTab, setActiveTab] = useState<TabType>(
    defaultTab && ["all", "projects", "marketplace", "ideas"].includes(defaultTab)
      ? (defaultTab as TabType)
      : "all"
  );

  const selectTab = (tab: TabType) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("ctrlfarm:tab-selected", { detail: { key: tab } }));
    }
  };

  useEffect(() => {
    if (defaultTab && ["all", "projects", "marketplace", "ideas"].includes(defaultTab)) {
      setActiveTab(defaultTab as TabType);
    }
  }, [defaultTab]);
  const [query, setQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "size">("newest");

  // Modais de Cadastro e Importação
  const [showManualModal, setShowManualModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Modal de Edição Completa
  const [editingFile, setEditingFile] = useState<ProjectFile | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<ProjectCategory>("PROJECTS");
  const [editVersion, setEditVersion] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editMarketplace, setEditMarketplace] = useState("");
  const [editIdeaStatus, setEditIdeaStatus] = useState<
    "analise" | "testando" | "validado" | "aprovado"
  >("analise");
  const [editExternalUrl, setEditExternalUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExtraFiles, setEditExtraFiles] = useState("");
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editPhotoInput, setEditPhotoInput] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editJobId, setEditJobId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);

  // Modal de Galeria de Fotos / Lightbox
  const [galleryPhotos, setGalleryPhotos] = useState<string[] | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Modal de Detalhes / Descrição Completa
  const [detailsFile, setDetailsFile] = useState<{
    file: ProjectFile;
    meta: ProjectMeta;
  } | null>(null);

  // Estado do Formulário Manual
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState<ProjectCategory>("PROJECTS");
  const [manualVersion, setManualVersion] = useState("");
  const [manualClient, setManualClient] = useState("");
  const [manualMarketplace, setManualMarketplace] = useState("");
  const [manualIdeaStatus, setManualIdeaStatus] = useState<
    "analise" | "testando" | "validado" | "aprovado"
  >("analise");
  const [manualPhotos, setManualPhotos] = useState<string[]>([]);
  const [manualPhotoInput, setManualPhotoInput] = useState("");
  const [manualExternalUrl, setManualExternalUrl] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualExtraFiles, setManualExtraFiles] = useState("");
  const [manualTags, setManualTags] = useState("");
  const [manualJobId, setManualJobId] = useState("");
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [savingManual, setSavingManual] = useState(false);
  const [uploadingManualPhoto, setUploadingManualPhoto] = useState(false);

  // Estado do Importador de Link 3D
  const [importUrl, setImportUrl] = useState("");
  const [parsingLink, setParsingLink] = useState(false);
  const [linkMetadata, setLinkMetadata] = useState<{
    platform: string;
    platformKey: string;
    title: string;
    description: string | null;
    coverImageUrl: string | null;
    author: string | null;
    suggestedTags: string[];
    externalUrl: string;
  } | null>(null);
  const [importTargetTab, setImportTargetTab] = useState<ProjectCategory>("IDEAS");
  const [importClient, setImportClient] = useState("");
  const [importMarketplace, setImportMarketplace] = useState("");
  const [importExtraFiles, setImportExtraFiles] = useState("");
  const [importPhotos, setImportPhotos] = useState<string[]>([]);
  const [importPhotoInput, setImportPhotoInput] = useState("");
  const [savingImport, setSavingImport] = useState(false);

  // Carrega lista de arquivos e ordens de produção
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setLoading(true);
        const [filesRes, jobsRes] = await Promise.all([
          fetch("/api/project-files"),
          fetch("/api/production"),
        ]);
        const [filesJson, jobsJson] = await Promise.all([filesRes.json(), jobsRes.json()]);

        if (!filesRes.ok) {
          throw new Error(filesJson.message ?? "Não foi possível carregar os arquivos STL.");
        }

        if (!ignore) {
          setFiles(filesJson.data ?? []);
          if (jobsRes.ok) setJobs(jobsJson.data ?? []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Erro ao carregar arquivos.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  // Classificação estrita dos arquivos por aba: cada arquivo pertence exclusivamente à sua aba
  const categorizedFiles = useMemo(() => {
    return files.map((file) => {
      const meta = parseProjectTags(file.tags);
      let tabGroup: "projects" | "marketplace" | "ideas" = "projects";

      const cat = (file.category || "").toUpperCase();
      if (cat === "MARKETPLACE") {
        tabGroup = "marketplace";
      } else if (cat === "IDEAS") {
        tabGroup = "ideas";
      } else if (cat === "PROJECTS") {
        tabGroup = "projects";
      } else {
        // Fallback para modelos sem categoria explícita
        if (meta.marketplace || file.tags.some((t) => t.startsWith("marketplace:"))) {
          tabGroup = "marketplace";
        } else if (meta.ideaStatus || file.tags.some((t) => t.startsWith("status:"))) {
          tabGroup = "ideas";
        } else {
          tabGroup = "projects";
        }
      }

      return { file, meta, tabGroup };
    });
  }, [files]);

  // Contadores para as abas
  const tabCounts = useMemo(() => {
    let projects = 0;
    let marketplace = 0;
    let ideas = 0;
    for (const item of categorizedFiles) {
      if (item.tabGroup === "projects") projects++;
      else if (item.tabGroup === "marketplace") marketplace++;
      else if (item.tabGroup === "ideas") ideas++;
    }
    return {
      all: files.length,
      projects,
      marketplace,
      ideas,
    };
  }, [categorizedFiles, files.length]);

  // Filtra e ordena os arquivos visíveis
  const visibleFiles = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = categorizedFiles.filter(({ file, meta, tabGroup }) => {
      // 1. Filtro da aba
      if (activeTab === "projects" && tabGroup !== "projects") return false;
      if (activeTab === "marketplace" && tabGroup !== "marketplace") return false;
      if (activeTab === "ideas" && tabGroup !== "ideas") return false;

      // 2. Filtro de formato
      if (formatFilter !== "all") {
        const ext = getFileExtension(file.originalName).toLowerCase();
        if (formatFilter === "3mf" && ext !== "3mf") return false;
        if (formatFilter === "stl" && ext !== "stl") return false;
        if (formatFilter === "step" && ext !== "step" && ext !== "stp") return false;
        if (formatFilter === "url" && ext !== "url") return false;
      }

      // 3. Busca textual
      if (q) {
        const fullString = [
          file.projectName,
          file.originalName,
          file.version ?? "",
          file.description ?? "",
          meta.client ?? "",
          meta.marketplace ?? "",
          meta.source ?? "",
          meta.author ?? "",
          meta.extraFiles ?? "",
          ...meta.cleanTags,
        ]
          .join(" ")
          .toLowerCase();

        if (!fullString.includes(q)) return false;
      }

      return true;
    });

    // Ordenação
    return filtered.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.file.createdAt).getTime() - new Date(a.file.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.file.createdAt).getTime() - new Date(b.file.createdAt).getTime();
      }
      if (sortBy === "name") {
        return a.file.projectName.localeCompare(b.file.projectName, "pt-BR");
      }
      if (sortBy === "size") {
        return b.file.sizeBytes - a.file.sizeBytes;
      }
      return 0;
    });
  }, [categorizedFiles, activeTab, formatFilter, query, sortBy]);

  function showFeedback(msg: string, isError = false) {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(""), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  }

  // Upload de arquivo de imagem do computador para o servidor
  async function uploadImageFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectName", `Foto - ${file.name}`);
    formData.append("category", "IMAGE");

    const res = await fetch("/api/project-files", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.data?.id) {
      throw new Error(json.message ?? "Erro ao enviar arquivo de imagem.");
    }
    return `/api/project-files/${json.data.id}`;
  }

  // Ação: Puxar Metadados de Link 3D
  async function handleParse3DLink() {
    if (!importUrl.trim()) return;
    setParsingLink(true);
    setError("");

    try {
      const res = await fetch("/api/project-files/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Não foi possível extrair metadados do link.");
      }
      setLinkMetadata(json.data);
      if (json.data?.coverImageUrl) {
        setImportPhotos([json.data.coverImageUrl]);
      } else {
        setImportPhotos([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao analisar link 3D.");
    } finally {
      setParsingLink(false);
    }
  }

  // Ação: Salvar Importação por Link
  async function handleSaveImportedProject(e: FormEvent) {
    e.preventDefault();
    if (!linkMetadata) return;
    setSavingImport(true);
    setError("");

    try {
      const tags = buildProjectTags({
        cleanTags: linkMetadata.suggestedTags,
        source: linkMetadata.platform,
        externalUrl: linkMetadata.externalUrl,
        photos: importPhotos,
        coverImageUrl: importPhotos[0] ?? undefined,
        extraFiles: importExtraFiles.trim() || undefined,
        author: linkMetadata.author ?? undefined,
        client: importTargetTab === "PROJECTS" ? importClient : undefined,
        marketplace: importTargetTab === "MARKETPLACE" ? importMarketplace : undefined,
        ideaStatus: importTargetTab === "IDEAS" ? "analise" : undefined,
      });

      const payload = {
        projectName: (linkMetadata.title || "Novo Modelo STL").trim().slice(0, 255),
        category: importTargetTab,
        description: linkMetadata.description?.trim() || undefined,
        tags,
        externalUrl: linkMetadata.externalUrl?.trim() || undefined,
        coverImageUrl: importPhotos[0]?.trim() || undefined,
      };

      const res = await fetch("/api/project-files/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Não foi possível cadastrar projeto.");
      }

      setFiles((prev) => [json.data, ...prev]);
      setShowImportModal(false);
      setImportUrl("");
      setLinkMetadata(null);
      setImportPhotos([]);
      setImportExtraFiles("");
      showFeedback(
        `Modelo STL "${linkMetadata.title}" importado com sucesso via ${linkMetadata.platform}!`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar importação.");
    } finally {
      setSavingImport(false);
    }
  }

  // Ação: Salvar Cadastro Manual
  async function handleSaveManualProject(e: FormEvent) {
    e.preventDefault();
    setSavingManual(true);
    setError("");

    try {
      const tags = buildProjectTags({
        cleanTags: manualTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        client: manualCategory === "PROJECTS" ? manualClient : undefined,
        marketplace: manualCategory === "MARKETPLACE" ? manualMarketplace : undefined,
        ideaStatus: manualCategory === "IDEAS" ? manualIdeaStatus : undefined,
        photos: manualPhotos,
        coverImageUrl: manualPhotos[0] ?? undefined,
        extraFiles: manualExtraFiles.trim() || undefined,
        externalUrl: manualExternalUrl,
      });

      let createdProject: ProjectFile;

      if (manualFile) {
        // Envio com upload de arquivo físico
        const formData = new FormData();
        formData.append("file", manualFile);
        formData.append("projectName", manualName.trim());
        formData.append("category", manualCategory);
        if (manualVersion.trim()) formData.append("version", manualVersion.trim());
        if (manualDescription.trim()) formData.append("description", manualDescription.trim());
        formData.append("tags", tags.join(","));
        if (manualJobId) formData.append("productionJobId", manualJobId);
        if (manualExternalUrl.trim()) formData.append("externalUrl", manualExternalUrl.trim());
        if (manualPhotos[0]) formData.append("coverImageUrl", manualPhotos[0]);

        const res = await fetch("/api/project-files", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message ?? "Falha ao enviar arquivo STL de projeto.");
        }
        createdProject = json.data;
      } else {
        // Cadastro catalogado
        const res = await fetch("/api/project-files/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName: manualName.trim().slice(0, 255),
            category: manualCategory,
            version: manualVersion.trim() || undefined,
            description: manualDescription.trim() || undefined,
            tags,
            productionJobId: manualJobId || undefined,
            externalUrl: manualExternalUrl.trim() || undefined,
            coverImageUrl: manualPhotos[0]?.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message ?? "Falha ao cadastrar projeto no catálogo.");
        }
        createdProject = json.data;
      }

      setFiles((prev) => [createdProject, ...prev]);
      setShowManualModal(false);
      resetManualForm();
      showFeedback(`Arquivo STL "${createdProject.projectName}" cadastrado com sucesso!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar projeto.");
    } finally {
      setSavingManual(false);
    }
  }

  function resetManualForm() {
    setManualName("");
    setManualCategory("PROJECTS");
    setManualVersion("");
    setManualClient("");
    setManualMarketplace("");
    setManualIdeaStatus("analise");
    setManualPhotos([]);
    setManualPhotoInput("");
    setManualExternalUrl("");
    setManualDescription("");
    setManualExtraFiles("");
    setManualTags("");
    setManualJobId("");
    setManualFile(null);
  }

  // Abre Modal de Edição com todos os campos pré-carregados
  function openEditModal(file: ProjectFile) {
    const meta = parseProjectTags(file.tags);
    setEditingFile(file);
    setEditName(file.projectName);
    setEditCategory((file.category as ProjectCategory) || "PROJECTS");
    setEditVersion(file.version ?? "");
    setEditClient(meta.client ?? "");
    setEditMarketplace(meta.marketplace ?? "");
    setEditIdeaStatus(meta.ideaStatus ?? "analise");
    setEditExternalUrl(meta.externalUrl ?? "");
    setEditDescription(file.description ?? "");
    setEditExtraFiles(meta.extraFiles ?? "");
    setEditPhotos(meta.photos);
    setEditPhotoInput("");
    setEditTags(meta.cleanTags.join(", "));
    setEditJobId(file.productionJob?.id ?? "");
  }

  // Ação: Salvar Edição Completa do Projeto
  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingFile) return;
    setSavingEdit(true);

    try {
      const meta = parseProjectTags(editingFile.tags);
      const tags = buildProjectTags({
        cleanTags: editTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        client: editCategory === "PROJECTS" ? editClient : undefined,
        marketplace: editCategory === "MARKETPLACE" ? editMarketplace : undefined,
        ideaStatus: editCategory === "IDEAS" ? editIdeaStatus : undefined,
        source: meta.source,
        externalUrl: editExternalUrl.trim() || undefined,
        photos: editPhotos,
        coverImageUrl: editPhotos[0] || undefined,
        extraFiles: editExtraFiles.trim() || undefined,
        author: meta.author,
      });

      const res = await fetch(`/api/project-files/${editingFile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: editName.trim().slice(0, 255),
          category: editCategory,
          version: editVersion.trim() || undefined,
          description: editDescription.trim() || undefined,
          tags,
          productionJobId: editJobId || undefined,
          externalUrl: editExternalUrl.trim() || undefined,
          coverImageUrl: editPhotos[0]?.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Não foi possível atualizar o projeto.");
      }

      setFiles((prev) => prev.map((item) => (item.id === editingFile.id ? json.data : item)));
      setEditingFile(null);
      showFeedback(`Projeto "${json.data.projectName}" atualizado com sucesso!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setSavingEdit(false);
    }
  }

  // Ação: Mover/Promover Ideia
  async function handlePromoteIdea(file: ProjectFile, targetCategory: "PROJECTS" | "MARKETPLACE") {
    try {
      const meta = parseProjectTags(file.tags);
      const tags = buildProjectTags({
        ...meta,
        ideaStatus: "aprovado",
      });

      const res = await fetch(`/api/project-files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: targetCategory,
          tags,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erro ao promover ideia.");

      setFiles((prev) => prev.map((item) => (item.id === file.id ? json.data : item)));
      showFeedback(
        `Ideia "${file.projectName}" promovida para ${
          targetCategory === "PROJECTS" ? "Projetos" : "Marketplace"
        }!`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao promover.");
    }
  }

  // Ação: Excluir Projeto
  async function handleDeleteProject(file: ProjectFile) {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir o projeto "${file.projectName}"? Esta ação removerá o arquivo físico permanentemente.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/project-files/${file.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erro ao excluir arquivo.");

      setFiles((prev) => prev.filter((item) => item.id !== file.id));
      if (detailsFile?.file.id === file.id) setDetailsFile(null);
      if (editingFile?.id === file.id) setEditingFile(null);
      showFeedback(`Projeto "${file.projectName}" excluído com sucesso!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Mission Control com Ícone de Pasta STL */}
      <header className="rounded-3xl border border-slate-800 bg-gradient-to-r from-[#070c16] via-[#0b1220] to-[#101827] p-6 shadow-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/20">
                <STLFolderIcon className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Arquivos STL
                </h1>
                <p className="mt-0.5 text-xs text-slate-400">
                  Gerenciamento centralizado de modelos 3D, projetos personalizados, catálogo para
                  marketplace e validação de ideias.
                </p>
              </div>
            </div>
          </div>

          {/* Botões de Ação para Moderadores e Administradores */}
          {canManage ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setImportTargetTab(
                    activeTab === "all" ? "IDEAS" : (activeTab.toUpperCase() as ProjectCategory),
                  );
                  setShowImportModal(true);
                }}
                className="group flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-4 py-2.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-900/40 hover:text-white shadow-lg shadow-cyan-950/20"
              >
                <span className="text-sm transition-transform group-hover:scale-125">⚡</span>
                Importar via Link 3D
              </button>

              <button
                type="button"
                onClick={() => {
                  setManualCategory(
                    activeTab === "all" ? "PROJECTS" : (activeTab.toUpperCase() as ProjectCategory),
                  );
                  setShowManualModal(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-lg shadow-emerald-950/20"
              >
                <span>+</span>
                Novo Arquivo STL
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">
                Modo Consulta ({currentUserRole}):
              </span>{" "}
              Visualização e download de arquivos STL habilitados.
            </div>
          )}
        </div>

        {/* Indicadores / Estatísticas Rápidas */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-slate-800/80">
          <div className="rounded-2xl border border-slate-800/80 bg-[#070c16]/80 p-3.5 transition hover:border-slate-700">
            <span className="text-[11px] font-semibold text-slate-400">
              📁 Total de Arquivos STL
            </span>
            <p className="mt-1 text-lg font-bold text-white">{tabCounts.all}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-[#070c16]/80 p-3.5 transition hover:border-emerald-500/40">
            <span className="text-[11px] font-semibold text-emerald-400">👤 Personalizados</span>
            <p className="mt-1 text-lg font-bold text-emerald-300">{tabCounts.projects}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-[#070c16]/80 p-3.5 transition hover:border-cyan-500/40">
            <span className="text-[11px] font-semibold text-cyan-400">🛒 Marketplace</span>
            <p className="mt-1 text-lg font-bold text-cyan-300">{tabCounts.marketplace}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-[#070c16]/80 p-3.5 transition hover:border-amber-500/40">
            <span className="text-[11px] font-semibold text-amber-400">💡 Ideias em Validação</span>
            <p className="mt-1 text-lg font-bold text-amber-300">{tabCounts.ideas}</p>
          </div>
        </div>
      </header>

      {/* Alertas de Notificação */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-900/80 bg-rose-950/60 p-4 text-xs font-semibold text-rose-200 shadow-xl animate-in fade-in">
          <span>⚠ {error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-200 shadow-xl animate-in fade-in">
          <span>✓ {successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de Status da Categoria Ativa (Navegação via Menu Lateral) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">
            {activeTab === "all"
              ? "📁 Todos os Arquivos STL"
              : activeTab === "projects"
              ? "🧊 Projetos 3D"
              : activeTab === "marketplace"
              ? "🛒 Catálogo Marketplace"
              : "💡 Ideias & Modelos"}
          </span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
            {tabCounts[activeTab]} {tabCounts[activeTab] === 1 ? "arquivo" : "arquivos"}
          </span>
        </div>

        {/* Alternador de Visualização (Cards vs Tabela) */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            title="Visualização em Grade de Cards 3D"
            className={`rounded-xl border p-2 text-xs font-bold transition ${
              viewMode === "grid"
                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                : "border-slate-800 bg-[#0b1220] text-slate-400 hover:text-white"
            }`}
          >
            ▦ Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            title="Visualização em Lista Técnica"
            className={`rounded-xl border p-2 text-xs font-bold transition ${
              viewMode === "list"
                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                : "border-slate-800 bg-[#0b1220] text-slate-400 hover:text-white"
            }`}
          >
            ☰ Lista
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca Rápida */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#101827] p-3.5 shadow-xl">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <span className="text-slate-500 text-sm">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, cliente, marketplace, tag, autor ou arquivos extras..."
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#070c16] px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-emerald-500"
          >
            <option value="all">Todos os Formatos</option>
            <option value="stl">STL</option>
            <option value="3mf">3MF</option>
            <option value="step">STEP / STP</option>
            <option value="url">Atalhos / Links Web</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "name" | "size")}
            className="rounded-xl border border-slate-700 bg-[#070c16] px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-emerald-500"
          >
            <option value="newest">Mais Recentes</option>
            <option value="oldest">Mais Antigos</option>
            <option value="name">Nome (A - Z)</option>
            <option value="size">Maior Tamanho</option>
          </select>
        </div>
      </section>

      {/* Conteúdo: Listagem ou Grade de Cards */}
      {loading ? (
        <div className="grid place-items-center rounded-3xl border border-slate-800 bg-[#101827] p-16 text-center shadow-xl">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-xs text-slate-400">Carregando arquivos STL e modelos 3D...</p>
        </div>
      ) : visibleFiles.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-[#101827] p-12 text-center shadow-xl">
          <span className="text-4xl">📁</span>
          <h3 className="mt-3 text-sm font-bold text-white">Nenhum arquivo STL encontrado</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            {query || formatFilter !== "all"
              ? "Tente alterar os termos da busca ou os filtros aplicados."
              : activeTab === "projects"
                ? "Ainda não há modelos personalizados cadastrados para clientes."
                : activeTab === "marketplace"
                  ? "Ainda não há produtos cadastrados para venda em marketplace."
                  : activeTab === "ideas"
                    ? "Ainda não há ideias ou protótipos em fase de validação."
                    : "Comece cadastrando seu primeiro arquivo STL ou importando via link de plataformas 3D."}
          </p>

          {canManage && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setImportTargetTab(
                    activeTab === "all" ? "IDEAS" : (activeTab.toUpperCase() as ProjectCategory),
                  );
                  setShowImportModal(true);
                }}
                className="rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-4 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-900/40 hover:text-white"
              >
                ⚡ Importar via Link 3D
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualCategory(
                    activeTab === "all" ? "PROJECTS" : (activeTab.toUpperCase() as ProjectCategory),
                  );
                  setShowManualModal(true);
                }}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                + Cadastrar Arquivo STL
              </button>
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* VISUALIZAÇÃO EM GRADE DE CARDS INTERATIVOS */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleFiles.map(({ file, meta, tabGroup }) => {
            const ext = getFileExtension(file.originalName);

            return (
              <div
                key={file.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-[#101827] shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl hover:shadow-emerald-950/10"
              >
                {/* Imagem de Capa ou Thumbnail Mesh 3D com Acesso à Galeria de Fotos */}
                <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-[#070c16] to-[#0b1220]">
                  {meta.coverImageUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setGalleryPhotos(meta.photos);
                        setGalleryIndex(0);
                      }}
                      className="h-full w-full cursor-zoom-in"
                      title="Clique para ampliar a foto do modelo"
                    >
                      {/* biome-ignore lint/performance/noImgElement: Imagem dinâmica do projeto STL */}
                      <img
                        src={meta.coverImageUrl}
                        alt={file.projectName}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </button>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                      <span className="text-4xl text-emerald-400/80 transition-transform duration-300 group-hover:scale-110">
                        {ext === "STL"
                          ? "📐"
                          : ext === "3MF"
                            ? "🧊"
                            : ext === "STEP" || ext === "STP"
                              ? "⚙️"
                              : ext === "ZIP"
                                ? "🗜️"
                                : "📁"}
                      </span>
                      <span className="mt-2 font-mono text-[11px] font-bold tracking-widest text-slate-500">
                        .{ext}
                      </span>
                    </div>
                  )}

                  {/* Badges superiores na Capa */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
                    {tabGroup === "projects" && (
                      <span className="rounded-lg border border-emerald-500/30 bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 backdrop-blur-md">
                        👤 Personalizado
                      </span>
                    )}
                    {tabGroup === "marketplace" && (
                      <span className="rounded-lg border border-cyan-500/30 bg-cyan-950/80 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 backdrop-blur-md">
                        🛒 Marketplace
                      </span>
                    )}
                    {tabGroup === "ideas" && (
                      <span className="rounded-lg border border-amber-500/30 bg-amber-950/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md">
                        💡 Ideia
                      </span>
                    )}
                  </div>

                  {/* Contador de Fotos */}
                  {meta.photos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setGalleryPhotos(meta.photos);
                        setGalleryIndex(0);
                      }}
                      className="absolute top-3 right-3 rounded-lg border border-slate-700 bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md transition hover:bg-black"
                    >
                      📷 {meta.photos.length} fotos
                    </button>
                  )}

                  {/* Badge de Plataforma de Origem */}
                  {meta.source && meta.photos.length <= 1 && (
                    <div className="absolute top-3 right-3 pointer-events-none">
                      <span className="rounded-lg border border-slate-700 bg-slate-900/90 px-2 py-0.5 text-[10px] font-bold text-slate-200 backdrop-blur-md">
                        {meta.source}
                      </span>
                    </div>
                  )}

                  {/* Extensão e Tamanho na barra inferior da capa */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 font-mono text-[10px] text-slate-300 backdrop-blur-sm pointer-events-none">
                    <span>{ext}</span>
                    <span>•</span>
                    <span>{formatSize(file.sizeBytes)}</span>
                  </div>
                </div>

                {/* Conteúdo Principal do Card */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    {/* Título e Versão */}
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="font-bold text-sm text-white line-clamp-1 transition group-hover:text-emerald-400"
                        title={file.projectName}
                      >
                        {file.projectName}
                      </h3>
                      {file.version && (
                        <span className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 shrink-0">
                          {file.version}
                        </span>
                      )}
                    </div>

                    {/* Detalhe Específico da Categoria */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      {meta.client && (
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/20">
                          Cliente: {meta.client}
                        </span>
                      )}
                      {meta.marketplace && (
                        <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-500/20">
                          Canal: {meta.marketplace}
                        </span>
                      )}
                      {meta.ideaStatus && (
                        <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/20">
                          {meta.ideaStatus === "analise"
                            ? "🔵 Em Análise"
                            : meta.ideaStatus === "testando"
                              ? "🟡 Testando Impressão"
                              : meta.ideaStatus === "validado"
                                ? "🟢 Validado"
                                : "⭐ Aprovado"}
                        </span>
                      )}
                    </div>

                    {/* Arquivos Extras ou Explicações de Montagem / Hardware */}
                    {meta.extraFiles && (
                      <div className="mt-2.5 rounded-xl border border-amber-500/20 bg-amber-950/20 p-2 text-[11px] text-amber-200">
                        <span className="font-bold text-amber-400">🧩 Extras & Montagem: </span>
                        <span className="line-clamp-2">{meta.extraFiles}</span>
                      </div>
                    )}

                    {/* Descrição curta com botão de expansão */}
                    {file.description && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-400 line-clamp-2" title={file.description}>
                          {file.description}
                        </p>
                        {file.description.length > 80 && (
                          <button
                            type="button"
                            onClick={() => setDetailsFile({ file, meta })}
                            className="text-[11px] font-bold text-emerald-400 hover:underline mt-0.5"
                          >
                            Ver descrição completa...
                          </button>
                        )}
                      </div>
                    )}

                    {/* Tags */}
                    {meta.cleanTags.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {meta.cleanTags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Vínculo com Ordem de Produção */}
                    {file.productionJob && (
                      <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#070c16] px-2.5 py-1 text-[11px] text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="truncate">{file.productionJob.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Barra de Ações do Card */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <div className="flex items-center gap-1.5">
                      {/* Botão Baixar ou Acessar Link */}
                      {meta.externalUrl ? (
                        <a
                          href={meta.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-900/30 hover:text-white"
                          title="Abrir página oficial do projeto"
                        >
                          <span>🔗</span> Acessar
                        </a>
                      ) : (
                        <a
                          href={`/api/project-files/${file.id}`}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-white"
                          title="Baixar arquivo STL / 3MF"
                        >
                          <span>⬇</span> Baixar
                        </a>
                      )}

                      {/* Promoção de Ideias */}
                      {canManage && tabGroup === "ideas" && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handlePromoteIdea(file, "PROJECTS")}
                            title="Promover para Projetos Personalizados"
                            className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-1.5 text-xs text-emerald-300 hover:bg-emerald-900/30"
                          >
                            👤
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromoteIdea(file, "MARKETPLACE")}
                            title="Promover para Marketplace"
                            className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-1.5 text-xs text-cyan-300 hover:bg-cyan-900/30"
                          >
                            🛒
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Ações de Gestão (Editar / Excluir) */}
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(file)}
                          title="Editar projeto STL"
                          className="rounded-lg p-1.5 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(file)}
                          title="Excluir projeto"
                          className="rounded-lg p-1.5 text-xs text-slate-400 transition hover:bg-rose-950 hover:text-rose-400"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM LISTA TÉCNICA */
        <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-[#101827] shadow-xl">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead className="border-b border-slate-800 bg-[#070c16] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Modelo STL</th>
                <th className="px-5 py-3.5">Aba / Categoria</th>
                <th className="px-5 py-3.5">Origem / Cliente</th>
                <th className="px-5 py-3.5">Arquivo & Formato</th>
                <th className="px-5 py-3.5">Tamanho</th>
                <th className="px-5 py-3.5">Ordem de Produção</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {visibleFiles.map(({ file, meta, tabGroup }) => {
                const ext = getFileExtension(file.originalName);

                return (
                  <tr key={file.id} className="transition hover:bg-slate-800/40">
                    <td className="px-5 py-4 font-semibold text-white">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">
                          {ext === "STL"
                            ? "📐"
                            : ext === "3MF"
                              ? "🧊"
                              : ext === "URL"
                                ? "🔗"
                                : "📁"}
                        </span>
                        <div>
                          <p className="line-clamp-1">{file.projectName}</p>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {file.version ? `Versão ${file.version} • ` : ""}
                            {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {tabGroup === "projects" && (
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          👤 Projetos
                        </span>
                      )}
                      {tabGroup === "marketplace" && (
                        <span className="rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                          🛒 Marketplace
                        </span>
                      )}
                      {tabGroup === "ideas" && (
                        <span className="rounded-md border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          💡 Ideias
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {meta.client ? (
                        <span className="font-semibold text-emerald-400">{meta.client}</span>
                      ) : meta.marketplace ? (
                        <span className="font-semibold text-cyan-400">{meta.marketplace}</span>
                      ) : meta.source ? (
                        <span className="text-slate-400">{meta.source}</span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-400 font-mono">{file.originalName}</td>

                    <td className="px-5 py-4 text-slate-300 font-mono">
                      {formatSize(file.sizeBytes)}
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {file.productionJob ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {file.productionJob.name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {meta.photos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setGalleryPhotos(meta.photos);
                              setGalleryIndex(0);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                            title="Ver fotos do projeto"
                          >
                            📷
                          </button>
                        )}

                        {meta.externalUrl ? (
                          <a
                            href={meta.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:text-white"
                          >
                            🔗 Acessar
                          </a>
                        ) : (
                          <a
                            href={`/api/project-files/${file.id}`}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-500 hover:text-white"
                          >
                            ⬇ Baixar
                          </a>
                        )}

                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(file)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(file)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950 hover:text-rose-400"
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= MODAL: GALERIA DE FOTOS / LIGHTBOX ================= */}
      {galleryPhotos && galleryPhotos.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in">
          <div className="relative flex max-h-[95vh] max-w-4xl flex-col items-center justify-center">
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={() => setGalleryPhotos(null)}
              className="absolute -top-10 right-0 rounded-full bg-slate-800 p-2 text-white hover:bg-slate-700 text-sm font-bold"
            >
              ✕ Fechar
            </button>

            {/* Imagem Principal */}
            <div className="relative max-h-[75vh] overflow-hidden rounded-2xl border border-slate-800 bg-[#070c16] shadow-2xl">
              {/* biome-ignore lint/performance/noImgElement: Imagem ampliada da galeria */}
              <img
                src={galleryPhotos[galleryIndex]}
                alt={`Foto ${galleryIndex + 1}`}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            {/* Navegação Próxima / Anterior */}
            {galleryPhotos.length > 1 && (
              <div className="mt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setGalleryIndex(
                      (galleryIndex - 1 + galleryPhotos.length) % galleryPhotos.length,
                    )
                  }
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
                >
                  ← Anterior
                </button>
                <span className="text-xs text-slate-400">
                  {galleryIndex + 1} de {galleryPhotos.length}
                </span>
                <button
                  type="button"
                  onClick={() => setGalleryIndex((galleryIndex + 1) % galleryPhotos.length)}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
                >
                  Próxima →
                </button>
              </div>
            )}

            {/* Miniaturas */}
            {galleryPhotos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto max-w-full pb-2">
                {galleryPhotos.map((photoUrl, idx) => (
                  <button
                    key={photoUrl}
                    type="button"
                    onClick={() => setGalleryIndex(idx)}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      galleryIndex === idx
                        ? "border-emerald-400 scale-105"
                        : "border-slate-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    {/* biome-ignore lint/performance/noImgElement: Miniatura da galeria */}
                    <img
                      src={photoUrl}
                      alt={`Miniatura ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: DETALHES & DESCRIÇÃO COMPLETA ================= */}
      {detailsFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">{detailsFile.file.projectName}</h3>
                <span className="text-xs text-slate-400">
                  {detailsFile.file.version ? `Versão ${detailsFile.file.version} • ` : ""}
                  {detailsFile.file.originalName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailsFile(null)}
                className="text-slate-400 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {detailsFile.meta.extraFiles && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                  <h4 className="font-bold text-amber-400 text-sm">
                    🧩 Arquivos Extras & Instruções de Montagem:
                  </h4>
                  <p className="mt-1 text-slate-200 whitespace-pre-wrap">
                    {detailsFile.meta.extraFiles}
                  </p>
                </div>
              )}

              {detailsFile.file.description && (
                <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
                  <h4 className="font-bold text-emerald-400 text-sm">
                    📝 Descrição & Parâmetros de Impressão:
                  </h4>
                  <p className="mt-1.5 text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {detailsFile.file.description}
                  </p>
                </div>
              )}

              {detailsFile.meta.externalUrl && (
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#070c16] p-3">
                  <span className="text-slate-400">Link Original:</span>
                  <a
                    href={detailsFile.meta.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-cyan-400 hover:underline"
                  >
                    Abrir na plataforma 3D →
                  </a>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDetailsFile(null)}
                  className="rounded-xl border border-slate-700 px-5 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: IMPORTADOR VIA LINK 3D ================= */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-base font-bold text-white">
                  Importar via Link de Plataformas 3D
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportUrl("");
                  setLinkMetadata(null);
                }}
                className="text-slate-400 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Cole o link do modelo no <strong>MakerWorld</strong>, <strong>Printables</strong>,{" "}
              <strong>Thingiverse</strong>, <strong>Cults3D</strong> ou <strong>Thangs</strong>. O
              CTRL-Farm puxará título, capa, autor e descrição automaticamente!
            </p>

            <div className="mt-4 flex gap-2">
              <input
                type="url"
                required
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Ex.: https://makerworld.com/en/models/123456"
                className="h-11 flex-1 rounded-xl border border-slate-700 bg-[#070c16] px-3.5 text-xs text-white outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                disabled={parsingLink || !importUrl.trim()}
                onClick={handleParse3DLink}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
              >
                {parsingLink ? "Analisando..." : "🔍 Puxar Dados"}
              </button>
            </div>

            {/* Pré-visualização dos Metadados Extraídos */}
            {linkMetadata && (
              <form
                onSubmit={handleSaveImportedProject}
                className="mt-5 space-y-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 p-4"
              >
                <div className="flex gap-4">
                  {importPhotos[0] ? (
                    // biome-ignore lint/performance/noImgElement: Imagem de prévia extraída
                    <img
                      src={importPhotos[0]}
                      alt={linkMetadata.title}
                      className="h-24 w-24 rounded-xl border border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-xl bg-slate-900 border border-slate-800 text-2xl">
                      📐
                    </div>
                  )}

                  <div className="flex-1">
                    <span className="rounded-md border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                      {linkMetadata.platform}
                    </span>
                    <input
                      required
                      value={linkMetadata.title}
                      onChange={(e) =>
                        setLinkMetadata({
                          ...linkMetadata,
                          title: e.target.value,
                        })
                      }
                      className="mt-1 h-8 w-full rounded-lg border border-slate-700 bg-[#070c16] px-2 text-xs font-bold text-white outline-none focus:border-cyan-400"
                    />
                    {linkMetadata.author && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Autor: {linkMetadata.author}
                      </p>
                    )}
                  </div>
                </div>

                {/* Gestão de Fotos do Projeto Importado */}
                <div className="rounded-xl border border-slate-800 bg-[#070c16] p-3 space-y-2">
                  <label className="text-xs font-bold text-slate-300">
                    Fotos do Modelo (Enviadas ou por Link)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={importPhotoInput}
                      onChange={(e) => setImportPhotoInput(e.target.value)}
                      placeholder="Adicionar URL de outra foto..."
                      className="h-8 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          importPhotoInput.trim() &&
                          !importPhotos.includes(importPhotoInput.trim())
                        ) {
                          setImportPhotos([...importPhotos, importPhotoInput.trim()]);
                          setImportPhotoInput("");
                        }
                      }}
                      className="rounded-lg bg-slate-800 px-2.5 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      + Link
                    </button>
                  </div>

                  {/* Prévia das fotos */}
                  {importPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {importPhotos.map((photo, pIdx) => (
                        <div key={photo} className="relative group">
                          {/* biome-ignore lint/performance/noImgElement: Prévia de fotos importadas */}
                          <img
                            src={photo}
                            alt="Foto"
                            className="h-12 w-12 rounded-lg border border-slate-700 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setImportPhotos(importPhotos.filter((_, idx) => idx !== pIdx))
                            }
                            className="absolute -top-1 -right-1 rounded-full bg-rose-600 h-4 w-4 text-[10px] text-white flex items-center justify-center shadow"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seleção da Aba de Destino */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Aba de Destino *
                    <select
                      value={importTargetTab}
                      onChange={(e) => setImportTargetTab(e.target.value as ProjectCategory)}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-2.5 text-xs text-white outline-none focus:border-cyan-400"
                    >
                      <option value="IDEAS">💡 Ideias (Validação)</option>
                      <option value="PROJECTS">👤 Projetos (Personalizados)</option>
                      <option value="MARKETPLACE">🛒 Marketplace</option>
                    </select>
                  </label>

                  {importTargetTab === "PROJECTS" ? (
                    <label className="text-xs font-semibold text-slate-300">
                      Nome do Cliente *
                      <input
                        required
                        value={importClient}
                        onChange={(e) => setImportClient(e.target.value)}
                        placeholder="Ex.: Studio Criativo"
                        className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-2.5 text-xs text-white outline-none focus:border-cyan-400"
                      />
                    </label>
                  ) : importTargetTab === "MARKETPLACE" ? (
                    <label className="text-xs font-semibold text-slate-300">
                      Canal do Marketplace *
                      <input
                        required
                        value={importMarketplace}
                        onChange={(e) => setImportMarketplace(e.target.value)}
                        placeholder="Ex.: Shopee / Mercado Livre"
                        className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-2.5 text-xs text-white outline-none focus:border-cyan-400"
                      />
                    </label>
                  ) : (
                    <div className="text-[11px] text-amber-300/80 flex items-center pt-5">
                      ✓ Salvo no banco de ideias para testes de impressão.
                    </div>
                  )}
                </div>

                {/* Descrição Completa Extraída / Editável */}
                <label className="block text-xs font-semibold text-slate-300">
                  Descrição Completa & Parâmetros (Extraída da Plataforma / IA - Sem limite)
                  <textarea
                    rows={4}
                    value={linkMetadata.description ?? ""}
                    onChange={(e) =>
                      setLinkMetadata({
                        ...linkMetadata,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descrição detalhada do projeto, notas de impressão, materiais..."
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-[#070c16] p-2.5 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </label>

                {/* Arquivos Extras ou Explicações de Montagem */}
                <label className="block text-xs font-semibold text-slate-300">
                  Arquivos Extras ou Explicações de Montagem (Hardware, Parafusos, etc.)
                  <textarea
                    rows={2}
                    value={importExtraFiles}
                    onChange={(e) => setImportExtraFiles(e.target.value)}
                    placeholder="Ex.: Necessita 4x parafusos M3x12mm e ímã 6x2mm. Contém 3 arquivos STL no projeto."
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-[#070c16] p-2.5 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setLinkMetadata(null)}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={savingImport}
                    className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {savingImport ? "Salvando..." : "✓ Salvar no CTRL-Farm"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CADASTRO MANUAL ================= */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📁</span>
                <h3 className="text-base font-bold text-white">Cadastrar Novo Arquivo STL</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualProject} className="mt-4 space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="font-semibold text-slate-300">
                  Nome do Projeto *
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Ex.: Suporte Articulado para Câmera"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <label className="font-semibold text-slate-300">
                  Aba / Categoria de Destino *
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as ProjectCategory)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  >
                    <option value="PROJECTS">👤 Projetos (Personalizados / Cliente)</option>
                    <option value="MARKETPLACE">🛒 Marketplace</option>
                    <option value="IDEAS">💡 Ideias (Validação)</option>
                    <option value="MODEL">Outro Modelo Geral</option>
                  </select>
                </label>
              </div>

              {/* Campos condicionais por categoria */}
              {manualCategory === "PROJECTS" && (
                <label className="block font-semibold text-slate-300">
                  Cliente Específico *
                  <input
                    required
                    value={manualClient}
                    onChange={(e) => setManualClient(e.target.value)}
                    placeholder="Nome do cliente ou empresa que encomendou"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>
              )}

              {manualCategory === "MARKETPLACE" && (
                <label className="block font-semibold text-slate-300">
                  Canal / Marketplace *
                  <input
                    required
                    value={manualMarketplace}
                    onChange={(e) => setManualMarketplace(e.target.value)}
                    placeholder="Ex.: Shopee, Mercado Livre, Loja Virtual"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>
              )}

              {manualCategory === "IDEAS" && (
                <label className="block font-semibold text-slate-300">
                  Status de Validação da Ideia *
                  <select
                    value={manualIdeaStatus}
                    onChange={(e) =>
                      setManualIdeaStatus(
                        e.target.value as "analise" | "testando" | "validado" | "aprovado",
                      )
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-amber-400"
                  >
                    <option value="analise">🔵 Em Análise</option>
                    <option value="testando">🟡 Testando Impressão</option>
                    <option value="validado">🟢 Validado / Viável</option>
                    <option value="aprovado">⭐ Aprovado</option>
                  </select>
                </label>
              )}

              {/* Upload de Arquivo Físico & Versão */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="font-semibold text-slate-300">
                  Arquivo Físico (STL, 3MF, STEP, OBJ, ZIP)
                  <input
                    type="file"
                    accept=".stl,.3mf,.obj,.step,.stp,.scad,.blend,.amf,.zip,.pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setManualFile(e.target.files?.[0] ?? null)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 py-1 text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-xs file:text-white"
                  />
                  <span className="text-[10px] text-slate-500">
                    Opcional caso esteja cadastrando por link de referência.
                  </span>
                </label>

                <label className="font-semibold text-slate-300">
                  Versão
                  <input
                    value={manualVersion}
                    onChange={(e) => setManualVersion(e.target.value)}
                    placeholder="Ex.: v1.0 ou Final"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>
              </div>

              {/* Seção de Fotos (Upload ou Link) */}
              <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">
                    Fotos do Modelo (Enviadas ou por Link)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {manualPhotos.length} foto(s) anexada(s)
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    type="url"
                    value={manualPhotoInput}
                    onChange={(e) => setManualPhotoInput(e.target.value)}
                    placeholder="Colar URL de foto externa..."
                    className="h-9 flex-1 min-w-[200px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        manualPhotoInput.trim() &&
                        !manualPhotos.includes(manualPhotoInput.trim())
                      ) {
                        setManualPhotos([...manualPhotos, manualPhotoInput.trim()]);
                        setManualPhotoInput("");
                      }
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    + Adicionar Link
                  </button>

                  <label className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 cursor-pointer hover:bg-emerald-900/40">
                    <span>📁</span>
                    <span>{uploadingManualPhoto ? "Enviando foto..." : "Enviar Foto do PC"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingManualPhoto}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setUploadingManualPhoto(true);
                          try {
                            const url = await uploadImageFile(f);
                            setManualPhotos((prev) => [...prev, url]);
                            showFeedback("Foto enviada com sucesso!");
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Erro ao enviar foto.");
                          } finally {
                            setUploadingManualPhoto(false);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Pré-visualização da lista de fotos */}
                {manualPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {manualPhotos.map((photo, pIdx) => (
                      <div key={photo} className="relative group">
                        {/* biome-ignore lint/performance/noImgElement: Prévia de foto do modelo */}
                        <img
                          src={photo}
                          alt="Foto"
                          className="h-16 w-16 rounded-xl border border-slate-700 object-cover"
                        />
                        {pIdx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-[9px] text-center font-bold text-white rounded-b-xl">
                            Capa
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setManualPhotos(manualPhotos.filter((_, idx) => idx !== pIdx))
                          }
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-600 h-5 w-5 text-xs text-white flex items-center justify-center shadow-lg hover:bg-rose-500"
                          title="Remover foto"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Link do Projeto & Ordem de Produção */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="font-semibold text-slate-300">
                  Link Original do Projeto (Opcional)
                  <input
                    type="url"
                    value={manualExternalUrl}
                    onChange={(e) => setManualExternalUrl(e.target.value)}
                    placeholder="https://makerworld.com/... ou printables.com"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <label className="font-semibold text-slate-300">
                  Vincular a Ordem de Produção (Opcional)
                  <select
                    value={manualJobId}
                    onChange={(e) => setManualJobId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  >
                    <option value="">Sem vínculo</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.name} ({job.status})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Arquivos Extras e Explicações de Montagem */}
              <label className="block font-semibold text-slate-300">
                Arquivos Extras que Contém no Projeto ou Explicações de Montagem
                <textarea
                  rows={2}
                  value={manualExtraFiles}
                  onChange={(e) => setManualExtraFiles(e.target.value)}
                  placeholder="Ex.: Contém 4 parafusos M3x12mm, 2 rolamentos 608zz, 1 pino de trava. Montar com encaixe sob pressão."
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#070c16] p-3 text-white outline-none focus:border-emerald-400"
                />
              </label>

              {/* Descrição Completa */}
              <label className="block font-semibold text-slate-300">
                Descrição Completa & Parâmetros de Impressão (Sem limite de caracteres)
                <textarea
                  rows={4}
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Ex.: Parâmetros: 3 paredes, 15% preenchimento gyroid, bico 0.4mm, 0.20mm de altura de camada. Suporte em árvore recomendado (sem limite de caracteres)..."
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#070c16] p-3 text-white outline-none focus:border-emerald-400"
                />
              </label>

              {/* Tags */}
              <label className="block font-semibold text-slate-300">
                Tags (Separadas por vírgula)
                <input
                  value={manualTags}
                  onChange={(e) => setManualTags(e.target.value)}
                  placeholder="pla, decoracao, suporte, articulado"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingManual || uploadingManualPhoto}
                  className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {savingManual ? "Salvando..." : "Salvar Arquivo STL"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIÇÃO COMPLETA (MESMO PARA IMPORTADOS) ================= */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Arquivo STL / Projeto</h3>
                  <span className="text-xs text-slate-400">
                    Edite livremente todas as informações, fotos e arquivos extras.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingFile(null)}
                className="text-slate-400 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="font-semibold text-slate-300">
                  Nome do Projeto *
                  <input
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <label className="font-semibold text-slate-300">
                  Aba / Categoria *
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ProjectCategory)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  >
                    <option value="PROJECTS">👤 Projetos (Personalizados)</option>
                    <option value="MARKETPLACE">🛒 Marketplace</option>
                    <option value="IDEAS">💡 Ideias (Validação)</option>
                    <option value="MODEL">Outro Modelo Geral</option>
                  </select>
                </label>
              </div>

              {/* Campos condicionais da categoria */}
              {editCategory === "PROJECTS" && (
                <label className="block font-semibold text-slate-300">
                  Cliente Específico *
                  <input
                    required
                    value={editClient}
                    onChange={(e) => setEditClient(e.target.value)}
                    placeholder="Nome do cliente"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>
              )}

              {editCategory === "MARKETPLACE" && (
                <label className="block font-semibold text-slate-300">
                  Canal do Marketplace *
                  <input
                    required
                    value={editMarketplace}
                    onChange={(e) => setEditMarketplace(e.target.value)}
                    placeholder="Ex.: Shopee, Mercado Livre"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                  />
                </label>
              )}

              {editCategory === "IDEAS" && (
                <label className="block font-semibold text-slate-300">
                  Status da Ideia *
                  <select
                    value={editIdeaStatus}
                    onChange={(e) =>
                      setEditIdeaStatus(
                        e.target.value as "analise" | "testando" | "validado" | "aprovado",
                      )
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-amber-400"
                  >
                    <option value="analise">🔵 Em Análise</option>
                    <option value="testando">🟡 Testando Impressão</option>
                    <option value="validado">🟢 Validado</option>
                    <option value="aprovado">⭐ Aprovado</option>
                  </select>
                </label>
              )}

              {/* Gestão de Fotos na Edição (Upload ou Link) */}
              <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">
                    Fotos do Modelo (Enviadas ou por Link)
                  </span>
                  <span className="text-[11px] text-slate-400">{editPhotos.length} foto(s)</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    type="url"
                    value={editPhotoInput}
                    onChange={(e) => setEditPhotoInput(e.target.value)}
                    placeholder="Colar URL de nova foto..."
                    className="h-9 flex-1 min-w-[200px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editPhotoInput.trim() && !editPhotos.includes(editPhotoInput.trim())) {
                        setEditPhotos([...editPhotos, editPhotoInput.trim()]);
                        setEditPhotoInput("");
                      }
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    + Adicionar Link
                  </button>

                  <label className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 cursor-pointer hover:bg-emerald-900/40">
                    <span>📁</span>
                    <span>{uploadingEditPhoto ? "Enviando..." : "Enviar Foto do PC"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingEditPhoto}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setUploadingEditPhoto(true);
                          try {
                            const url = await uploadImageFile(f);
                            setEditPhotos((prev) => [...prev, url]);
                            showFeedback("Foto enviada com sucesso!");
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Erro ao enviar foto.");
                          } finally {
                            setUploadingEditPhoto(false);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Lista de Fotos com Remoção e Ordenação de Capa */}
                {editPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {editPhotos.map((photo, pIdx) => (
                      <div key={photo} className="relative group">
                        {/* biome-ignore lint/performance/noImgElement: Prévia de foto na edição */}
                        <img
                          src={photo}
                          alt="Foto"
                          className="h-16 w-16 rounded-xl border border-slate-700 object-cover"
                        />
                        {pIdx === 0 ? (
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-[9px] text-center font-bold text-white rounded-b-xl">
                            Capa
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              // Torna esta foto a capa
                              const newArr = [photo, ...editPhotos.filter((p) => p !== photo)];
                              setEditPhotos(newArr);
                            }}
                            className="absolute bottom-0 inset-x-0 bg-black/80 hover:bg-emerald-600 text-[8px] text-center font-bold text-slate-300 hover:text-white rounded-b-xl py-0.5"
                          >
                            Definir Capa
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditPhotos(editPhotos.filter((_, idx) => idx !== pIdx))}
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-600 h-5 w-5 text-xs text-white flex items-center justify-center shadow hover:bg-rose-500"
                          title="Remover foto"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Link do Projeto & Versão */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="font-semibold text-slate-300">
                  Link do Projeto (MakerWorld, Printables, etc.)
                  <input
                    type="url"
                    value={editExternalUrl}
                    onChange={(e) => setEditExternalUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <label className="font-semibold text-slate-300">
                  Versão
                  <input
                    value={editVersion}
                    onChange={(e) => setEditVersion(e.target.value)}
                    placeholder="Ex.: v1.2 ou Final"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>
              </div>

              {/* Arquivos Extras e Explicações de Montagem */}
              <label className="block font-semibold text-slate-300">
                Arquivos Extras que Contém no Projeto ou Explicações de Montagem
                <textarea
                  rows={2}
                  value={editExtraFiles}
                  onChange={(e) => setEditExtraFiles(e.target.value)}
                  placeholder="Ex.: Necessita 4 parafusos M3x12mm e 1 mola. Contém Base.stl e Tampa.stl."
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#070c16] p-3 text-white outline-none focus:border-emerald-400"
                />
              </label>

              {/* Descrição Completa */}
              <label className="block font-semibold text-slate-300">
                Descrição Completa & Parâmetros de Impressão (Sem limite de caracteres)
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Instruções de impressão, orientação recomendada, dicas de suporte e parâmetros (sem limite de caracteres)..."
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#070c16] p-3 text-white outline-none focus:border-emerald-400"
                />
              </label>

              {/* Tags e Ordem de Produção */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="font-semibold text-slate-300">
                  Tags (Separadas por vírgula)
                  <input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="decoracao, suporte, pla"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <label className="font-semibold text-slate-300">
                  Ordem de Produção Vinculada
                  <select
                    value={editJobId}
                    onChange={(e) => setEditJobId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  >
                    <option value="">Sem vínculo</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.name} ({job.status})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingFile(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || uploadingEditPhoto}
                  className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {savingEdit ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
