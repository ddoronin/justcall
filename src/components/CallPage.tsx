import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createSignalingSocket,
  parseIceServers,
  sendSignal,
} from "../lib/signaling";
import type { CallStatus, ServerSignalMessage } from "../types/signaling";

const DEFAULT_ERROR = "Something went wrong. Please refresh and try again.";

export default function CallPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isInitiatorRef = useRef(false);
  const disconnectTimerRef = useRef<number | null>(null);
  const restartAttemptsRef = useRef(0);

  const [status, setStatus] = useState<CallStatus>("Preparing your camera...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);

  const inviteLink = useMemo(() => window.location.href, []);
  const validRoomId = roomId ?? "";

  useEffect(() => {
    if (!validRoomId) {
      navigate("/", { replace: true });
      return;
    }

    let isMounted = true;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!isMounted) return;

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = createPeerConnection(validRoomId);
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const socket = createSignalingSocket((message) => {
          void onServerMessage(message, validRoomId);
        });

        socketRef.current = socket;

        socket.addEventListener("open", () => {
          setErrorMessage(null);
          setStatus("Waiting for Mom to join");
          sendSignal(socket, { type: "join-room", roomId: validRoomId });
        });

        socket.addEventListener("close", () => {
          if (isMounted && status !== "Call ended") {
            setStatus("Call ended");
          }
        });
      } catch {
        setErrorMessage("Please allow camera and microphone to join the call.");
      }
    };

    void setup();

    return () => {
      isMounted = false;
      leaveCall(validRoomId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validRoomId]);

  async function onServerMessage(message: ServerSignalMessage, room: string) {
    const pc = pcRef.current;
    if (!pc) return;

    switch (message.type) {
      case "joined": {
        const initiator = Boolean(message.isInitiator);
        isInitiatorRef.current = initiator;
        setIsInitiator(initiator);
        setStatus(initiator ? "Waiting for Mom to join" : "Joining call...");
        break;
      }
      case "peer-joined": {
        if (!isInitiatorRef.current) break;
        setStatus("Connecting call...");
        await createAndSendOffer(room);
        break;
      }
      case "offer": {
        setStatus("Connecting call...");
        setErrorMessage(null);
        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        await flushQueuedCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendSignal(socketRef.current, {
          type: "answer",
          roomId: room,
          sdp: answer,
        });
        break;
      }
      case "answer": {
        setErrorMessage(null);
        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        await flushQueuedCandidates();
        break;
      }
      case "ice-candidate": {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(message.candidate);
        } else {
          queuedCandidatesRef.current.push(message.candidate);
        }
        break;
      }
      case "peer-left": {
        clearDisconnectTimer();
        restartAttemptsRef.current = 0;
        setStatus("Waiting for Mom to join");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        await resetPeerConnection(room);
        break;
      }
      case "room-full": {
        setErrorMessage("This call is full. Please ask for a new call link.");
        break;
      }
      case "error": {
        setErrorMessage(message.message || DEFAULT_ERROR);
        break;
      }
    }
  }

  function createPeerConnection(room: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: parseIceServers() });

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendSignal(socketRef.current, {
        type: "ice-candidate",
        roomId: room,
        candidate: event.candidate.toJSON(),
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        clearDisconnectTimer();
        restartAttemptsRef.current = 0;
        setErrorMessage(null);
        setStatus("Call connected");
      }
      if (pc.connectionState === "disconnected") {
        setStatus("Connecting call...");
        scheduleDisconnectRecovery(room);
      }
      if (pc.connectionState === "failed") {
        void attemptReconnect(room);
      }
      if (pc.connectionState === "closed") {
        clearDisconnectTimer();
        setStatus("Call ended");
      }
    };

    return pc;
  }

  async function createAndSendOffer(room: string) {
    const pc = pcRef.current;
    if (!pc) return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal(socketRef.current, {
      type: "offer",
      roomId: room,
      sdp: offer,
    });
  }

  function clearDisconnectTimer() {
    if (disconnectTimerRef.current !== null) {
      window.clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
  }

  function scheduleDisconnectRecovery(room: string) {
    clearDisconnectTimer();

    disconnectTimerRef.current = window.setTimeout(() => {
      void attemptReconnect(room);
    }, 8000);
  }

  async function attemptReconnect(room: string) {
    clearDisconnectTimer();

    const pc = pcRef.current;
    if (!pc || pc.signalingState === "closed") return;

    if (!isInitiatorRef.current) {
      setErrorMessage("Connection is unstable. Waiting for call recovery...");
      return;
    }

    if (restartAttemptsRef.current >= 2) {
      setErrorMessage(
        "Connection lost. Your network may block direct calls. Please refresh and try again.",
      );
      return;
    }

    restartAttemptsRef.current += 1;
    setStatus("Connecting call...");

    try {
      const restartOffer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(restartOffer);

      sendSignal(socketRef.current, {
        type: "offer",
        roomId: room,
        sdp: restartOffer,
      });
    } catch {
      setErrorMessage(
        "Connection lost. Your network may block direct calls. Please refresh and try again.",
      );
    }
  }

  async function flushQueuedCandidates() {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;

    const queued = [...queuedCandidatesRef.current];
    queuedCandidatesRef.current = [];

    for (const candidate of queued) {
      await pc.addIceCandidate(candidate);
    }
  }

  async function resetPeerConnection(room: string) {
    const existing = pcRef.current;
    if (existing) {
      existing.close();
    }

    clearDisconnectTimer();
    restartAttemptsRef.current = 0;

    const fresh = createPeerConnection(room);
    pcRef.current = fresh;

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => fresh.addTrack(track, stream));
    }
  }

  function copyInviteLink() {
    void navigator.clipboard.writeText(inviteLink);
  }

  function leaveCall(room: string) {
    clearDisconnectTimer();

    sendSignal(socketRef.current, { type: "leave", roomId: room });
    socketRef.current?.close();
    socketRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }

  const endCall = () => {
    leaveCall(validRoomId);
    navigate("/");
  };

  return (
    <main className="call-page">
      <section className="video-shell">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="remote-video"
        />
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="local-video"
        />
      </section>

      <section className="controls">
        <p className="status">{status}</p>
        {errorMessage ? <p className="error">{errorMessage}</p> : null}

        <div className="invite-row">
          <input value={inviteLink} readOnly />
          <button onClick={copyInviteLink}>Copy Link</button>
        </div>

        <button className="danger" onClick={endCall}>
          End Call
        </button>
      </section>
    </main>
  );
}
