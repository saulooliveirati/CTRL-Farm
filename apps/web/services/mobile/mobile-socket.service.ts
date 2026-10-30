// ==============================================================================
// Mobile WebSocket Service — CTRL Farm Manager Mobile
// Sincronização em tempo real de telemetria, impressoras, câmeras e alertas
// ==============================================================================

import { io, Socket } from 'socket.io-client';

export type SocketStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export class MobileSocketService {
  private static instance: MobileSocketService;
  private socket: Socket | null = null;
  private status: SocketStatus = 'disconnected';
  private statusListeners: ((status: SocketStatus) => void)[] = [];

  public static getInstance(): MobileSocketService {
    if (!MobileSocketService.instance) {
      MobileSocketService.instance = new MobileSocketService();
    }
    return MobileSocketService.instance;
  }

  public connect(url: string = 'http://localhost:3001'): void {
    if (this.socket && this.socket.connected) return;

    this.updateStatus('connecting');

    try {
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 5000,
      });

      this.socket.on('connect', () => {
        this.updateStatus('connected');
        console.log('[MobileSocket] Conectado à telemetria da Farm');
      });

      this.socket.on('disconnect', () => {
        this.updateStatus('disconnected');
      });

      this.socket.on('connect_error', () => {
        this.updateStatus('disconnected');
      });
    } catch (err) {
      this.updateStatus('disconnected');
      console.warn('[MobileSocket] Operando em modo offline simulado:', err);
    }
  }

  public on(event: string, callback: (...args: any[]) => void): () => void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
    return () => {
      if (this.socket) {
        this.socket.off(event, callback);
      }
    };
  }

  public emit(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  public onStatusChange(listener: (status: SocketStatus) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  public getStatus(): SocketStatus {
    return this.status;
  }

  private updateStatus(newStatus: SocketStatus): void {
    this.status = newStatus;
    this.statusListeners.forEach((l) => l(newStatus));
  }
}
