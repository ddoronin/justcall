import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type TouchEvent,
} from "react";
import {
  Video,
  VideoOff,
  Copy,
  SwitchCamera,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Phone,
  Share2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createSignalingSocket,
  parseIceServers,
  resolveIceServers,
  sendSignal,
} from "../lib/signaling";
import SelfViewContainer from "./SelfViewContainer";
import { useI18n } from "../i18n/provider";
import type { TranslationKey } from "../i18n/types";
import type { CallStatus, ServerSignalMessage } from "../types/signaling";

const DEFAULT_ERROR_KEY: TranslationKey = "call.error.default";
type CameraMode = "front" | "back";
type RemoteViewMode = "fill" | "fit";
type SelfViewCorner = "top-right" | "top-left" | "bottom-right" | "bottom-left";
type Rect = { left: number; top: number; right: number; bottom: number };

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
  const { t } = useI18n();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteGestureLayerRef = useRef<HTMLDivElement | null>(null);
  const selfViewRef = useRef<HTMLDivElement | null>(null);

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
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const panStartTouchRef = useRef<{ x: number; y: number } | null>(null);
  const panStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const selfViewIdleTimerRef = useRef<number | null>(null);
  const selfViewDragRef = useRef<{
    pointerId: number;
    pointerType: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const suppressSelfViewTapRef = useRef(false);
  const selfViewTapRef = useRef<{ time: number; x: number; y: number } | null>(
    null,
  );
  const selfViewCompactStateRef = useRef<{
    corner: SelfViewCorner;
    position: { x: number; y: number } | null;
  }>({
    corner: "top-right",
    position: null,
  });

  const [status, setStatus] = useState<CallStatus>(
    "call.status.preparingCamera",
  );
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
  const [remoteViewMode, setRemoteViewMode] = useState<RemoteViewMode>("fill");
  const [remoteZoomScale, setRemoteZoomScale] = useState(1);
  const [isPinchingRemote, setIsPinchingRemote] = useState(false);
  const [isPanningRemote, setIsPanningRemote] = useState(false);
  const [remotePanOffset, setRemotePanOffset] = useState({ x: 0, y: 0 });
  const [localAspectRatio, setLocalAspectRatio] = useState(16 / 9);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const [selfViewCorner, setSelfViewCorner] =
    useState<SelfViewCorner>("top-right");
  const [selfViewPosition, setSelfViewPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDraggingSelfView, setIsDraggingSelfView] = useState(false);
  const [isSelfViewExpanded, setIsSelfViewExpanded] = useState(false);
  const [isSelfViewHidden, setIsSelfViewHidden] = useState(false);
  const [isSelfViewIdle, setIsSelfViewIdle] = useState(false);

  const validRoomId = roomId ?? "";
  const isMobileViewport = viewportSize.width <= 760;
  const inviteLink = useMemo(
    () => `${window.location.origin}/call/${validRoomId}`,
    [validRoomId],
  );

  function stopStream(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop());
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  function getTouchDistance(touches: {
    length: number;
    [index: number]: { clientX: number; clientY: number };
  }): number {
    if (touches.length < 2) return 0;

    const first = touches[0];
    const second = touches[1];
    return Math.hypot(
      second.clientX - first.clientX,
      second.clientY - first.clientY,
    );
  }

  function getSelfViewDimensions(expanded: boolean): {
    width: number;
    height: number;
  } {
    const compactTargetRatio = isMobileViewport ? 0.24 : 0.17;
    const compactWidth = clamp(
      viewportSize.width * compactTargetRatio,
      isMobileViewport ? 122 : 140,
      isMobileViewport ? 172 : 220,
    );
    const expandedWidth = clamp(
      viewportSize.width * 0.36,
      220,
      isMobileViewport ? 320 : 460,
    );
    const width = expanded ? expandedWidth : compactWidth;
    const height = width / localAspectRatio;
    return { width, height };
  }

  function getSelfViewSafeBounds() {
    return {
      margin: 14,
      top: isMobileViewport ? 84 : 74,
      bottom: isMobileViewport ? 164 : 18,
    };
  }

  function getSelfViewRect(
    position: { x: number; y: number },
    width: number,
    height: number,
  ): Rect {
    return {
      left: position.x,
      top: position.y,
      right: position.x + width,
      bottom: position.y + height,
    };
  }

  function getRectOverlapArea(first: Rect, second: Rect): number {
    const overlapWidth = Math.max(
      0,
      Math.min(first.right, second.right) - Math.max(first.left, second.left),
    );
    const overlapHeight = Math.max(
      0,
      Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
    );
    return overlapWidth * overlapHeight;
  }

  function getSelfViewAvoidRects(): Rect[] {
    const safeTop = Math.max(
      12,
      Number.parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--safe-top-fallback",
        ) || "0",
        10,
      ) || 0,
    );
    const controlsBottomInset = isMobileViewport ? 12 : 18;
    const controlsHeight = isMobileViewport ? 70 : 226;
    const controlsTop = isMobileViewport
      ? viewportSize.height - controlsBottomInset - controlsHeight
      : (viewportSize.height - controlsHeight) / 2;
    const controlsLeft = isMobileViewport
      ? 12
      : viewportSize.width - 14 - Math.min(190, viewportSize.width * 0.28);
    const controlsWidth = isMobileViewport
      ? viewportSize.width - 24
      : Math.min(190, viewportSize.width * 0.28);
    const viewModeWidth = isMobileViewport ? 150 : 176;
    const viewModeHeight = isMobileViewport ? 44 : 46;
    const viewModeBottom = isMobileViewport ? 98 : 18;
    const viewModeTop = viewportSize.height - viewModeBottom - viewModeHeight;

    const rects: Rect[] = [
      {
        left: 12,
        top: safeTop,
        right: 12 + Math.min(420, viewportSize.width * 0.68),
        bottom: safeTop + 44,
      },
      {
        left: controlsLeft,
        top: controlsTop,
        right: controlsLeft + controlsWidth,
        bottom: controlsTop + controlsHeight,
      },
      {
        left: (viewportSize.width - viewModeWidth) / 2,
        top: viewModeTop,
        right: (viewportSize.width + viewModeWidth) / 2,
        bottom: viewModeTop + viewModeHeight,
      },
    ];

    if (errorMessage) {
      rects.push({
        left: 12,
        top: Math.max(72, safeTop + 60),
        right: viewportSize.width - 12,
        bottom: Math.max(72, safeTop + 60) + 56,
      });
    }

    if (shareNotice) {
      const shareBottomInset = isMobileViewport ? 178 : 96;
      const shareTop = viewportSize.height - shareBottomInset - 48;
      rects.push({
        left: 12,
        top: shareTop,
        right: viewportSize.width - 12,
        bottom: shareTop + 48,
      });
    }

    return rects;
  }

  function clampSelfViewPosition(
    position: { x: number; y: number },
    width: number,
    height: number,
  ): { x: number; y: number } {
    const safe = getSelfViewSafeBounds();

    const minX = safe.margin;
    const maxX = Math.max(minX, viewportSize.width - safe.margin - width);
    const minY = safe.top;
    const maxY = Math.max(minY, viewportSize.height - safe.bottom - height);

    return {
      x: clamp(position.x, minX, maxX),
      y: clamp(position.y, minY, maxY),
    };
  }

  function getSelfViewCornerPosition(
    corner: SelfViewCorner,
    width: number,
    height: number,
  ): { x: number; y: number } {
    const safe = getSelfViewSafeBounds();
    const right = Math.max(
      safe.margin,
      viewportSize.width - safe.margin - width,
    );
    const bottom = Math.max(
      safe.top,
      viewportSize.height - safe.bottom - height,
    );

    switch (corner) {
      case "top-left":
        return { x: safe.margin, y: safe.top };
      case "bottom-left":
        return { x: safe.margin, y: bottom };
      case "bottom-right":
        return { x: right, y: bottom };
      default:
        return { x: right, y: safe.top };
    }
  }

  function getSelfViewPositionForRender(
    width: number,
    height: number,
  ): { x: number; y: number } {
    const fromState =
      selfViewPosition ??
      getSelfViewCornerPosition(selfViewCorner, width, height);
    return clampSelfViewPosition(fromState, width, height);
  }

  function getClosestSelfViewCorner(
    position: { x: number; y: number },
    width: number,
    height: number,
  ): SelfViewCorner {
    const corners: SelfViewCorner[] = [
      "top-right",
      "top-left",
      "bottom-right",
      "bottom-left",
    ];

    let closest = corners[0];
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const corner of corners) {
      const target = getSelfViewCornerPosition(corner, width, height);
      const distance = Math.hypot(position.x - target.x, position.y - target.y);
      if (distance < closestDistance) {
        closest = corner;
        closestDistance = distance;
      }
    }

    return closest;
  }

  function getBestSelfViewCorner(
    position: { x: number; y: number },
    width: number,
    height: number,
  ): SelfViewCorner {
    const corners: SelfViewCorner[] = [
      "top-right",
      "top-left",
      "bottom-right",
      "bottom-left",
    ];
    const avoidRects = getSelfViewAvoidRects();

    let bestCorner = corners[0];
    let bestOverlap = Number.POSITIVE_INFINITY;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const corner of corners) {
      const candidatePosition = getSelfViewCornerPosition(
        corner,
        width,
        height,
      );
      const candidateRect = getSelfViewRect(candidatePosition, width, height);
      const overlapArea = avoidRects.reduce(
        (total, avoidRect) =>
          total + getRectOverlapArea(candidateRect, avoidRect),
        0,
      );
      const distance = Math.hypot(
        position.x - candidatePosition.x,
        position.y - candidatePosition.y,
      );

      if (
        overlapArea < bestOverlap ||
        (overlapArea === bestOverlap && distance < bestDistance)
      ) {
        bestCorner = corner;
        bestOverlap = overlapArea;
        bestDistance = distance;
      }
    }

    return bestCorner;
  }

  function clearSelfViewIdleTimer() {
    if (selfViewIdleTimerRef.current !== null) {
      window.clearTimeout(selfViewIdleTimerRef.current);
      selfViewIdleTimerRef.current = null;
    }
  }

  function primeSelfViewIdleTimer() {
    clearSelfViewIdleTimer();
    selfViewIdleTimerRef.current = window.setTimeout(() => {
      setIsSelfViewIdle(true);
    }, 4000);
  }

  function markSelfViewInteraction() {
    setIsSelfViewIdle(false);
    primeSelfViewIdleTimer();
  }

  function detectSelfViewSwipeToHide(
    drag: {
      startX: number;
      startY: number;
      originX: number;
      originY: number;
      pointerType: string;
    },
    event: PointerEvent<HTMLDivElement>,
    dimensions: { width: number; height: number },
  ): boolean {
    if (drag.pointerType !== "touch" || isSelfViewExpanded) {
      return false;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) < 72 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) {
      return false;
    }

    const current = clampSelfViewPosition(
      {
        x: drag.originX + deltaX,
        y: drag.originY + deltaY,
      },
      dimensions.width,
      dimensions.height,
    );
    const safe = getSelfViewSafeBounds();
    const nearLeft = current.x <= safe.margin + 8;
    const nearRight =
      current.x >= viewportSize.width - safe.margin - dimensions.width - 8;

    return (deltaX < 0 && nearLeft) || (deltaX > 0 && nearRight);
  }

  function handleSelfViewTapFlip(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") return;

    const now = performance.now();
    const previousTap = selfViewTapRef.current;
    const isDoubleTap =
      previousTap &&
      now - previousTap.time < 290 &&
      Math.hypot(event.clientX - previousTap.x, event.clientY - previousTap.y) <
        26;

    selfViewTapRef.current = {
      time: now,
      x: event.clientX,
      y: event.clientY,
    };

    if (!isDoubleTap) return;

    suppressSelfViewTapRef.current = true;
    void switchCamera();
  }

  function updateLocalAspectRatioFromElement(video: HTMLVideoElement | null) {
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const ratio = video.videoWidth / video.videoHeight;
    if (Number.isFinite(ratio) && ratio > 0) {
      setLocalAspectRatio(ratio);
    }
  }

  function getRemotePanBounds(scale: number): { maxX: number; maxY: number } {
    const layer = remoteGestureLayerRef.current;
    if (!layer || scale <= 1) return { maxX: 0, maxY: 0 };

    const { width, height } = layer.getBoundingClientRect();
    return {
      maxX: ((scale - 1) * width) / 2,
      maxY: ((scale - 1) * height) / 2,
    };
  }

  function clampPanOffset(
    offset: { x: number; y: number },
    scale: number,
  ): { x: number; y: number } {
    const { maxX, maxY } = getRemotePanBounds(scale);
    return {
      x: clamp(offset.x, -maxX, maxX),
      y: clamp(offset.y, -maxY, maxY),
    };
  }

  async function attachLocalMedia(mode: CameraMode) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new DOMException(
        t("call.error.media.unsupportedBrowser"),
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

  function getMediaErrorMessageKey(error: unknown): TranslationKey {
    const mediaError = error as DOMException;

    if (mediaError?.name === "NotAllowedError") {
      return "call.error.media.notAllowed";
    }
    if (mediaError?.name === "NotFoundError") {
      return "call.error.media.notFound";
    }
    if (mediaError?.name === "NotReadableError") {
      return "call.error.media.notReadable";
    }
    if (mediaError?.name === "SecurityError") {
      return "call.error.media.security";
    }

    return "call.error.media.startFailed";
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

      syncLocalVideoElementWithStream(stream);

      syncLocalTracksToPeerConnection(pc, stream);

      if (previousStream && previousStream.id !== stream.id) {
        stopStream(previousStream);
      }

      return true;
    } catch (error) {
      setCanRetryMedia(true);
      setErrorMessage(t(getMediaErrorMessageKey(error)));
      return false;
    }
  }

  function syncLocalVideoElementWithStream(stream: MediaStream | null) {
    const videoElement = localVideoRef.current;
    if (!videoElement) return;

    videoElement.srcObject = stream;
    if (stream) {
      void videoElement.play().catch(() => {
        // ignore autoplay promise rejections
      });
      updateLocalAspectRatioFromElement(videoElement);
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
    const onResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    primeSelfViewIdleTimer();

    return () => {
      clearSelfViewIdleTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const markInteraction = () => {
      if (!isSelfViewHidden) {
        markSelfViewInteraction();
      }
    };

    window.addEventListener("pointerdown", markInteraction);
    window.addEventListener("keydown", markInteraction);
    return () => {
      window.removeEventListener("pointerdown", markInteraction);
      window.removeEventListener("keydown", markInteraction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelfViewHidden]);

  useEffect(() => {
    if (isSelfViewHidden || isDraggingSelfView || isSelfViewExpanded) return;

    const dimensions = getSelfViewDimensions(false);
    const currentPosition = getSelfViewPositionForRender(
      dimensions.width,
      dimensions.height,
    );
    const nextCorner = getBestSelfViewCorner(
      currentPosition,
      dimensions.width,
      dimensions.height,
    );
    const nextPosition = getSelfViewCornerPosition(
      nextCorner,
      dimensions.width,
      dimensions.height,
    );

    setSelfViewCorner(nextCorner);
    setSelfViewPosition(nextPosition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isSelfViewHidden,
    isDraggingSelfView,
    isSelfViewExpanded,
    isMobileViewport,
    viewportSize.width,
    viewportSize.height,
    errorMessage,
    shareNotice,
  ]);

  useEffect(() => {
    if (!hasRemoteParticipant) return;
    setShowInviteModal(false);
  }, [hasRemoteParticipant]);

  useEffect(() => {
    if (isSelfViewHidden) return;
    const stream = localStreamRef.current;
    const videoElement = localVideoRef.current;
    if (!videoElement) return;

    videoElement.srcObject = stream;
    if (stream) {
      void videoElement.play().catch(() => {
        // ignore autoplay promise rejections
      });
      updateLocalAspectRatioFromElement(videoElement);
    }
  }, [isSelfViewHidden, cameraMode]);

  useEffect(() => {
    if (remoteZoomScale <= 1) {
      setRemotePanOffset({ x: 0, y: 0 });
      return;
    }

    setRemotePanOffset((previous) => clampPanOffset(previous, remoteZoomScale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteZoomScale]);

  useEffect(() => {
    if (!validRoomId) {
      navigate("/", { replace: true });
      return;
    }

    let isMounted = true;
    setHasRemoteParticipant(false);
    setStatus("call.status.joining");

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
          setStatus("call.status.waitingParticipant");
          sendSignal(socket, { type: "join-room", roomId: validRoomId });
        });

        socket.addEventListener("error", () => {
          if (!isMounted) return;
          setStatus("call.status.ended");
          setErrorMessage(t("call.error.serverUnreachable"));
        });

        socket.addEventListener("close", () => {
          if (isMounted) {
            setStatus("call.status.ended");
          }
        });

        if (!isMounted) return;
        await ensureLocalMediaStarted();
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(t(DEFAULT_ERROR_KEY));
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
        setStatus(
          initiator ? "call.status.waitingParticipant" : "call.status.joining",
        );
        if (initiator && !hasAutoOpenedInviteRef.current) {
          hasAutoOpenedInviteRef.current = true;
          setShowInviteModal(true);
        }
        break;
      }
      case "peer-joined": {
        setHasRemoteParticipant(true);
        if (!isInitiatorRef.current) break;
        setStatus("call.status.connecting");
        await ensureLocalMediaStarted();
        await createAndSendOffer(room);
        break;
      }
      case "offer": {
        setHasRemoteParticipant(true);
        setStatus("call.status.connecting");
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
        setRemoteZoomScale(1);
        setRemotePanOffset({ x: 0, y: 0 });
        clearDisconnectTimer();
        restartAttemptsRef.current = 0;
        setStatus("call.status.waitingParticipant");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        await resetPeerConnection(room);
        break;
      }
      case "room-full": {
        setErrorMessage(t("call.error.roomFull"));
        break;
      }
      case "error": {
        setErrorMessage(message.message || t(DEFAULT_ERROR_KEY));
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
      setErrorMessage(t("call.error.fallbackNetwork"));
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
        setStatus("call.status.connected");
      }
      if (pc.connectionState === "disconnected") {
        setStatus("call.status.connecting");
        scheduleDisconnectRecovery(room);
      }
      if (pc.connectionState === "failed") {
        void attemptReconnect(room);
      }
      if (pc.connectionState === "closed") {
        clearDisconnectTimer();
        setStatus("call.status.ended");
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
      setErrorMessage(t("call.error.unstableConnection"));
      return;
    }

    if (restartAttemptsRef.current >= 2) {
      setErrorMessage(t("call.error.connectionLost"));
      return;
    }

    restartAttemptsRef.current += 1;
    setStatus("call.status.connecting");

    try {
      const restartOffer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(restartOffer);

      sendSignal(socketRef.current, {
        type: "offer",
        roomId: room,
        sdp: restartOffer,
      });
    } catch {
      setErrorMessage(t("call.error.connectionLost"));
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
      setShareNotice(t("call.share.inviteCopied"));
    } catch {
      setShareNotice(t("call.share.copyFailed"));
    }
  }

  async function shareInviteLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("call.share.title"),
          text: t("call.share.text"),
          url: inviteLink,
        });
        setShareNotice(t("call.share.opened"));
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
    setStatus("call.status.connecting");

    const started = await startLocalMedia(nextMode);

    if (started) {
      setCameraMode(nextMode);
      setStatus(previousStatus);
    } else {
      setStatus(previousStatus);
    }

    setIsSwitchingCamera(false);
  }

  function toggleRemoteViewMode() {
    setRemoteViewMode((previous) => (previous === "fill" ? "fit" : "fill"));
    setRemoteZoomScale(1);
    setRemotePanOffset({ x: 0, y: 0 });
  }

  function handleRemoteTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      pinchStartDistanceRef.current = getTouchDistance(event.touches);
      pinchStartScaleRef.current = remoteZoomScale;
      panStartTouchRef.current = null;
      setIsPinchingRemote(true);
      setIsPanningRemote(false);
      return;
    }

    if (event.touches.length === 1 && remoteZoomScale > 1) {
      const touch = event.touches[0];
      panStartTouchRef.current = { x: touch.clientX, y: touch.clientY };
      panStartOffsetRef.current = remotePanOffset;
      setIsPanningRemote(true);
    }
  }

  function handleRemoteTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      event.preventDefault();

      const startDistance = pinchStartDistanceRef.current;
      if (!startDistance || startDistance <= 0) {
        pinchStartDistanceRef.current = getTouchDistance(event.touches);
        pinchStartScaleRef.current = remoteZoomScale;
        return;
      }

      const nextDistance = getTouchDistance(event.touches);
      const scaleDelta = nextDistance / startDistance;
      const nextScale = clamp(pinchStartScaleRef.current * scaleDelta, 1, 3);
      setRemoteZoomScale(nextScale);
      return;
    }

    if (event.touches.length === 1 && remoteZoomScale > 1) {
      const panStartTouch = panStartTouchRef.current;
      if (!panStartTouch) return;

      event.preventDefault();

      const touch = event.touches[0];
      const deltaX = touch.clientX - panStartTouch.x;
      const deltaY = touch.clientY - panStartTouch.y;
      const nextOffset = clampPanOffset(
        {
          x: panStartOffsetRef.current.x + deltaX,
          y: panStartOffsetRef.current.y + deltaY,
        },
        remoteZoomScale,
      );

      setRemotePanOffset(nextOffset);
    }
  }

  function handleRemoteTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length >= 2) return;

    if (event.touches.length === 1 && remoteZoomScale > 1) {
      const touch = event.touches[0];
      panStartTouchRef.current = { x: touch.clientX, y: touch.clientY };
      panStartOffsetRef.current = remotePanOffset;
      setIsPanningRemote(true);
    } else {
      panStartTouchRef.current = null;
      setIsPanningRemote(false);
    }

    pinchStartDistanceRef.current = null;
    setIsPinchingRemote(false);
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

    clearSelfViewIdleTimer();
  }

  function toggleSelfViewExpanded() {
    markSelfViewInteraction();

    setIsSelfViewExpanded((expanded) => {
      const compactDimensions = getSelfViewDimensions(false);

      if (!expanded) {
        selfViewCompactStateRef.current = {
          corner: selfViewCorner,
          position: getSelfViewPositionForRender(
            compactDimensions.width,
            compactDimensions.height,
          ),
        };

        const expandedDimensions = getSelfViewDimensions(true);
        const centered = clampSelfViewPosition(
          {
            x: (viewportSize.width - expandedDimensions.width) / 2,
            y: (viewportSize.height - expandedDimensions.height) / 2,
          },
          expandedDimensions.width,
          expandedDimensions.height,
        );

        setSelfViewPosition(centered);
        return true;
      }

      setSelfViewCorner(selfViewCompactStateRef.current.corner);
      setSelfViewPosition(selfViewCompactStateRef.current.position);
      return false;
    });
  }

  function hideSelfView() {
    markSelfViewInteraction();

    const compactDimensions = getSelfViewDimensions(false);
    selfViewCompactStateRef.current = {
      corner: selfViewCorner,
      position: getSelfViewPositionForRender(
        compactDimensions.width,
        compactDimensions.height,
      ),
    };

    setIsSelfViewHidden(true);
    setIsSelfViewExpanded(false);
  }

  function restoreSelfView() {
    markSelfViewInteraction();
    setSelfViewCorner(selfViewCompactStateRef.current.corner);
    setSelfViewPosition(selfViewCompactStateRef.current.position);
    setIsSelfViewHidden(false);
  }

  function handleSelfViewPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    markSelfViewInteraction();

    const dimensions = getSelfViewDimensions(isSelfViewExpanded);
    const position = getSelfViewPositionForRender(
      dimensions.width,
      dimensions.height,
    );

    selfViewDragRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };

    setIsDraggingSelfView(true);
    setSelfViewPosition(position);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSelfViewPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = selfViewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) > 4) {
      drag.moved = true;
      suppressSelfViewTapRef.current = true;
    }

    const dimensions = getSelfViewDimensions(isSelfViewExpanded);
    setSelfViewPosition(
      clampSelfViewPosition(
        {
          x: drag.originX + deltaX,
          y: drag.originY + deltaY,
        },
        dimensions.width,
        dimensions.height,
      ),
    );
  }

  function handleSelfViewPointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = selfViewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dimensions = getSelfViewDimensions(isSelfViewExpanded);
    const current = clampSelfViewPosition(
      {
        x: drag.originX + (event.clientX - drag.startX),
        y: drag.originY + (event.clientY - drag.startY),
      },
      dimensions.width,
      dimensions.height,
    );

    if (!isSelfViewExpanded) {
      if (detectSelfViewSwipeToHide(drag, event, dimensions)) {
        hideSelfView();
        setIsDraggingSelfView(false);
        selfViewDragRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        return;
      }

      const snappedCorner = getBestSelfViewCorner(
        current,
        dimensions.width,
        dimensions.height,
      );
      const snappedPosition = getSelfViewCornerPosition(
        snappedCorner,
        dimensions.width,
        dimensions.height,
      );
      setSelfViewCorner(snappedCorner);
      setSelfViewPosition(snappedPosition);

      handleSelfViewTapFlip(event);
    } else {
      setSelfViewPosition(current);
    }

    setIsDraggingSelfView(false);
    selfViewDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleSelfViewPointerCancel(event: PointerEvent<HTMLDivElement>) {
    const drag = selfViewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setIsDraggingSelfView(false);
    selfViewDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleSelfViewClick() {
    markSelfViewInteraction();

    if (suppressSelfViewTapRef.current) {
      suppressSelfViewTapRef.current = false;
      return;
    }

    toggleSelfViewExpanded();
  }

  function handleSelfViewDoubleClick(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    void switchCamera();
  }

  const selfViewDimensions = getSelfViewDimensions(isSelfViewExpanded);
  const selfViewRenderPosition = getSelfViewPositionForRender(
    selfViewDimensions.width,
    selfViewDimensions.height,
  );

  const endCall = () => {
    leaveCall(validRoomId);
    navigate("/");
  };

  return (
    <main className="call-page">
      <section className="video-shell">
        <div
          className="remote-video-gesture-layer"
          ref={remoteGestureLayerRef}
          onTouchStart={handleRemoteTouchStart}
          onTouchMove={handleRemoteTouchMove}
          onTouchEnd={handleRemoteTouchEnd}
          onTouchCancel={handleRemoteTouchEnd}
        >
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`remote-video ${remoteViewMode === "fit" ? "is-fit" : ""} ${isPinchingRemote || isPanningRemote ? "is-pinching" : ""}`}
            style={{
              transform: `translate3d(${remotePanOffset.x}px, ${remotePanOffset.y}px, 0) scale(${remoteZoomScale})`,
            }}
          />
        </div>

        <div className="top-overlay">
          <div className="glass status-pill">{t(status)}</div>
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
                aria-label={t("call.invite.shareAria")}
              >
                <Share2 className="invite-cta-icon" aria-hidden="true" />
                <span>{t("call.invite.shareCta")}</span>
              </button>

              <div className="invite-link-row">
                <p className="invite-center-url" title={inviteLink}>
                  {inviteLink}
                </p>
                <button
                  className="glass icon-button invite-copy-button"
                  onClick={() => void copyInviteLink()}
                  aria-label={t("call.invite.copyAria")}
                >
                  <Copy className="invite-copy-icon" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <SelfViewContainer
          localVideoRef={localVideoRef}
          isSelfViewHidden={isSelfViewHidden}
          restoreSelfView={restoreSelfView}
          selfViewRef={selfViewRef}
          isSelfViewExpanded={isSelfViewExpanded}
          isDraggingSelfView={isDraggingSelfView}
          isSelfViewIdle={isSelfViewIdle}
          localAspectRatio={localAspectRatio}
          selfViewWidth={selfViewDimensions.width}
          selfViewX={selfViewRenderPosition.x}
          selfViewY={selfViewRenderPosition.y}
          onPointerDown={handleSelfViewPointerDown}
          onPointerMove={handleSelfViewPointerMove}
          onPointerUp={handleSelfViewPointerUp}
          onPointerCancel={handleSelfViewPointerCancel}
          onClick={handleSelfViewClick}
          onDoubleClick={handleSelfViewDoubleClick}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleSelfViewExpanded();
            }
          }}
          cameraMode={cameraMode}
          onLocalVideoMetadata={updateLocalAspectRatioFromElement}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onSwitchCamera={switchCamera}
          onToggleVideo={toggleVideo}
          onHideSelfView={hideSelfView}
        />

        <button
          className="glass icon-button view-mode-toggle"
          onClick={toggleRemoteViewMode}
          aria-label={
            remoteViewMode === "fill"
              ? t("call.view.fitAria")
              : t("call.view.fillAria")
          }
        >
          {remoteViewMode === "fill" ? (
            <Minimize2 className="control-icon" aria-hidden="true" />
          ) : (
            <Maximize2 className="control-icon" aria-hidden="true" />
          )}
          <span>
            {remoteViewMode === "fill"
              ? t("call.view.fitLabel")
              : t("call.view.fillLabel")}
          </span>
        </button>

        <div className="controls-float glass">
          <button
            className={`glass icon-button control-button ${isVideoOff ? "is-active" : ""}`}
            onClick={() => void toggleVideo()}
            aria-pressed={isVideoOff}
            aria-label={
              isVideoOff
                ? t("call.controls.videoOnAria")
                : t("call.controls.videoOffAria")
            }
          >
            {isVideoOff ? (
              <VideoOff className="control-icon" aria-hidden="true" />
            ) : (
              <Video className="control-icon" aria-hidden="true" />
            )}
            <span className="control-label">
              {isVideoOff
                ? t("call.controls.videoOnLabel")
                : t("call.controls.videoOffLabel")}
            </span>
          </button>
          <button
            className={`glass icon-button control-button ${isMuted ? "is-active" : ""}`}
            onClick={() => void toggleMute()}
            aria-pressed={isMuted}
            aria-label={
              isMuted
                ? t("call.controls.unmuteAria")
                : t("call.controls.muteAria")
            }
          >
            {isMuted ? (
              <MicOff className="control-icon" aria-hidden="true" />
            ) : (
              <Mic className="control-icon" aria-hidden="true" />
            )}
            <span className="control-label">
              {isMuted
                ? t("call.controls.unmuteLabel")
                : t("call.controls.muteLabel")}
            </span>
          </button>
          <button
            className="glass icon-button control-button"
            onClick={() => void switchCamera()}
            disabled={isSwitchingCamera}
            aria-label={t("call.controls.flipAria")}
          >
            <SwitchCamera className="control-icon" aria-hidden="true" />
            <span className="control-label">
              {isSwitchingCamera
                ? t("call.controls.flippingLabel")
                : t("call.controls.flipLabel")}
            </span>
          </button>
          <button
            className="glass danger icon-button control-button end-button"
            onClick={endCall}
            aria-label={t("call.controls.endAria")}
          >
            <Phone className="control-icon end-call-icon" aria-hidden="true" />
            <span className="control-label">{t("call.controls.endLabel")}</span>
          </button>
        </div>
      </section>

      {showInviteModal && !hasRemoteParticipant ? (
        <section
          className="modal-backdrop"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="modal glass"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>{t("call.modal.title")}</h2>
            <p>{t("call.modal.subtitle")}</p>
            <input value={inviteLink} readOnly />
            <div className="modal-actions">
              <button
                className="glass icon-button"
                onClick={() => void copyInviteLink()}
              >
                {t("call.modal.copyButton")}
              </button>
              <button
                className="glass primary share-button"
                onClick={() => void shareInviteLink()}
              >
                {t("call.modal.shareButton")}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
