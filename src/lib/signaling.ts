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
  const defaultWsUrl = "wss://justcall-singapore.onrender.com/ws";
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

  const sanitizeIceServers = (servers: RTCIceServer[]): RTCIceServer[] => {
    return servers.filter((server) => {
      if (!server || !server.urls) return false;

      if (typeof server.urls === "string") {
        return server.urls.trim().length > 0;
      }

      if (Array.isArray(server.urls)) {
        return server.urls.some(
          (url) => typeof url === "string" && url.trim().length > 0,
        );
      }

      return false;
    });
  };

  if (!configured) {
    return sanitizeIceServers([
      ...DEFAULT_ICE_SERVERS,
      ...configuredTurnServer,
    ]);
  }

  try {
    const parsed = JSON.parse(configured) as RTCIceServer[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return sanitizeIceServers([...parsed, ...configuredTurnServer]);
    }

    return sanitizeIceServers([
      ...DEFAULT_ICE_SERVERS,
      ...configuredTurnServer,
    ]);
  } catch {
    return sanitizeIceServers([
      ...DEFAULT_ICE_SERVERS,
      ...configuredTurnServer,
    ]);
  }
}
