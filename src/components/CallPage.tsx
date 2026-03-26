import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Copy,
  FlipHorizontal,
  Mic,
  MicOff,
  PhoneOff,
  Share2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createSignalingSocket,
  parseIceServers,
  resolveIceServers,
  sendSignal,
} from "../lib/signaling";
import type { CallStatus, ServerSignalMessage } from "../types/signaling";

const DEFAULT_ERROR = "Something went wrong. Please refresh and try again.";
type CameraMode = "front" | "back";

function isTruthyEnvFlag(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function getVideoConstraintCandidates(
  mode: CameraMode,
): Array<boolean | MediaTrackConstraints> {
  if (mode === "back") {
    return [
      { facingMode: { exact: "environment" } },
      { facingMode: "environment" },
      true,
    ];
  }

  return [{ facingMode: "user" }, true];
}

export default function CallPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const resolvedIceServersRef = useRef<RTCIceServer[]>(parseIceServers());
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaStartPromiseRef = useRef<Promise<boolean> | null>(null);
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isInitiatorRef = useRef(false);
  const hasAutoOpenedInviteRef = useRef(false);
  const disconnectTimerRef = useRef<number | null>(null);
  const restartAttemptsRef = useRef(0);

  const [status, setStatus] = useState<CallStatus>("Preparing your camera...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);
  const [canRetryMedia, setCanRetryMedia] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("front");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [hasRemoteParticipant, setHasRemoteParticipant] = useState(false);

  const validRoomId = roomId ?? "";
  const inviteLink = useMemo(
    () => `${window.location.origin}/call/${validRoomId}`,
    [validRoomId],
  );

  function stopStream(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop());
  }

  async function attachLocalMedia(mode: CameraMode) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new DOMException(
        "This browser does not support camera access",
        "NotSupportedError",
      );
    }

    let lastError: unknown;

    for (const videoConstraint of getVideoConstraintCandidates(mode)) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: true,
        });
      } catch {
        try {
          return await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            audio: false,
          });
        } catch (error) {
          lastError = error;
        }
      }
    }

    throw lastError;
  }

  function getMediaErrorMessage(error: unknown): string {
    const mediaError = error as DOMException;

    if (mediaError?.name === "NotAllowedError") {
      return "Camera/microphone permission was denied. Click Enable Camera below after allowing access in browser settings.";
    }
    if (mediaError?.name === "NotFoundError") {
      return "No camera was found on this device.";
    }
    if (mediaError?.name === "NotReadableError") {
      return "Camera is busy in another app. Close other apps using camera and try again.";
    }
    if (mediaError?.name === "SecurityError") {
      return "Camera is blocked by browser security settings.";
    }

    return "Could not start camera/microphone. Click Enable Camera to try again.";
  }

  function syncLocalTracksToPeerConnection(
    pc: RTCPeerConnection,
    stream: MediaStream,
  ) {
    stream.getTracks().forEach((track) => {
      const sender = pc
        .getSenders()
        .find((existingSender) => existingSender.track?.kind === track.kind);

      if (sender) {
        void sender.replaceTrack(track);
      } else {
        pc.addTrack(track, stream);
      }
    });
  }

  function applyMediaPreferenceToStream(stream: MediaStream) {
    const audioEnabled = !isMuted;
    const videoEnabled = !isVideoOff;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = audioEnabled;
    });

    stream.getVideoTracks().forEach((track) => {
      track.enabled = videoEnabled;
    });
  }

  async function startLocalMedia(
    mode: CameraMode = cameraMode,
  ): Promise<boolean> {
    const pc = pcRef.current;
    if (!pc) return false;

    try {
      const stream = await attachLocalMedia(mode);
      const previousStream = localStreamRef.current;

      applyMediaPreferenceToStream(stream);

      localStreamRef.current = stream;
      setCanRetryMedia(false);
      setErrorMessage(null);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        void localVideoRef.current.play().catch(() => {
          // ignore autoplay promise rejections
        });
      }

      syncLocalTracksToPeerConnection(pc, stream);

      if (previousStream && previousStream.id !== stream.id) {
        stopStream(previousStream);
      }

      return true;
    } catch (error) {
      setCanRetryMedia(true);
      setErrorMessage(getMediaErrorMessage(error));
      return false;
    }
  }

  async function ensureLocalMediaStarted(): Promise<boolean> {
    if (localStreamRef.current) return true;

    if (!mediaStartPromiseRef.current) {
      mediaStartPromiseRef.current = startLocalMedia().finally(() => {
        mediaStartPromiseRef.current = null;
      });
    }

    return mediaStartPromiseRef.current;
  }

  useEffect(() => {
    if (!shareNotice) return;

    const timer = window.setTimeout(() => {
      setShareNotice(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [shareNotice]);

  useEffect(() => {
    if (!validRoomId) {
      navigate("/", { replace: true });
      return;
    }

    let isMounted = true;
    setHasRemoteParticipant(false);
    setStatus("Joining call...");

    const setup = async () => {
      try {
        const iceServers = await resolveIceServers();
        resolvedIceServersRef.current = iceServers;

        const pc = createPeerConnection(validRoomId, iceServers);
        pcRef.current = pc;

        const socket = createSignalingSocket((message) => {
          void onServerMessage(message, validRoomId);
        });

        socketRef.current = socket;

        socket.addEventListener("open", () => {
          setErrorMessage(null);
          setStatus("Waiting for Mom to join");
          sendSignal(socket, { type: "join-room", roomId: validRoomId });
        });

        socket.addEventListener("error", () => {
          if (!isMounted) return;
          setStatus("Call ended");
          setErrorMessage(
            "Could not reach the call server. Please refresh and try again.",
          );
        });

        socket.addEventListener("close", () => {
          if (isMounted) {
            setStatus("Call ended");
          }
        });

        if (!isMounted) return;
        await ensureLocalMediaStarted();
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(DEFAULT_ERROR);
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
        if (initiator && !hasAutoOpenedInviteRef.current) {
          hasAutoOpenedInviteRef.current = true;
          setShowInviteModal(true);
        }
        break;
      }
      case "peer-joined": {
        setHasRemoteParticipant(true);
        if (!isInitiatorRef.current) break;
        setStatus("Connecting call...");
        await ensureLocalMediaStarted();
        await createAndSendOffer(room);
        break;
      }
      case "offer": {
        setHasRemoteParticipant(true);
        setStatus("Connecting call...");
        setErrorMessage(null);

        await ensureLocalMediaStarted();

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
        setHasRemoteParticipant(true);
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
        setHasRemoteParticipant(false);
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

  function createPeerConnection(
    room: string,
    iceServers: RTCIceServer[],
  ): RTCPeerConnection {
    let pc: RTCPeerConnection;

    try {
      pc = new RTCPeerConnection({
        iceServers,
        ...(isTruthyEnvFlag(import.meta.env.VITE_FORCE_RELAY)
          ? { iceTransportPolicy: "relay" as RTCIceTransportPolicy }
          : {}),
      });
    } catch {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      setErrorMessage(
        "Using fallback network settings. If calls fail, check ICE/TURN env values.",
      );
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteVideoRef.current && stream) {
        setHasRemoteParticipant(true);
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

    const fresh = createPeerConnection(room, resolvedIceServersRef.current);
    pcRef.current = fresh;

    const stream = localStreamRef.current;
    if (stream) {
      syncLocalTracksToPeerConnection(fresh, stream);
    }
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setShareNotice("Invite link copied.");
    } catch {
      setShareNotice("Could not copy link. Please copy it manually.");
    }
  }

  async function shareInviteLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my JustCall",
          text: "Join my video call",
          url: inviteLink,
        });
        setShareNotice("Share opened.");
        return;
      } catch {
        // fallback to clipboard below
      }
    }

    await copyInviteLink();
  }

  async function switchCamera() {
    if (isSwitchingCamera) return;

    const nextMode: CameraMode = cameraMode === "front" ? "back" : "front";
    const previousStatus = status;

    setIsSwitchingCamera(true);
    setStatus("Connecting call...");

    const started = await startLocalMedia(nextMode);

    if (started) {
      setCameraMode(nextMode);
      setStatus(previousStatus);
    } else {
      setStatus(previousStatus);
    }

    setIsSwitchingCamera(false);
  }

  async function toggleMute() {
    const stream = localStreamRef.current;
    const nextMuted = !isMuted;

    if (!stream) {
      setIsMuted(nextMuted);
      return;
    }

    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    setIsMuted(nextMuted);
  }

  async function toggleVideo() {
    const stream = localStreamRef.current;
    const nextVideoOff = !isVideoOff;

    if (!stream || stream.getVideoTracks().length === 0) {
      const started = await startLocalMedia(cameraMode);
      if (started) {
        setIsVideoOff(false);
      }
      return;
    }

    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextVideoOff;
    });

    setIsVideoOff(nextVideoOff);
  }

  function leaveCall(room: string) {
    clearDisconnectTimer();

    sendSignal(socketRef.current, { type: "leave", roomId: room });
    socketRef.current?.close();
    socketRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    stopStream(localStreamRef.current);
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

        <div className="top-overlay">
          <div className="glass status-pill">{status}</div>
        </div>

        {errorMessage ? (
          <p className="glass error-banner" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {shareNotice ? (
          <p className="glass share-notice">{shareNotice}</p>
        ) : null}

        {!hasRemoteParticipant ? (
          <div className="invite-center-wrap" role="status" aria-live="polite">
            <div className="glass invite-center-card">
              <button
                className="glass primary invite-center-button"
                onClick={() => void shareInviteLink()}
                aria-label="Share invite link"
              >
                <Share2 className="invite-cta-icon" aria-hidden="true" />
                <span>Share call invite</span>
              </button>

              <div className="invite-link-row">
                <p className="invite-center-url" title={inviteLink}>
                  {inviteLink}
                </p>
                <button
                  className="glass icon-button invite-copy-button"
                  onClick={() => void copyInviteLink()}
                  aria-label="Copy invite link"
                >
                  <Copy className="invite-copy-icon" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="local-preview">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`local-video ${cameraMode === "front" ? "mirrored" : ""}`}
          />
        </div>

        <div className="controls-float glass">
          <button
            className={`glass icon-button control-button ${isVideoOff ? "is-active" : ""}`}
            onClick={() => void toggleVideo()}
            aria-pressed={isVideoOff}
            aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
          >
            {isVideoOff ? (
              <CameraOff className="control-icon" aria-hidden="true" />
            ) : (
              <Camera className="control-icon" aria-hidden="true" />
            )}
            <span className="control-label">
              {isVideoOff ? "Camera On" : "Camera Off"}
            </span>
          </button>
          <button
            className={`glass icon-button control-button ${isMuted ? "is-active" : ""}`}
            onClick={() => void toggleMute()}
            aria-pressed={isMuted}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? (
              <MicOff className="control-icon" aria-hidden="true" />
            ) : (
              <Mic className="control-icon" aria-hidden="true" />
            )}
            <span className="control-label">{isMuted ? "Unmute" : "Mute"}</span>
          </button>
          <button
            className="glass icon-button control-button"
            onClick={() => void switchCamera()}
            disabled={isSwitchingCamera}
            aria-label="Flip camera"
          >
            <FlipHorizontal className="control-icon" aria-hidden="true" />
            <span className="control-label">
              {isSwitchingCamera ? "Flipping..." : "Flip"}
            </span>
          </button>
          <button
            className="glass danger icon-button control-button end-button"
            onClick={endCall}
            aria-label="End call"
          >
            <PhoneOff className="control-icon" aria-hidden="true" />
            <span className="control-label">End</span>
          </button>
        </div>
      </section>

      {showInviteModal ? (
        <section
          className="modal-backdrop"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="modal glass"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Share this call</h2>
            <p>Send this link so they can join instantly.</p>
            <input value={inviteLink} readOnly />
            <div className="modal-actions">
              <button
                className="glass icon-button"
                onClick={() => void copyInviteLink()}
              >
                Copy
              </button>
              <button
                className="glass primary share-button"
                onClick={() => void shareInviteLink()}
              >
                Share
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
