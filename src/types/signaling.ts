export type ClientSignalMessage =
  | { type: "join-room"; roomId: string }
  | { type: "offer"; roomId: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; roomId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; roomId: string; candidate: RTCIceCandidateInit }
  | { type: "leave"; roomId: string };

export type ServerSignalMessage =
  | {
      type: "joined";
      roomId: string;
      participantId: string;
      isInitiator: boolean;
    }
  | { type: "peer-joined"; roomId: string }
  | { type: "offer"; roomId: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; roomId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; roomId: string; candidate: RTCIceCandidateInit }
  | { type: "peer-left"; roomId: string }
  | { type: "room-full"; roomId: string }
  | { type: "error"; message: string };

export type CallStatus =
  | "call.status.camera.requestingPermissions"
  | "call.status.camera.initializing"
  | "call.status.camera.ready"
  | "call.status.webrtc.connecting"
  | "call.status.webrtc.waitingParticipant"
  | "call.status.connected"
  | "call.status.ended";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasStringField(
  payload: Record<string, unknown>,
  key: string,
): boolean {
  return typeof payload[key] === "string" && payload[key].length > 0;
}

function hasSdpField(payload: Record<string, unknown>): boolean {
  return isObjectRecord(payload.sdp);
}

function hasCandidateField(payload: Record<string, unknown>): boolean {
  return isObjectRecord(payload.candidate);
}

export function isServerSignalMessage(
  value: unknown,
): value is ServerSignalMessage {
  if (!isObjectRecord(value)) return false;
  if (!hasStringField(value, "type")) return false;

  switch (value.type) {
    case "joined":
      return (
        hasStringField(value, "roomId") &&
        hasStringField(value, "participantId") &&
        typeof value.isInitiator === "boolean"
      );
    case "peer-joined":
    case "peer-left":
    case "room-full":
      return hasStringField(value, "roomId");
    case "offer":
    case "answer":
      return hasStringField(value, "roomId") && hasSdpField(value);
    case "ice-candidate":
      return hasStringField(value, "roomId") && hasCandidateField(value);
    case "error":
      return typeof value.message === "string";
    default:
      return false;
  }
}
