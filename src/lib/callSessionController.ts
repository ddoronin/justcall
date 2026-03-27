import { sendSignal } from "./signaling";
import type { MutableRefObject } from "react";
import type { CallStatus, ServerSignalMessage } from "../types/signaling";

type ControllerMessages = {
  fallbackNetwork: string;
  unstableConnection: string;
  connectionLost: string;
  roomFull: string;
  defaultError: string;
};

type CallSessionControllerDeps = {
  socketRef: MutableRefObject<WebSocket | null>;
  pcRef: MutableRefObject<RTCPeerConnection | null>;
  resolvedIceServersRef: MutableRefObject<RTCIceServer[]>;
  localStreamRef: MutableRefObject<MediaStream | null>;
  queuedCandidatesRef: MutableRefObject<RTCIceCandidateInit[]>;
  isInitiatorRef: MutableRefObject<boolean>;
  disconnectTimerRef: MutableRefObject<number | null>;
  restartAttemptsRef: MutableRefObject<number>;
  remoteVideoRef: MutableRefObject<HTMLVideoElement | null>;
  forceRelay: boolean;
  messages: ControllerMessages;
  setStatus: (status: CallStatus) => void;
  setErrorMessage: (errorMessage: string | null) => void;
  setIsInitiator: (isInitiator: boolean) => void;
  setHasRemoteParticipant: (hasRemoteParticipant: boolean) => void;
  resetRemoteTransform: () => void;
  ensureLocalMediaStarted: () => Promise<boolean>;
  syncLocalTracksToPeerConnection: (
    pc: RTCPeerConnection,
    stream: MediaStream,
  ) => void;
};

function isTruthyEnvFlag(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function createCallSessionController(deps: CallSessionControllerDeps) {
  function clearDisconnectTimer() {
    if (deps.disconnectTimerRef.current !== null) {
      window.clearTimeout(deps.disconnectTimerRef.current);
      deps.disconnectTimerRef.current = null;
    }
  }

  async function flushQueuedCandidates() {
    const pc = deps.pcRef.current;
    if (!pc || !pc.remoteDescription) return;

    const queued = [...deps.queuedCandidatesRef.current];
    deps.queuedCandidatesRef.current = [];

    for (const candidate of queued) {
      await pc.addIceCandidate(candidate);
    }
  }

  async function createAndSendOffer(room: string) {
    const pc = deps.pcRef.current;
    if (!pc) return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal(deps.socketRef.current, {
      type: "offer",
      roomId: room,
      sdp: offer,
    });
  }

  async function attemptReconnect(room: string) {
    clearDisconnectTimer();

    const pc = deps.pcRef.current;
    if (!pc || pc.signalingState === "closed") return;

    if (!deps.isInitiatorRef.current) {
      deps.setErrorMessage(deps.messages.unstableConnection);
      return;
    }

    if (deps.restartAttemptsRef.current >= 2) {
      deps.setErrorMessage(deps.messages.connectionLost);
      return;
    }

    deps.restartAttemptsRef.current += 1;
    deps.setStatus("call.status.webrtc.connecting");

    try {
      const restartOffer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(restartOffer);

      sendSignal(deps.socketRef.current, {
        type: "offer",
        roomId: room,
        sdp: restartOffer,
      });
    } catch {
      deps.setErrorMessage(deps.messages.connectionLost);
    }
  }

  function scheduleDisconnectRecovery(room: string) {
    clearDisconnectTimer();

    deps.disconnectTimerRef.current = window.setTimeout(() => {
      void attemptReconnect(room);
    }, 8000);
  }

  function createPeerConnection(
    room: string,
    iceServers: RTCIceServer[],
  ): RTCPeerConnection {
    let pc: RTCPeerConnection;

    try {
      pc = new RTCPeerConnection({
        iceServers,
        ...(deps.forceRelay
          ? { iceTransportPolicy: "relay" as RTCIceTransportPolicy }
          : {}),
      });
    } catch {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (deps.remoteVideoRef.current && stream) {
        deps.setHasRemoteParticipant(true);
        deps.remoteVideoRef.current.srcObject = stream;
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendSignal(deps.socketRef.current, {
        type: "ice-candidate",
        roomId: room,
        candidate: event.candidate.toJSON(),
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        clearDisconnectTimer();
        deps.restartAttemptsRef.current = 0;
        deps.setErrorMessage(null);
        deps.setStatus("call.status.connected");
      }
      if (pc.connectionState === "disconnected") {
        deps.setStatus("call.status.webrtc.connecting");
        scheduleDisconnectRecovery(room);
      }
      if (pc.connectionState === "failed") {
        void attemptReconnect(room);
      }
      if (pc.connectionState === "closed") {
        clearDisconnectTimer();
        deps.setStatus("call.status.ended");
      }
    };

    return pc;
  }

  async function handleServerMessage(
    message: ServerSignalMessage,
    room: string,
  ) {
    const pc = deps.pcRef.current;
    if (!pc) return;

    if ("roomId" in message && message.roomId !== room) {
      return;
    }

    switch (message.type) {
      case "joined": {
        const initiator = Boolean(message.isInitiator);
        deps.isInitiatorRef.current = initiator;
        deps.setIsInitiator(initiator);
        deps.setStatus(
          initiator
            ? "call.status.webrtc.waitingParticipant"
            : "call.status.webrtc.connecting",
        );
        break;
      }
      case "peer-joined": {
        deps.setHasRemoteParticipant(true);
        if (!deps.isInitiatorRef.current) break;
        deps.setStatus("call.status.webrtc.connecting");
        await deps.ensureLocalMediaStarted();
        await createAndSendOffer(room);
        break;
      }
      case "offer": {
        deps.setHasRemoteParticipant(true);
        deps.setStatus("call.status.webrtc.connecting");
        deps.setErrorMessage(null);

        await deps.ensureLocalMediaStarted();

        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        await flushQueuedCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendSignal(deps.socketRef.current, {
          type: "answer",
          roomId: room,
          sdp: answer,
        });
        break;
      }
      case "answer": {
        deps.setHasRemoteParticipant(true);
        deps.setErrorMessage(null);
        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        await flushQueuedCandidates();
        break;
      }
      case "ice-candidate": {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(message.candidate);
        } else {
          deps.queuedCandidatesRef.current.push(message.candidate);
        }
        break;
      }
      case "peer-left": {
        deps.setHasRemoteParticipant(false);
        deps.resetRemoteTransform();
        clearDisconnectTimer();
        deps.restartAttemptsRef.current = 0;
        deps.setStatus("call.status.ended");
        if (deps.remoteVideoRef.current) {
          deps.remoteVideoRef.current.srcObject = null;
        }
        break;
      }
      case "room-full": {
        deps.setErrorMessage(deps.messages.roomFull);
        break;
      }
      case "error": {
        deps.setErrorMessage(message.message || deps.messages.defaultError);
        break;
      }
    }
  }

  function dispose(room: string) {
    clearDisconnectTimer();

    sendSignal(deps.socketRef.current, { type: "leave", roomId: room });
    deps.socketRef.current?.close();
    deps.socketRef.current = null;

    deps.pcRef.current?.close();
    deps.pcRef.current = null;

    stopStream(deps.localStreamRef.current);
    deps.localStreamRef.current = null;
  }

  return {
    createPeerConnection,
    handleServerMessage,
    dispose,
    clearDisconnectTimer,
  };
}

export function shouldForceRelayTransport() {
  return isTruthyEnvFlag(import.meta.env.VITE_FORCE_RELAY);
}
