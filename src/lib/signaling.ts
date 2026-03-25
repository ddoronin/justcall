import type {
  ClientSignalMessage,
  ServerSignalMessage,
} from "../types/signaling";

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
];

export function createSignalingSocket(
  onMessage: (message: ServerSignalMessage) => void,
): WebSocket {
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const defaultWsUrl = isLocalhost
    ? "ws://localhost:8080/ws"
    : "wss://justcall-singapore.onrender.com/ws";
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
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  const configuredTurnServer =
    turnUrl && turnUsername && turnCredential
      ? [
          {
            urls: turnUrl,
            username: turnUsername,
            credential: turnCredential,
          } as RTCIceServer,
        ]
      : [];

  if (!configured) {
    return [...DEFAULT_ICE_SERVERS, ...configuredTurnServer];
  }

  try {
    const parsed = JSON.parse(configured) as RTCIceServer[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return [...parsed, ...configuredTurnServer];
    }

    return [...DEFAULT_ICE_SERVERS, ...configuredTurnServer];
  } catch {
    return [...DEFAULT_ICE_SERVERS, ...configuredTurnServer];
  }
}
