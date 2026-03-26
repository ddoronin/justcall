import type { CallStatus } from "./signaling";

export type CallSessionState = {
  status: CallStatus;
  errorMessage: string | null;
  hasRemoteParticipant: boolean;
  isInitiator: boolean;
};

export type CallSessionAction =
  | { type: "set-status"; status: CallStatus }
  | { type: "set-error"; errorMessage: string | null }
  | { type: "set-has-remote-participant"; hasRemoteParticipant: boolean }
  | { type: "set-is-initiator"; isInitiator: boolean }
  | { type: "reset-for-room-join" };

export const initialCallSessionState: CallSessionState = {
  status: "call.status.preparingCamera",
  errorMessage: null,
  hasRemoteParticipant: false,
  isInitiator: false,
};
