"use client";

import { useEffect, useState, useRef } from "react";
import type { Socket } from "socket.io-client";

interface RemoteAccessModalProps {
  socket: Socket | null;
  ticketId: string;
  onSessionEnded?: () => void;
}

export function RemoteAccessModal({ socket, ticketId, onSessionEnded }: RemoteAccessModalProps) {
  const [session, setSession] = useState<{ id: string; status: string; expiresAt?: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutos em segundos
  const [isStartingStream, setIsStartingStream] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Escuta eventos de solicitação e resposta via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleRemoteRequested = (data: { ticketId: string; session: any }) => {
      if (data.ticketId === ticketId) {
        setSession(data.session);
        setModalOpen(true);
      }
    };

    const handleRemoteResponded = (data: { ticketId: string; session: any; authorized: boolean }) => {
      if (data.ticketId === ticketId) {
        setSession(data.session);
        if (!data.authorized) {
          cleanup();
        }
      }
    };

    const handleRemoteEnded = (data: { ticketId: string; sessionId: string }) => {
      if (data.ticketId === ticketId) {
        cleanup();
      }
    };

    const handleRemoteSignaling = async (data: {
      ticketId: string;
      type: "offer" | "answer" | "candidate" | "end";
      signal: any;
    }) => {
      if (data.ticketId !== ticketId || !pcRef.current) return;

      try {
        if (data.type === "answer") {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
        } else if (data.type === "candidate" && data.signal) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.signal));
        } else if (data.type === "end") {
          cleanup();
        }
      } catch (err) {
        console.error("Erro na sinalização WebRTC remota:", err);
      }
    };

    socket.on("remoteAccessRequested", handleRemoteRequested);
    socket.on("remoteAccessResponded", handleRemoteResponded);
    socket.on("remoteAccessEnded", handleRemoteEnded);
    socket.on("remoteSignaling", handleRemoteSignaling);

    return () => {
      socket.off("remoteAccessRequested", handleRemoteRequested);
      socket.off("remoteAccessResponded", handleRemoteResponded);
      socket.off("remoteAccessEnded", handleRemoteEnded);
      socket.off("remoteSignaling", handleRemoteSignaling);
    };
  }, [socket, ticketId]);

  // Contagem regressiva de expiração de 30 minutos
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            cleanup();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setIsActive(false);
    setModalOpen(false);
    setSession(null);
    setTimeLeft(30 * 60);
    if (onSessionEnded) onSessionEnded();
  };

  const handleAuthorize = async () => {
    if (!session || !socket) return;
    setIsStartingStream(true);

    try {
      // 1. Captura da tela do usuário
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "monitor",
        } as any,
        audio: true,
      });

      streamRef.current = stream;

      // 2. Notifica término manual caso o usuário clique no botão nativo do navegador "Interromper compartilhamento"
      stream.getVideoTracks()[0].onended = () => {
        handleEndSession();
      };

      // 3. Inicializa Conexão Peer-to-Peer WebRTC
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      pcRef.current = pc;

      // Adiciona as faixas de vídeo/áudio da tela
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Envia candidatos ICE para o ADM
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("remoteSignaling", {
            ticketId,
            type: "candidate",
            signal: event.candidate,
          });
        }
      };

      // Cria a Oferta WebRTC (Offer)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Envia sinal de Offer para a sala
      socket.emit("remoteSignaling", {
        ticketId,
        type: "offer",
        signal: offer,
      });

      // 4. Emite confirmação de autorização para o Gateway
      socket.emit("respondRemoteAccess", {
        ticketId,
        sessionId: session.id,
        authorized: true,
      });

      setModalOpen(false);
      setIsActive(true);
      setTimeLeft(30 * 60); // 30 minutos
    } catch (err) {
      console.error("Falha ao autorizar compartilhamento de tela:", err);
      if (socket && session) {
        socket.emit("respondRemoteAccess", {
          ticketId,
          sessionId: session.id,
          authorized: false,
        });
      }
      cleanup();
    } finally {
      setIsStartingStream(false);
    }
  };

  const handleReject = () => {
    if (socket && session) {
      socket.emit("respondRemoteAccess", {
        ticketId,
        sessionId: session.id,
        authorized: false,
      });
    }
    cleanup();
  };

  const handleEndSession = () => {
    if (socket && session) {
      socket.emit("endRemoteAccess", {
        ticketId,
        sessionId: session.id,
      });
      socket.emit("remoteSignaling", {
        ticketId,
        type: "end",
        signal: null,
      });
    }
    cleanup();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* BANNER FLUTUANTE SUPERIOR: SESSÃO REMOTA ATIVA */}
      {isActive && (
        <aside
          role="complementary"
          aria-label="Sessão remota ativa"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3.5 rounded-2xl border border-rose-500/50 bg-[#0e1626]/95 px-5 py-3 shadow-2xl backdrop-blur-md animate-bounce"
        >
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-100 flex items-center gap-2">
              🔴 Acesso Remoto Assistido Ativo
              <span className="rounded bg-rose-950/80 px-2 py-0.5 font-mono text-[11px] text-rose-300">
                Expira em: {formatTimer(timeLeft)}
              </span>
            </span>
            <span className="text-[11px] text-slate-400">
              O Suporte Técnico está visualizando sua tela em tempo real.
            </span>
          </div>
          <button
            type="button"
            onClick={handleEndSession}
            className="ml-2 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-rose-500 transition active:scale-95"
          >
            Encerrar Agora
          </button>
        </aside>
      )}

      {/* MODAL DE SOLICITAÇÃO DE ACESSO REMOTO */}
      {modalOpen && session && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remote-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0e1726] p-6 shadow-2xl shadow-cyan-950/40">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-2xl">
                🖥️
              </div>
              <div>
                <h3 id="remote-modal-title" className="text-base font-bold text-slate-100">
                  Solicitação de Acesso Remoto
                </h3>
                <p className="text-xs text-slate-400">
                  Atendimento Assistido do Suporte Técnico CTRL-Farm
                </p>
              </div>
            </div>

            <div className="my-5 rounded-xl border border-slate-800 bg-[#090f1d] p-4 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-slate-200">
                O Atendente de Suporte do Sistema ADM solicitou autorização para visualizar sua tela.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                <li>Apenas a visualização da tela selecionada será transmitida.</li>
                <li>Duração máxima autorizada: <strong className="text-cyan-400">30 minutos</strong>.</li>
                <li>Você pode revogar e fechar o acesso a qualquer segundo.</li>
                <li>Conexão direta ponta-a-ponta via WebRTC de alta segurança.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReject}
                disabled={isStartingStream}
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Recusar Acesso
              </button>
              <button
                type="button"
                onClick={handleAuthorize}
                disabled={isStartingStream}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/40 hover:brightness-110 transition active:scale-95 disabled:opacity-50"
              >
                {isStartingStream ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    <span>Iniciando...</span>
                  </>
                ) : (
                  <>
                    <span>✓ Autorizar Compartilhamento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
