import type {
  ClientSignalMessage,
  ServerSignalMessage,
} from "../types/signaling";

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
];

type TurnCredentialsResponse = {
  iceServers?: RTCIceServer[];
};

function sanitizeIceServers(servers: RTCIceServer[]): RTCIceServer[] {
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
}

export function createSignalingSocket(
  onMessage: (message: ServerSignalMessage) => void,
): WebSocket {
  const configuredWsUrl = import.meta.env.VITE_SIGNALING_WS_URL?.trim();
  const defaultWsUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`
      : "ws://localhost:8080/ws";
  const wsUrl =
    configuredWsUrl && configuredWsUrl.length > 0
      ? configuredWsUrl
      : defaultWsUrl;
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

export async function resolveIceServers(): Promise<RTCIceServer[]> {
  const fallbackIceServers = parseIceServers();
  const credentialsUrl = import.meta.env.VITE_TURN_CREDENTIALS_URL?.trim();

  if (!credentialsUrl) {
    return fallbackIceServers;
  }

  const requestedTtl = Number(
    import.meta.env.VITE_TURN_CREDENTIALS_TTL_SECONDS,
  );
  const payload =
    Number.isFinite(requestedTtl) && requestedTtl > 0
      ? { ttl: requestedTtl }
      : {};

  try {
    const response = await fetch(credentialsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return fallbackIceServers;
    }

    const parsed = (await response.json()) as TurnCredentialsResponse;
    const managedIceServers = Array.isArray(parsed.iceServers)
      ? sanitizeIceServers(parsed.iceServers)
      : [];

    return managedIceServers.length > 0
      ? managedIceServers
      : fallbackIceServers;
  } catch {
    return fallbackIceServers;
  }
}
