import { useEffect, useState } from "react";
import { getToken } from "./api-client";
import { log } from "./logger";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5001";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private connectionChangeHandlers: Set<(connected: boolean) => void> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private activeTypingMatches: Set<string> = new Set();

  async connect(token?: string | null) {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    // Get token if not provided
    if (!token) {
      token = await getToken();
    }

    if (!token) {
      log.warn("No token available for WebSocket connection");
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    try {
      const wsUrl = `${API_BASE_URL.replace(/^http/, "ws")}/ws?token=${token}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        log.info("WebSocket connected");
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyConnectionChange(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handlers.forEach((handler) => handler(message));
        } catch (error) {
          log.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onclose = () => {
        log.info("WebSocket disconnected");
        this.isConnecting = false;
        this.ws = null;
        this.notifyConnectionChange(false);

        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        log.error("WebSocket error:", error);
        this.isConnecting = false;
      };
    } catch (error) {
      log.error("Failed to create WebSocket:", error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private async scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(async () => {
      if (this.shouldReconnect) {
        await this.connect();
      }
    }, delay);
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.activeTypingMatches.forEach((matchId) => {
      this.send({ type: "stop_typing", matchId });
    });
    this.activeTypingMatches.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      if (message.type === "typing" && message.matchId) {
        this.activeTypingMatches.add(message.matchId);
      } else if (message.type === "stop_typing" && message.matchId) {
        this.activeTypingMatches.delete(message.matchId);
      }
    } else {
      log.warn("WebSocket not connected, cannot send message");
    }
  }

  addHandler(handler: MessageHandler) {
    this.handlers.add(handler);
  }

  removeHandler(handler: MessageHandler) {
    this.handlers.delete(handler);
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private notifyConnectionChange(connected: boolean) {
    this.connectionChangeHandlers.forEach((handler) => handler(connected));
  }

  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionChangeHandlers.add(handler);
    return () => { this.connectionChangeHandlers.delete(handler); };
  }
}

export const wsManager = new WebSocketManager();

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(wsManager.isConnected);

  useEffect(() => {
    wsManager.connect();

    const unsubscribe = wsManager.onConnectionChange(setIsConnected);

    return () => {
      unsubscribe();
    };
  }, []);

  return { isConnected, send: wsManager.send.bind(wsManager) };
}

export function useWebSocketMessages(onMessage: MessageHandler) {
  useEffect(() => {
    wsManager.addHandler(onMessage);
    return () => {
      wsManager.removeHandler(onMessage);
    };
  }, [onMessage]);
}
