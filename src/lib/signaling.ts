import type {
  ClientSignalMessage,
  ServerSignalMessage,
} from "../types/signaling";

export function createSignalingSocket(
  onMessage: (message: ServerSignalMessage) => void,
): WebSocket {
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const defaultWsUrl = isLocalhost
    ? "ws://localhost:8080/ws"
    : "wss://justcall-amd64.onrender.com/ws";
  const wsUrl = import.meta.env.VITE_SIGNALING_WS_URL ?? defaultWsUrl;
  const socket = new WebSocket(wsUrl);

  socket.addEventListener("message", (event) => {
    try {
      const parsed = JSON.parse(String(event.data)) as ServerSignalMessage;
      onMessage(parsed);
    } catch {
      // ignore malformed payloads
    }
  });

  return socket;
}

export function sendSignal(
  socket: WebSocket | null,
  message: ClientSignalMessage,
): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
}

export function parseIceServers(): RTCIceServer[] {
  const configured = import.meta.env.VITE_ICE_SERVERS;

  if (!configured) {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }

  try {
    const parsed = JSON.parse(configured) as RTCIceServer[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : [{ urls: "stun:stun.l.google.com:19302" }];
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
}
