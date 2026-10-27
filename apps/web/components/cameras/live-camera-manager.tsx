"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { CameraRecord } from "@/lib/server-cameras";

type CameraBrand =
  | "tapo"
  | "bambu"
  | "creality"
  | "klipper"
  | "octoprint"
  | "intelbras"
  | "hikvision"
  | "flashforge"
  | "generic";

const brandPresets: Record<
  CameraBrand,
  {
    name: string;
    icon: string;
    defaultModel: string;
    defaultUser: string;
    requiresPassword: boolean;
    streamType: "RTSP" | "MJPEG";
    port: number;
    quickTip: string;
  }
> = {
  tapo: {
    name: "TP-Link Tapo",
    icon: "📱",
    defaultModel: "Tapo C210",
    defaultUser: "",
    requiresPassword: true,
    streamType: "RTSP",
    port: 554,
    quickTip:
      "Abra o app Tapo → Câmera → Configurações → Avançadas → Conta da Câmera e crie uma conta RTSP local.",
  },
  bambu: {
    name: "Bambu Lab",
    icon: "🖨️",
    defaultModel: "Bambu Lab A1 (Câmera Integrada)",
    defaultUser: "bblp",
    requiresPassword: true,
    streamType: "RTSP",
    port: 322,
    quickTip:
      "Na tela da Bambu Lab, veja o IP e o Código de Acesso nas configurações de rede / Modo LAN. O usuário padrão é 'bblp'.",
  },
  creality: {
    name: "Creality (K1 / Nebula)",
    icon: "🚀",
    defaultModel: "Creality K1 Max / Nebula Cam",
    defaultUser: "",
    requiresPassword: false,
    streamType: "MJPEG",
    port: 8080,
    quickTip:
      "Câmeras da Creality K1 e Nebula transmitem em HTTP na porta 8080 (/?action=stream) ou via RTSP na porta 554 (/live/ch0).",
  },
  klipper: {
    name: "Klipper / Moonraker / Mainsail",
    icon: "⚙️",
    defaultModel: "Klipper Webcam (Crowsnest)",
    defaultUser: "",
    requiresPassword: false,
    streamType: "MJPEG",
    port: 8080,
    quickTip:
      "Em sistemas Klipper/Moonraker, o stream MJPEG geralmente roda em http://[ip]:8080/?action=stream ou /webcam/?action=stream.",
  },
  octoprint: {
    name: "OctoPrint / OctoPi",
    icon: "🐙",
    defaultModel: "OctoPrint Webcam",
    defaultUser: "",
    requiresPassword: false,
    streamType: "MJPEG",
    port: 8080,
    quickTip:
      "No OctoPrint, a webcam USB roda pelo mjpg-streamer em http://[ip]:8080/?action=stream sem necessidade de senha local.",
  },
  flashforge: {
    name: "Flashforge (AD5X / AD5M)",
    icon: "📦",
    defaultModel: "Flashforge Adventurer 5M/5X",
    defaultUser: "",
    requiresPassword: false,
    streamType: "MJPEG",
    port: 8080,
    quickTip:
      "Nas impressoras Flashforge com câmara integrada, o fluxo de vídeo interno é servido na rede local via HTTP MJPEG.",
  },
  intelbras: {
    name: "Intelbras / Dahua",
    icon: "🏢",
    defaultModel: "Intelbras Mibo / IP",
    defaultUser: "admin",
    requiresPassword: true,
    streamType: "RTSP",
    port: 554,
    quickTip:
      "Câmeras Intelbras/Dahua usam RTSP padrão na porta 554 (/cam/realmonitor?channel=1&subtype=0 para HD).",
  },
  hikvision: {
    name: "Hikvision",
    icon: "👁️",
    defaultModel: "Hikvision IP Cam",
    defaultUser: "admin",
    requiresPassword: true,
    streamType: "RTSP",
    port: 554,
    quickTip:
      "Câmeras Hikvision utilizam a porta 554 com caminho /Streaming/Channels/101 (HD) ou /102 (SD).",
  },
  generic: {
    name: "Câmera IP Genérica / RTSP",
    icon: "🌐",
    defaultModel: "Câmera IP Genérica RTSP",
    defaultUser: "admin",
    requiresPassword: false,
    streamType: "RTSP",
    port: 554,
    quickTip:
      "Informe o IP local e credenciais se houver. O servidor conectará automaticamente via RTSP na porta 554.",
  },
};

