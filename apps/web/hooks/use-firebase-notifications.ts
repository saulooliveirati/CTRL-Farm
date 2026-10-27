"use client";

import { useEffect, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getMessagingInstance, isFirebaseClientConfigured } from "@/lib/firebase";

export interface PushNotificationMessage {
  title?: string;
  body?: string;
  icon?: string;
  data?: Record<string, any>;
}

export function useFirebaseNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [latestMessage, setLatestMessage] = useState<PushNotificationMessage | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  async function requestNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === "granted" && isFirebaseClientConfigured()) {
        const messaging = await getMessagingInstance();
        if (messaging) {
          const fcmToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          });

          if (fcmToken) {
            setToken(fcmToken);
            // Registra token na API do CTRL-Farm
            await fetch("/api/firebase/fcm/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: fcmToken }),
            });
            return true;
          }
        }
      }
      return perm === "granted";
    } catch (err) {
      console.warn("[Firebase FCM] Erro ao solicitar permissão de notificações:", err);
      return false;
    }
  }

  // Ouvinte de mensagens no primeiro plano (Foreground)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initListener() {
      if (!isFirebaseClientConfigured()) return;
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      unsubscribe = onMessage(messaging, (payload) => {
        if (payload.notification) {
          setLatestMessage({
            title: payload.notification.title,
            body: payload.notification.body,
            icon: payload.notification.icon,
            data: payload.data,
          });
        }
      });
    }

    initListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return {
    permission,
    token,
    latestMessage,
    requestNotificationPermission,
  };
}
