// ==============================================================================
// Hook de Autenticação & Biometria iOS — CTRL Farm Manager Mobile
// Simulação de Face ID, PIN de 6 dígitos, expiração por inatividade e JWT
// ==============================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AuditLoggerService } from '@/services/mobile/audit-logger.service';

export interface MobileAdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN_MASTER' | 'MANAGER' | 'OPERATOR';
  farmName: string;
  avatarUrl: string;
}

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos de inatividade para auto-lock
const DEFAULT_PIN = '123456';

export function useMobileAuth() {
  const [user] = useState<MobileAdminUser>({
    id: 'usr-admin-01',
    name: 'Saulo Oliveira',
    email: 'admin@ctrlfarm.com.br',
    role: 'ADMIN_MASTER',
    farmName: 'CTRL-Farm Matriz Industrial',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  });

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isEmergencyLocked, setIsEmergencyLocked] = useState<boolean>(false);
  const [faceIdActive, setFaceIdActive] = useState<boolean>(false);
  const [faceIdSuccess, setFaceIdSuccess] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Monitoramento de inatividade estilo iOS
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setIsLocked(true);
      AuditLoggerService.getInstance().log({
        action: 'Sessão bloqueada por inatividade (5 minutos)',
        category: 'SECURITY',
        actor: { name: user.name, role: user.role, id: user.id },
        target: 'Dispositivo Móvel',
        details: { timeoutMinutes: 5 },
        status: 'WARNING',
      });
    }, INACTIVITY_TIMEOUT_MS);
  }, [user]);

  useEffect(() => {
    const handleActivity = () => {
      if (!isLocked) {
        resetInactivityTimer();
      }
    };

    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [isLocked, resetInactivityTimer]);

  // Autenticação biométrica Face ID
  const authenticateWithFaceId = useCallback(async (): Promise<boolean> => {
    setFaceIdActive(true);
    setFaceIdSuccess(false);

    // Simula tempo de escaneamento do sensor TrueDepth do iPhone (1.2s)
    return new Promise((resolve) => {
      setTimeout(() => {
        setFaceIdSuccess(true);
        setTimeout(() => {
          setIsLocked(false);
          setFaceIdActive(false);
          setFaceIdSuccess(false);

          AuditLoggerService.getInstance().log({
            action: 'Desbloqueio com Face ID realizado com sucesso',
            category: 'SECURITY',
            actor: { name: user.name, role: user.role, id: user.id },
            target: 'Dispositivo Móvel',
            details: { biometric: 'Apple Face ID TrueDepth', verified: true },
            status: 'SUCCESS',
          });

          resolve(true);
        }, 600);
      }, 1200);
    });
  }, [user]);

  // Autenticação por PIN
  const authenticateWithPin = useCallback(
    (enteredPin: string): boolean => {
      if (enteredPin === DEFAULT_PIN) {
        setIsLocked(false);
        setPinError(null);

        AuditLoggerService.getInstance().log({
          action: 'Desbloqueio por PIN de 6 dígitos realizado',
          category: 'SECURITY',
          actor: { name: user.name, role: user.role, id: user.id },
          target: 'Dispositivo Móvel',
          details: { method: 'PIN Fallback' },
          status: 'SUCCESS',
        });

        return true;
      } else {
        setPinError('Código PIN incorreto. Tente novamente.');
        return false;
      }
    },
    [user]
  );

  // Bloqueio Imediato Manual
  const lockSession = useCallback(() => {
    setIsLocked(true);
  }, []);

  // Bloqueio Remoto Emergencial da Fazenda
  const toggleEmergencyLock = useCallback(
    (enable: boolean, reason?: string) => {
      setIsEmergencyLocked(enable);
      AuditLoggerService.getInstance().log({
        action: enable ? 'BLOQUEIO REMOTO EMERGENCIAL ATIVADO' : 'Bloqueio emergencial desativado',
        category: 'SECURITY',
        actor: { name: user.name, role: user.role, id: user.id },
        target: 'Todas as Impressoras da Fazenda',
        details: { reason: reason || 'Comando manual via painel mobile', emergencyStop: enable },
        status: enable ? 'WARNING' : 'SUCCESS',
      });
    },
    [user]
  );

  return {
    user,
    isLocked,
    isEmergencyLocked,
    faceIdActive,
    faceIdSuccess,
    pinError,
    authenticateWithFaceId,
    authenticateWithPin,
    lockSession,
    toggleEmergencyLock,
  };
}