type Draft = {
  brand: CameraBrand;
  name: string;
  model: string;
  ipAddress: string;
  quality: "HIGH" | "STANDARD";
  username: string;
  password: string;
};

const blankDraft = (brand: CameraBrand = "tapo"): Draft => {
  const p = brandPresets[brand];
  return {
    brand,
    name: "",
    model: p.defaultModel,
    ipAddress: "",
    quality: "HIGH",
    username: p.defaultUser,
    password: "",
  };
};

const defaultMediaWeb = process.env.NEXT_PUBLIC_MEDIAMTX_WEB_URL ?? "http://localhost:8890";

export function LiveCameraManager({
  initialCameras,
  initialError,
}: {
  initialCameras: CameraRecord[];
  initialError: string;
}) {
  const [cameras, setCameras] = useState(initialCameras);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CameraRecord | null>(null);
  const [draft, setDraft] = useState<Draft>(() => blankDraft("tapo"));
  const [error, setError] = useState(initialError);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [selected, setSelected] = useState<string>(initialCameras[0]?.id ?? "");
  const [viewMode, setViewMode] = useState<"focus" | "grid">("focus");
  const [streamProtocol, setStreamProtocol] = useState<"webrtc" | "hls">("hls");
  const [activeTabGuide, setActiveTabGuide] = useState<CameraBrand>("tapo");
  const [currentTime, setCurrentTime] = useState("");

  const getStreamUrl = (streamPath: string, protocol: "webrtc" | "hls" = streamProtocol) => {
    const host = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
    const port = protocol === "webrtc" ? 8890 : 8888;
    return `http://${host}:${port}/${encodeURIComponent(streamPath)}/?autoplay=true&muted=true&playsInline=true`;
  };

  const [testingId, setTestingId] = useState<string>("");
  const [diagnosticResult, setDiagnosticResult] = useState<{
    cameraId?: string;
    reachable: boolean;
    authenticated: boolean;
    statusCode?: number;
    errorType?: string;
    message: string;
    mediaServerRunning?: boolean;
  } | null>(null);

  const [modalTesting, setModalTesting] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<{
    reachable: boolean;
    authenticated: boolean;
    statusCode?: number;
    errorType?: string;
    message: string;
  } | null>(null);

  async function runDiagnostic(camera: CameraRecord) {
    setTestingId(camera.id);
    setDiagnosticResult(null);
    try {
      const res = await fetch(`/api/cameras/${camera.id}/test`);
      const data = await res.json();
      if (res.ok && data.data) {
        setDiagnosticResult(data.data);
      } else {
        setDiagnosticResult({
          reachable: false,
          authenticated: false,
          message: data.message || "Erro ao consultar diagnóstico da câmera.",
        });
      }
    } catch (err: any) {
      setDiagnosticResult({
        reachable: false,
        authenticated: false,
        message: `Falha na requisição: ${err.message}`,
      });
    } finally {
      setTestingId("");
    }
  }

  async function testDraftCredentials() {
    setModalTesting(true);
    setModalTestResult(null);
    try {
      const res = await fetch(`/api/cameras/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name || "Teste",
          model: draft.model || "Câmera",
          ipAddress: draft.ipAddress,
          quality: draft.quality,
          username: draft.username,
          password: draft.password,
        }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setModalTestResult(data.data);
      } else {
        setModalTestResult({
          reachable: false,
          authenticated: false,
          message: data.message || "Erro ao testar credenciais.",
        });
      }
    } catch (err: any) {
      setModalTestResult({
        reachable: false,
        authenticated: false,
        message: `Falha ao testar: ${err.message}`,
      });
    } finally {
      setModalTesting(false);
    }
  }

  function toggleFullscreen() {
    const elem = document.getElementById("main-camera-player");
    if (!elem) return;
    if (!document.fullscreenElement) {
      void elem.requestFullscreen().catch(() => {});
    } else {
      void document.exitFullscreen().catch(() => {});
    }
  }

  // Relógio ao vivo estilo CCTV
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("pt-BR", { hour12: false }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  function openCreate(brand: CameraBrand = "tapo") {
    setEditing(null);
    setDraft(blankDraft(brand));
    setError("");
    setModalTestResult(null);
    setModalOpen(true);
  }

  function openEdit(camera: CameraRecord) {
    setEditing(camera);
    setModalTestResult(null);
    // Detecta marca aproximada pelo modelo
    const modelLower = (camera.model ?? "").toLowerCase();
    let detectedBrand: CameraBrand = "generic";
    if (modelLower.includes("tapo")) detectedBrand = "tapo";
    else if (modelLower.includes("bambu")) detectedBrand = "bambu";
    else if (modelLower.includes("k1") || modelLower.includes("creality"))
      detectedBrand = "creality";
    else if (modelLower.includes("klipper") || modelLower.includes("moonraker"))
      detectedBrand = "klipper";
    else if (modelLower.includes("octo")) detectedBrand = "octoprint";
    else if (modelLower.includes("intelbras")) detectedBrand = "intelbras";
    else if (modelLower.includes("hikvision")) detectedBrand = "hikvision";
    else if (modelLower.includes("flashforge")) detectedBrand = "flashforge";

    setDraft({
      brand: detectedBrand,
      name: camera.name,
      model: camera.model ?? brandPresets[detectedBrand].defaultModel,
      ipAddress: camera.ipAddress,
      quality: camera.quality,
      username: camera.username,
      password: "",
    });
    setError("");
    setModalOpen(true);
  }

  function handleBrandChange(brand: CameraBrand) {
    const p = brandPresets[brand];
    setDraft((curr) => ({
      ...curr,
      brand,
      model: curr.model === brandPresets[curr.brand].defaultModel ? p.defaultModel : curr.model,
      username:
        curr.username === brandPresets[curr.brand].defaultUser ? p.defaultUser : curr.username,
    }));
  }

  function updateDraft(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(editing ? `/api/cameras/${editing.id}` : "/api/cameras", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          model: draft.model.trim() || brandPresets[draft.brand].defaultModel,
          ipAddress: draft.ipAddress.trim(),
          quality: draft.quality,
          username: draft.username.trim() || undefined,
          password: draft.password.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          Array.isArray(result.message)
            ? result.message.join(" ")
            : (result.message ?? "Não foi possível salvar a câmera."),
        );
      }

      const saved = result.data as CameraRecord;
      setCameras((items) =>
        editing ? items.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...items],
      );
      setSelected(saved.id);
      setModalOpen(false);
      setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar câmera.");
    } finally {
      setSaving(false);
    }
  }

  async function reconnect(camera: CameraRecord) {
    setBusyId(camera.id);
    setError("");
    try {
      const response = await fetch(`/api/cameras/${camera.id}/reconnect`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível reconectar a câmera.");
      const saved = result.data as CameraRecord;
      setCameras((items) => items.map((item) => (item.id === saved.id ? saved : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao reconectar.");
    } finally {
      setBusyId("");
    }
  }

  async function remove(camera: CameraRecord) {
    if (!window.confirm(`Remover a câmera “${camera.name}”?`)) return;
    const response = await fetch(`/api/cameras/${camera.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message ?? "Não foi possível remover a câmera.");
      return;
    }
    setCameras((items) => items.filter((item) => item.id !== camera.id));
    setSelected((current) =>
      current === camera.id ? (cameras.find((item) => item.id !== camera.id)?.id ?? "") : current,
    );
  }

  const current = cameras.find((camera) => camera.id === selected) ?? cameras[0];
  const onlineCount = cameras.filter((c) => c.streamConfigured).length;

  const fieldClass =
    "h-10 w-full rounded-xl border border-slate-700 bg-[#070b13] px-3.5 text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400";
  const labelClass = "grid min-w-0 gap-1.5 text-xs font-semibold text-slate-300";

  return (
    <div className="mx-auto max-w-[1680px] space-y-6 text-slate-100">
      {/* Header com Design Elegante & Moderno */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-[#0d1527] via-[#0f1b33] to-[#0d1527] p-4 sm:p-5 shadow-xl">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-2xl shadow-lg shadow-cyan-500/20 text-white">
              📹
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                  CFTV & Telemetria Visual
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Transmissão Operacional
                </span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Monitoramento
              </h1>
              <p className="mt-0.5 text-xs text-slate-300">
                Acompanhe em tempo real a evolução física das impressões 3D com transmissão contínua
                de baixa latência.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de Modo de Visualização */}
            <div className="flex items-center rounded-xl border border-slate-800 bg-[#070b13] p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("focus")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  viewMode === "focus"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🎬</span>
                <span>Visão Foco</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  viewMode === "grid"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🔲</span>
                <span>Mural ({cameras.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => openCreate("tapo")}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition flex items-center gap-1.5"
            >
              <span>＋</span>
              <span>Adicionar Câmera</span>
            </button>
          </div>
        </div>

        {/* Barra de Status Rápido */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <strong>{onlineCount}</strong> de <strong>{cameras.length}</strong> câmeras ativas
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">
              Protocolos: <strong>WebRTC · RTSP · HLS · MJPEG</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-300 bg-cyan-950/40 border border-cyan-800/30 px-2.5 py-1 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span>AO VIVO · {currentTime || "00:00:00"}</span>
          </div>
        </div>
      </header>

      {/* Alerta de Erro */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200 flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-400 hover:text-rose-200 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sem Câmeras Cadastradas */}
      {cameras.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-800 bg-[#101827]/40 p-12 text-center shadow-lg">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-cyan-500/10 text-3xl mx-auto text-cyan-400 border border-cyan-500/20">
            📹
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">Nenhuma câmera cadastrada na farm</h2>
          <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
            Integre câmeras TP-Link Tapo, Bambu Lab, Creality K1, Klipper/Moonraker ou câmeras IP
            para monitorar suas peças 24 horas por dia.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => openCreate("tapo")}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 transition"
            >
              ＋ Cadastrar TP-Link Tapo
            </button>
            <button
              type="button"
              onClick={() => openCreate("bambu")}
              className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-white transition"
            >
              ＋ Câmera Bambu Lab
            </button>
            <button
              type="button"
              onClick={() => openCreate("klipper")}
              className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-white transition"
            >
              ＋ Klipper / Moonraker
            </button>
          </div>
        </section>
      ) : viewMode === "focus" ? (
        /* VISÃO FOCO (Player Principal em Destaque + Coluna Lateral) */
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Player Principal */}
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] shadow-xl flex flex-col">
            {/* Header do Player */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3.5 bg-[#0d1424]">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-sm">
                  📹
                </span>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    {current?.name ?? "Câmera Selecionada"}
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40">
                      {current?.model ?? "Câmera"}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    IP: {current?.ipAddress} ·{" "}
                    {current?.quality === "HIGH" ? "1080p HD" : "Qualidade Padrão"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1.5 ${
                    current?.streamConfigured
                      ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                      : "bg-amber-400/10 text-amber-300 border border-amber-400/20"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${current?.streamConfigured ? "bg-emerald-400" : "bg-amber-400"}`}
                  />
                  {current?.streamConfigured ? "Fluxo Ativo" : "Aguardando Sinal"}
                </span>

                <button
                  type="button"
                  disabled={testingId === current?.id}
                  onClick={() => current && void runDiagnostic(current)}
                  className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/60 px-2.5 py-1 text-xs font-semibold text-cyan-300 transition flex items-center gap-1.5"
                  title="Testar conectividade e credenciais da câmera"
                >
                  {testingId === current?.id ? (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full border-2 border-cyan-300 border-t-transparent animate-spin" />
                      <span>Testando...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Testar Conexão</span>
                    </>
                  )}
                </button>

                <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900/90 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setStreamProtocol("hls")}
                    className={`px-2 py-0.5 rounded font-medium transition ${streamProtocol === "hls" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-400 hover:text-slate-200"}`}
                    title="HLS: Protocolo HTTP com máxima compatibilidade (recomendado se tela preta)"
                  >
                    📺 HLS
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamProtocol("webrtc")}
                    className={`px-2 py-0.5 rounded font-medium transition ${streamProtocol === "webrtc" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-400 hover:text-slate-200"}`}
                    title="WebRTC: Baixa latência em tempo real"
                  >
                    ⚡ WebRTC
                  </button>
                </div>

                {current?.streamConfigured && (
                  <a
                    href={getStreamUrl(current.streamPath, streamProtocol)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-2 py-1 text-xs text-cyan-300 hover:text-cyan-200 transition flex items-center gap-1"
                    title="Abrir reprodutor em nova aba"
                  >
                    <span>↗</span>
                    <span className="hidden sm:inline">Nova Aba</span>
                  </a>
                )}

                <button
                  type="button"
                  disabled={busyId === current?.id}
                  onClick={() => current && void reconnect(current)}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 text-xs text-slate-300 transition"
                  title="Reconectar fluxo da câmera"
                >
                  {busyId === current?.id ? "↻ ..." : "↻"}
                </button>
              </div>
            </div>

            {/* Tela de Vídeo */}
            <div
              id="main-camera-player"
              className="relative aspect-video min-h-[360px] bg-black group overflow-hidden"
            >
              {current?.streamConfigured ? (
                <>
                  <iframe
                    key={`${current.id}-${streamProtocol}`}
                    title={`Transmissão ao vivo: ${current.name}`}
                    src={getStreamUrl(current.streamPath, streamProtocol)}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />

                  {/* Overlay Superior CCTV */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none text-xs font-mono drop-shadow-md">
                    <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      REC · {current.name}
                    </span>
                    <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-slate-300 border border-slate-700/40">
                      {currentTime}
                    </span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 grid place-items-center p-6 text-center bg-gradient-to-b from-[#080d17] to-black overflow-y-auto">
                  <div className="max-w-md my-auto">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-800/80 text-2xl mx-auto text-slate-400 mb-3 border border-slate-700">
                      📹
                    </div>
                    <p className="text-sm font-bold text-white">
                      Fluxo de vídeo em espera ou validação
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      IP da câmera: <strong className="text-slate-200">{current?.ipAddress}</strong> · Modelo: {current?.model || "Câmera"}
                    </p>

                    {/* Exibição do Diagnóstico em Tempo Real */}
                    {diagnosticResult && (
                      <div
                        className={`mt-3.5 rounded-xl border p-3.5 text-left text-xs ${
                          diagnosticResult.authenticated
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : diagnosticResult.errorType === "AUTH_FAILED"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold mb-1">
                          <span>
                            {diagnosticResult.authenticated
                              ? "✅"
                              : diagnosticResult.errorType === "AUTH_FAILED"
                                ? "⚠️"
                                : "❌"}
                          </span>
                          <span>
                            {diagnosticResult.authenticated
                              ? "Conexão e Autenticação OK"
                              : diagnosticResult.errorType === "AUTH_FAILED"
                                ? "Login Recusado pela Câmera (401)"
                                : "Câmera Inacessível na Rede"}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-300">
                          {diagnosticResult.message}
                        </p>
                        {diagnosticResult.errorType === "AUTH_FAILED" &&
                          current?.model?.toLowerCase().includes("tapo") && (
                            <div className="mt-2.5 pt-2 border-t border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                              <strong>Instrução Tapo:</strong> No aplicativo Tapo no celular, abra as{" "}
                              <em>Configurações da Câmera &gt; Configurações Avançadas &gt; Conta da Câmera</em>.
                              Crie um usuário e senha locais para RTSP e use esses dados abaixo em &quot;Editar Credenciais&quot;.
                            </div>
                          )}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={testingId === current?.id}
                        onClick={() => current && void runDiagnostic(current)}
                        className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 px-4 py-2 text-xs font-bold text-cyan-300 transition"
                      >
                        {testingId === current?.id ? "Diagnóstico em andamento..." : "🔍 Testar Conexão"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === current?.id}
                        onClick={() => current && void reconnect(current)}
                        className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
                      >
                        {busyId === current?.id ? "Reconectando..." : "↻ Tentar Reconexão"}
                      </button>
                      <button
                        type="button"
                        onClick={() => current && openEdit(current)}
                        className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition"
                      >
                        Editar Credenciais
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Barra de Controles Inferior */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#0d1424] border-t border-slate-800">
              <div className="text-[11px] text-slate-400">
                <span>Transmissão WebRTC contínua com latência ultra-baixa.</span>
              </div>

              <div className="flex items-center gap-2">
                {current && (
                  <>
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-300 transition flex items-center gap-1.5"
                      title="Tela cheia"
                    >
                      <span>⛶</span>
                      <span>Tela Cheia</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(current)}
                      className="rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-300 transition flex items-center gap-1.5"
                    >
                      <span>✎</span>
                      <span>Configurações</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(current)}
                      className="rounded-lg border border-slate-800 bg-slate-900 hover:border-rose-500/50 hover:text-rose-300 px-3 py-1.5 text-xs text-slate-400 transition"
                    >
                      Remover
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Lista Lateral de Câmeras */}
          <aside className="rounded-2xl border border-slate-800 bg-[#101827] p-4 shadow-xl flex flex-col">
            <div className="mb-3.5 flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Todas as Câmeras
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {cameras.length} dispositivo(s) cadastrado(s)
                </p>
              </div>

              <button
                type="button"
                onClick={() => openCreate("tapo")}
                className="rounded-lg border border-slate-700 bg-slate-800/80 hover:border-cyan-400/50 hover:text-cyan-300 px-2.5 py-1 text-xs text-slate-300 transition font-bold"
                title="Cadastrar nova câmera"
              >
                ＋ Nova
              </button>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-24rem)]">
              {cameras.map((camera) => {
                const isSelected = current?.id === camera.id;
                return (
                  <div
                    key={camera.id}
                    className={`group flex items-center gap-2.5 rounded-xl border p-3 transition ${
                      isSelected
                        ? "border-cyan-400/50 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 shadow-md"
                        : "border-slate-800 bg-[#0b1220] hover:border-slate-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(camera.id)}
                      className="min-w-0 flex-1 text-left flex items-start gap-2.5"
                    >
                      <span className="text-lg mt-0.5">📹</span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-white group-hover:text-cyan-300 transition">
                          {camera.name}
                        </span>
                        <span className="block truncate text-[10px] text-slate-400 mt-0.5">
                          {camera.model ?? "Câmera"} · {camera.ipAddress}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        title={camera.streamConfigured ? "Sinal configurado" : "Aguardando sinal"}
                        className={`h-2.5 w-2.5 rounded-full ${camera.streamConfigured ? "bg-emerald-400" : "bg-amber-400"}`}
                      />
                      <button
                        type="button"
                        onClick={() => openEdit(camera)}
                        className="p-1 text-xs text-slate-500 hover:text-cyan-300 transition"
                        title="Editar"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(camera)}
                        className="p-1 text-xs text-slate-500 hover:text-rose-400 transition"
                        title="Excluir"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      ) : (
        /* VISÃO MURAL MULTI-CÂMERAS (CCTV Wall Grid) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras.map((camera) => (
            <div
              key={camera.id}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] shadow-xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 bg-[#0d1424]">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm">📹</span>
                  <span className="text-xs font-bold text-white truncate">{camera.name}</span>
                </div>
                <span
                  className={`h-2 w-2 rounded-full ${camera.streamConfigured ? "bg-emerald-400" : "bg-amber-400"}`}
                  title={camera.streamConfigured ? "Ativo" : "Aguardando sinal"}
                />
              </div>

              <div className="relative aspect-video bg-black">
                {camera.streamConfigured ? (
                  <iframe
                    key={`${camera.id}-${streamProtocol}`}
                    title={`Transmissão: ${camera.name}`}
                    src={getStreamUrl(camera.streamPath, streamProtocol)}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center p-4 text-center">
                    <div>
                      <p className="text-xs text-slate-400">Sem sinal de vídeo</p>
                      <button
                        type="button"
                        disabled={busyId === camera.id}
                        onClick={() => void reconnect(camera)}
                        className="mt-2 rounded bg-slate-800 px-2 py-1 text-[10px] text-cyan-300 font-semibold"
                      >
                        {busyId === camera.id ? "Conectando..." : "↻ Reconectar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 bg-[#0d1424]">
                <span className="truncate">
                  {camera.model ?? "Câmera"} · {camera.ipAddress}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(camera.id);
                    setViewMode("focus");
                  }}
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  Focar ↗
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GUIA DE CONFIGURAÇÃO PASSO A PASSO (No final da página conforme solicitado) */}
      <footer className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📚</span>
            <div>
              <h2 className="text-sm font-bold text-white">
                Guia de Integração por Marca e Modelo
              </h2>
              <p className="text-xs text-slate-400">
                Passo a passo explicativo para habilitar a transmissão em qualquer câmera da sua
                farm.
              </p>
            </div>
          </div>
        </div>

        {/* Abas dos Fabricantes */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-800/60 pb-2">
          {(Object.keys(brandPresets) as CameraBrand[]).map((key) => {
            const b = brandPresets[key];
            const active = activeTabGuide === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTabGuide(key)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <span>{b.icon}</span>
                <span>{b.name}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo do Guia Selecionado */}
        <div className="rounded-xl border border-slate-800/80 bg-[#070b13] p-4 text-xs leading-relaxed text-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm flex items-center gap-2">
              <span>{brandPresets[activeTabGuide].icon}</span>
              <span>{brandPresets[activeTabGuide].name}</span>
            </span>
            <span className="font-mono text-[10px] text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">
              Protocolo: {brandPresets[activeTabGuide].streamType} · Porta{" "}
              {brandPresets[activeTabGuide].port}
            </span>
          </div>

          <p className="text-slate-300">{brandPresets[activeTabGuide].quickTip}</p>

          {activeTabGuide === "tapo" && (
            <div className="mt-2 text-slate-400 space-y-1">
              <p>
                <strong>1.</strong> No app TP-Link Tapo, clique na engrenagem de configurações da
                câmera.
              </p>
              <p>
                <strong>2.</strong> Vá em <em>Configurações Avançadas</em> →{" "}
                <em>Conta da Câmera</em> e crie um usuário e senha exclusivos para RTSP.
              </p>
              <p>
                <strong>3.</strong> Reserve um IP fixo para a câmera no roteador local para evitar
                trocas de endereço.
              </p>
            </div>
          )}

          {activeTabGuide === "bambu" && (
            <div className="mt-2 text-slate-400 space-y-1">
              <p>
                <strong>1.</strong> Na tela da impressora Bambu Lab (X1C/P1S/A1), acesse{" "}
                <em>Configurações</em> → <em>Rede</em> e ative o <strong>Modo LAN</strong>.
              </p>
              <p>
                <strong>2.</strong> Anote o <strong>Código de Acesso</strong> de 8 dígitos e o IP
                local exibido na tela.
              </p>
              <p>
                <strong>3.</strong> Cadastre no CTRL-Farm com usuário <code>bblp</code> e a senha
                sendo o Código de Acesso.
              </p>
            </div>
          )}

          {activeTabGuide === "klipper" && (
            <div className="mt-2 text-slate-400 space-y-1">
              <p>
                <strong>1.</strong> No Klipper (Fluidd ou Mainsail), a webcam roda através do
                serviço <em>crowsnest</em> ou <em>mjpg-streamer</em> na porta 8080.
              </p>
              <p>
                <strong>2.</strong> Não é necessária senha para visualização na rede local.
              </p>
              <p>
                <strong>3.</strong> O snapshot para timelapses fica disponível em{" "}
                <code>http://[ip]:8080/?action=snapshot</code>.
              </p>
            </div>
          )}

          {activeTabGuide === "creality" && (
            <div className="mt-2 text-slate-400 space-y-1">
              <p>
                <strong>1.</strong> Nas impressoras Creality K1, K1 Max e com Nebula Smart Kit, o
                stream fica ativo na rede local na porta 8080.
              </p>
              <p>
                <strong>2.</strong> O fluxo RTSP nativo também responde em{" "}
                <code>rtsp://[ip]:554/live/ch0</code>.
              </p>
            </div>
          )}
        </div>
      </footer>

      {/* Modal de Cadastro / Edição com Seleção de Marca */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-modal-title"
            className="my-auto max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0d1424] p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <h2
                  id="camera-modal-title"
                  className="text-lg font-bold text-white flex items-center gap-2"
                >
                  <span>📹</span>
                  <span>{editing ? "Editar Câmera" : "Cadastrar Nova Câmera"}</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Compatível com TP-Link Tapo, Bambu Lab, Creality K1, Klipper, OctoPrint e
                  Intelbras.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-xl text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={save} className="space-y-4">
              {/* Seletor de Marca */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Marca / Fabricante da Câmera
                </label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {(Object.keys(brandPresets) as CameraBrand[]).map((key) => {
                    const b = brandPresets[key];
                    const isSelected = draft.brand === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleBrandChange(key)}
                        className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 font-bold"
                            : "border-slate-800 bg-[#070b13] text-slate-400 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        <span className="text-base">{b.icon}</span>
                        <span className="text-[10px] mt-1 truncate w-full">{b.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dica da Marca Selecionada */}
              <div className="rounded-xl border border-cyan-800/30 bg-cyan-950/20 p-3 text-[11px] leading-relaxed text-cyan-200">
                <strong>Dica {brandPresets[draft.brand].name}:</strong>{" "}
                {brandPresets[draft.brand].quickTip}
              </div>

              {/* Campos Principais */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Nome Identificador *
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={draft.name}
                    onChange={(e) => updateDraft("name", e.target.value)}
                    placeholder="Ex.: Câmera Bambu Lab A1"
                    className={fieldClass}
                  />
                </label>

                <label className={labelClass}>
                  Modelo
                  <input
                    maxLength={80}
                    value={draft.model}
                    onChange={(e) => updateDraft("model", e.target.value)}
                    placeholder={brandPresets[draft.brand].defaultModel}
                    className={fieldClass}
                  />
                </label>

                <label className={labelClass}>
                  Endereço IP Local *
                  <input
                    required
                    pattern="^(10\.(\d{1,3}\.){2}\d{1,3}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}|192\.168(\.\d{1,3}){2})$"
                    value={draft.ipAddress}
                    onChange={(e) => updateDraft("ipAddress", e.target.value)}
                    placeholder="Ex.: 192.168.1.80"
                    className={fieldClass}
                  />
                </label>

                <label className={labelClass}>
                  Qualidade da Transmissão
                  <select
                    value={draft.quality}
                    onChange={(e) => updateDraft("quality", e.target.value)}
                    className={fieldClass}
                  >
                    <option value="HIGH">Alta Qualidade (1080p HD)</option>
                    <option value="STANDARD">Padrão / Leve (Fluidez)</option>
                  </select>
                </label>

                <label className={labelClass}>
                  Usuário da Câmera{" "}
                  {brandPresets[draft.brand].defaultUser
                    ? "(padrão: " + brandPresets[draft.brand].defaultUser + ")"
                    : "(opcional)"}
                  <input
                    maxLength={64}
                    value={draft.username}
                    onChange={(e) => updateDraft("username", e.target.value)}
                    placeholder={brandPresets[draft.brand].defaultUser || "Usuário local"}
                    className={fieldClass}
                  />
                </label>

                <label className={labelClass}>
                  Senha{" "}
                  {editing
                    ? "(opcional para manter)"
                    : brandPresets[draft.brand].requiresPassword
                      ? "*"
                      : "(se houver)"}
                  <input
                    required={!editing && brandPresets[draft.brand].requiresPassword}
                    maxLength={64}
                    type="password"
                    value={draft.password}
                    onChange={(e) => updateDraft("password", e.target.value)}
                    placeholder={editing ? "Deixe vazio para manter" : "Senha ou Código"}
                    className={fieldClass}
                  />
                </label>
              </div>

              {/* Feedback de Teste de Conexão no Modal */}
              {modalTestResult && (
                <div
                  className={`mt-3 rounded-xl p-3 text-xs border ${
                    modalTestResult.authenticated
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : modalTestResult.errorType === "AUTH_FAILED"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-0.5">
                    <span>
                      {modalTestResult.authenticated
                        ? "✅ Conexão Bem-Sucedida!"
                        : modalTestResult.errorType === "AUTH_FAILED"
                          ? "⚠️ Login Recusado (401 Unauthorized)"
                          : "❌ Falha de Comunicação"}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{modalTestResult.message}</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={modalTesting || !draft.ipAddress}
                  onClick={testDraftCredentials}
                  className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 px-3.5 py-2.5 text-xs font-bold text-cyan-300 transition flex items-center gap-1.5 disabled:opacity-50"
                  title="Testa o IP e as credenciais sem precisar salvar"
                >
                  {modalTesting ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
                      Testando Câmera...
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Testar Conexão</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {saving ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Conectando...
                      </>
                    ) : editing ? (
                      "✓ Salvar Alterações"
                    ) : (
                      "✓ Conectar e Transmitir"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
