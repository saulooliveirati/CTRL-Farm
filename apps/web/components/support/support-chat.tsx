"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import type { PublicUser } from "@/lib/auth-types";
import { RemoteAccessModal } from "./remote-access-modal";

export interface SupportTicket {
  id: string;
  protocol: string;
  status: "BOT_ACTIVE" | "WAITING_HUMAN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  subject: string;
  aiSummary?: string;
  createdAt: string;
  messages: SupportMessage[];
  remoteSessions?: any[];
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderType: "USER" | "AI_BOT" | "ADMIN";
  senderName: string;
  messageType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "REMOTE_INVITE" | "SYSTEM";
  content: string;
  mediaUrl?: string;
  createdAt: string;
}

interface SupportChatProps {
  user: PublicUser;
  isWidget?: boolean;
  onCloseWidget?: () => void;
}

export function SupportChat({ user, isWidget = false, onCloseWidget }: SupportChatProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Gravação de Áudio
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Socket.io
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inicializa Socket e busca os chamados do cliente
  useEffect(() => {
    fetchTickets();

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const socket = io(`${socketUrl}/support`, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Conectado ao Gateway de Suporte via WebSocket");
      if (activeTicket) {
        socket.emit("joinTicket", { ticketId: activeTicket.id, role: "USER" });
      }
    });

    socket.on("newMessage", (msg: SupportMessage) => {
      setActiveTicket((prev) => {
        if (!prev || prev.id !== msg.ticketId) return prev;
        // Evita duplicidade se a mensagem já foi adicionada otimisticamente
        if (prev.messages.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          messages: [...prev.messages, msg],
        };
      });
    });

    socket.on("ticketUpdated", (data: { ticketId: string; status: any }) => {
      setActiveTicket((prev) => {
        if (!prev || prev.id !== data.ticketId) return prev;
        return { ...prev, status: data.status };
      });
    });

    return () => {
      socket.disconnect();
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    };
  }, []);

  // Quando o ticket ativo mudar, entra na sala do socket e rola para a base
  useEffect(() => {
    if (activeTicket && socketRef.current) {
      socketRef.current.emit("joinTicket", { ticketId: activeTicket.id, role: "USER" });
    }
    scrollToBottom();
  }, [activeTicket?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [activeTicket?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function fetchTickets() {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/support/tickets");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setTickets(data.data);
        // Seleciona o primeiro chamado aberto ou em andamento se existir
        const currentOpen = data.data.find(
          (t: SupportTicket) => t.status !== "RESOLVED" && t.status !== "CLOSED"
        );
        if (currentOpen) {
          setActiveTicket(currentOpen);
        } else if (data.data.length > 0) {
          setActiveTicket(data.data[0]);
        }
      }
    } catch (err: any) {
      setErrorMsg("Erro ao carregar chamados.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateNewTicket(subject = "Dúvida Geral & Suporte da Farm") {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setTickets((prev) => [data.data, ...prev]);
        setActiveTicket(data.data);
      } else {
        setErrorMsg(data.message || "Não foi possível abrir o chamado.");
      }
    } catch {
      setErrorMsg("Falha na conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage(e?: FormEvent) {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content || !activeTicket || sending) return;

    setSending(true);
    setInputText("");

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit("sendMessage", {
          ticketId: activeTicket.id,
          senderType: "USER",
          senderName: user.name || "Cliente",
          messageType: "TEXT",
          content,
        });
      } else {
        // Fallback REST
        const res = await fetch(`/api/support/tickets/${activeTicket.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderType: "USER",
            senderName: user.name || "Cliente",
            messageType: "TEXT",
            content,
          }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setActiveTicket((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: [...prev.messages, data.data.message],
            };
          });
        }
      }
    } catch {
      setErrorMsg("Falha ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function handleEscalateToHuman() {
    if (!activeTicket) return;
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit("escalateToHuman", {
          ticketId: activeTicket.id,
          reason: "Solicitação direta de transbordo feita pelo cliente na interface.",
        });
      } else {
        await fetch(`/api/support/tickets/${activeTicket.id}/escalate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: "Solicitação direta de transbordo feita pelo cliente na interface.",
          }),
        });
      }
      setActiveTicket((prev) => (prev ? { ...prev, status: "WAITING_HUMAN" } : null));
    } catch (err) {
      console.error("Erro ao solicitar atendente humano:", err);
    }
  }

  // Upload de arquivos (imagem ou vídeo)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeTicket) return;

    setUploadingMedia(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/support/media/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.message || "Erro no envio do anexo.");
      }

      const mediaUrl = uploadData.data.url;
      const mime = uploadData.data.mimetype || "";
      const messageType = mime.startsWith("video") ? "VIDEO" : "IMAGE";

      if (socketRef.current?.connected) {
        socketRef.current.emit("sendMessage", {
          ticketId: activeTicket.id,
          senderType: "USER",
          senderName: user.name || "Cliente",
          messageType,
          content: file.name,
          mediaUrl,
        });
      } else {
        await fetch(`/api/support/tickets/${activeTicket.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderType: "USER",
            senderName: user.name || "Cliente",
            messageType,
            content: file.name,
            mediaUrl,
          }),
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Não foi possível anexar o arquivo.");
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Gravação de Áudio via MediaRecorder
  async function startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await sendRecordedAudio(audioBlob);
      };

      recorder.start();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      audioTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg("Acesso ao microfone negado ou não disponível.");
    }
  }

  function stopAudioRecording(shouldSend = true) {
    if (!mediaRecorderRef.current) return;
    if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    setIsRecordingAudio(false);

    if (shouldSend) {
      mediaRecorderRef.current.stop();
    } else {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    }
  }

  async function sendRecordedAudio(blob: Blob) {
    if (!activeTicket) return;
    setUploadingMedia(true);

    try {
      const audioFile = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", audioFile);

      const uploadRes = await fetch("/api/support/media/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.message || "Erro ao salvar áudio.");
      }

      const mediaUrl = uploadData.data.url;

      if (socketRef.current?.connected) {
        socketRef.current.emit("sendMessage", {
          ticketId: activeTicket.id,
          senderType: "USER",
          senderName: user.name || "Cliente",
          messageType: "AUDIO",
          content: `Mensagem de Áudio (${recordingSeconds}s)`,
          mediaUrl,
        });
      } else {
        await fetch(`/api/support/tickets/${activeTicket.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderType: "USER",
            senderName: user.name || "Cliente",
            messageType: "AUDIO",
            content: `Mensagem de Áudio (${recordingSeconds}s)`,
            mediaUrl,
          }),
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao enviar áudio.");
    } finally {
      setUploadingMedia(false);
      setRecordingSeconds(0);
    }
  }

  const getStatusBadge = (status: SupportTicket["status"]) => {
    switch (status) {
      case "BOT_ACTIVE":
        return {
          text: "IA Nível 1 Ativa",
          class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "WAITING_HUMAN":
        return {
          text: "Aguardando Atendente",
          class: "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse",
        };
      case "IN_PROGRESS":
        return {
          text: "Atendente Conectado",
          class: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        };
      case "RESOLVED":
        return {
          text: "Resolvido",
          class: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        };
      case "CLOSED":
        return {
          text: "Fechado",
          class: "bg-slate-500/10 text-slate-400 border-slate-500/30",
        };
      default:
        return { text: status, class: "bg-slate-800 text-slate-400" };
    }
  };

  return (
    <div
      className={`flex flex-col bg-[#0a0f1b] border border-[#263246] ${
        isWidget
          ? "w-[420px] max-w-[calc(100vw-24px)] h-[620px] rounded-2xl shadow-2xl shadow-emerald-950/40 overflow-hidden"
          : "w-full h-[760px] rounded-2xl shadow-xl overflow-hidden"
      }`}
    >
      {/* HEADER DO CHAT DE SUPORTE */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#101827] px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400 text-lg">
            🎧
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">Suporte Técnico</h2>
              {activeTicket && (
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                    getStatusBadge(activeTicket.status).class
                  }`}
                >
                  {getStatusBadge(activeTicket.status).text}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {activeTicket ? (
                <>Protocolo: <strong className="font-mono text-emerald-400">{activeTicket.protocol}</strong></>
              ) : (
                "Assistência técnica inteligente e humana da 3D Farm"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTicket && activeTicket.status === "BOT_ACTIVE" && (
            <button
              type="button"
              onClick={handleEscalateToHuman}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition active:scale-95"
              title="Transferir para um atendente humano no Sistema ADM"
            >
              <span>👨‍💼</span>
              <span>Atendente Humano</span>
            </button>
          )}

          {isWidget && onCloseWidget && (
            <button
              type="button"
              onClick={onCloseWidget}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              aria-label="Fechar Suporte"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ÁREA CENTRAL DE MENSAGENS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            Carregando chamados...
          </div>
        ) : !activeTicket ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-[#101827] border border-slate-800 flex items-center justify-center text-3xl">
              🛠️
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Nenhum chamado aberto</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Precisa de ajuda com fatiamento, nivelamento de mesa, Klipper, desentupimento ou configuração de licença?
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCreateNewTicket()}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-950/40 hover:brightness-110 transition active:scale-95"
            >
              Iniciar Atendimento Agora
            </button>
          </div>
        ) : (
          <>
            {/* Aviso do Resumo ou Protocolo */}
            <div className="rounded-xl border border-slate-800/80 bg-[#0d1424] p-3 text-center">
              <p className="text-[11px] text-slate-400">
                Chamado aberto em {new Date(activeTicket.createdAt).toLocaleDateString("pt-BR")}.
                {activeTicket.status === "BOT_ACTIVE" &&
                  " Resposta imediata do Assistente Técnico Nível 1 com suporte a fotos e áudio."}
                {activeTicket.status === "WAITING_HUMAN" &&
                  " Solicitação de transbordo enviada. Um atendente do ADM entrará na conversa em instantes."}
              </p>
            </div>

            {/* LISTA DE MENSAGENS */}
            {activeTicket.messages.map((m) => {
              const isUser = m.senderType === "USER";
              const isAi = m.senderType === "AI_BOT";
              const isAdmin = m.senderType === "ADMIN";

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  {/* Tag do Remetente */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px]">
                    {isUser && <span className="text-slate-400 font-medium">Você</span>}
                    {isAi && (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        🤖 IA Suporte Nível 1
                      </span>
                    )}
                    {isAdmin && (
                      <span className="flex items-center gap-1 text-amber-300 font-semibold bg-amber-950/40 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        👨‍💼 {m.senderName || "Suporte Técnico"}
                      </span>
                    )}
                    <span className="text-slate-500">
                      {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Bolha da Mensagem */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-md leading-relaxed ${
                      isUser
                        ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-sm"
                        : isAi
                        ? "bg-[#111c2e] text-slate-200 border border-slate-700/60 rounded-tl-sm"
                        : "bg-[#18182f] text-slate-100 border border-indigo-500/40 rounded-tl-sm"
                    }`}
                  >
                    {/* Renderização conforme tipo de mídia */}
                    {m.messageType === "TEXT" && (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}

                    {m.messageType === "IMAGE" && (
                      <div className="space-y-2">
                        {m.mediaUrl && (
                          <a
                            href={m.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-lg border border-slate-700/50 hover:opacity-90 transition"
                          >
                            <img
                              src={m.mediaUrl}
                              alt="Anexo de suporte"
                              className="max-h-60 max-w-full object-cover rounded-lg"
                            />
                          </a>
                        )}
                        {m.content && <p className="text-[11px] opacity-90">{m.content}</p>}
                      </div>
                    )}

                    {m.messageType === "VIDEO" && (
                      <div className="space-y-2">
                        {m.mediaUrl && (
                          <video
                            src={m.mediaUrl}
                            controls
                            className="max-h-64 max-w-full rounded-lg border border-slate-700/50 bg-black"
                          />
                        )}
                        {m.content && <p className="text-[11px] opacity-90">{m.content}</p>}
                      </div>
                    )}

                    {m.messageType === "AUDIO" && (
                      <div className="flex items-center gap-3 py-1">
                        <span className="text-base">🎙️</span>
                        <div className="flex-1">
                          {m.mediaUrl ? (
                            <audio src={m.mediaUrl} controls className="h-8 w-56 max-w-full" />
                          ) : (
                            <span className="text-slate-400 italic">Áudio não disponível</span>
                          )}
                          <span className="block text-[10px] text-slate-400 mt-1">{m.content}</span>
                        </div>
                      </div>
                    )}

                    {m.messageType === "REMOTE_INVITE" && (
                      <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-3 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-cyan-300">
                          <span>🖥️</span>
                          <span>Convite de Acesso Remoto</span>
                        </div>
                        <p className="text-[11px] text-slate-300">{m.content}</p>
                      </div>
                    )}

                    {m.messageType === "SYSTEM" && (
                      <div className="italic text-slate-400 text-[11px]">{m.content}</div>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* FEEDBACK DE ERRO / UPLOAD */}
      {errorMsg && (
        <div className="bg-rose-950/80 px-4 py-1 text-[11px] text-rose-300 flex items-center justify-between border-t border-rose-900/50">
          <span>⚠ {errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg("")} className="hover:text-white">
            ✕
          </button>
        </div>
      )}

      {uploadingMedia && (
        <div className="bg-cyan-950/70 px-4 py-1 text-[11px] text-cyan-300 flex items-center gap-2 border-t border-cyan-900/50">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span>Enviando arquivo multimídia...</span>
        </div>
      )}

      {/* BARRA INFERIOR DE GRAVAÇÃO DE ÁUDIO ATIVA */}
      {isRecordingAudio ? (
        <div className="flex items-center justify-between border-t border-rose-900/40 bg-rose-950/30 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
            <span className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
            <span>Gravando Áudio... {recordingSeconds}s</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stopAudioRecording(false)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => stopAudioRecording(true)}
              className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-rose-500 transition active:scale-95"
            >
              Enviar Áudio
            </button>
          </div>
        </div>
      ) : (
        /* BARRA INFERIOR DE DIGITAÇÃO E ANEXOS */
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 border-t border-slate-800 bg-[#101827] p-3 shrink-0"
        >
          {/* Input oculto de foto/vídeo */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!activeTicket || uploadingMedia}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-40"
            title="Anexar foto ou vídeo curto"
          >
            📎
          </button>

          <button
            type="button"
            onClick={startAudioRecording}
            disabled={!activeTicket || uploadingMedia}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-rose-400 transition disabled:opacity-40"
            title="Gravar áudio com microfone"
          >
            🎙️
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!activeTicket || sending}
            placeholder={
              !activeTicket
                ? "Abra um chamado para conversar"
                : "Descreva sua dúvida ou problema..."
            }
            className="flex-1 rounded-xl border border-slate-700 bg-[#090f1d] px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none disabled:opacity-40"
          />

          <button
            type="submit"
            disabled={!activeTicket || !inputText.trim() || sending}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-slate-950 shadow-md shadow-emerald-950/40 hover:bg-emerald-400 transition active:scale-95 disabled:opacity-40"
          >
            <span>Enviar</span>
            <span>➤</span>
          </button>
        </form>
      )}

      {/* MODAL DE SESSÃO REMOTA WEBRTC */}
      {activeTicket && (
        <RemoteAccessModal
          socket={socketRef.current}
          ticketId={activeTicket.id}
          onSessionEnded={() => {
            console.log("Sessão remota encerrada");
          }}
        />
      )}
    </div>
  );
}
