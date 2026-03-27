import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type TouchEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createSignalingSocket,
  parseIceServers,
  resolveIceServers,
  sendSignal,
} from "../lib/signaling";
import {
  createCallSessionController,
  shouldForceRelayTransport,
} from "../lib/callSessionController";
import {
  createLocalMediaController,
  type CameraMode,
} from "../lib/localMediaController";
import SelfViewContainer from "./SelfViewContainer";
import RemoteVideoStage from "./call/RemoteVideoStage";
import CallStatusOverlay from "./call/CallStatusOverlay";
import InvitePanel from "./call/InvitePanel";
import ViewModeToggle from "./call/ViewModeToggle";
import CallControlsPanel from "./call/CallControlsPanel";
import { useCallSessionState } from "./call/useCallSessionState";
import { useI18n } from "../i18n/provider";
import type { TranslationKey } from "../i18n/types";
import type { ServerSignalMessage } from "../types/signaling";
import { useCallUiStore } from "../store/callUiStore";
import { useShallow } from "zustand/react/shallow";

const DEFAULT_ERROR_KEY: TranslationKey = "call.error.default";
type SelfViewCorner = "top-right" | "top-left" | "bottom-right" | "bottom-left";
type Rect = { left: number; top: number; right: number; bottom: number };

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
  const cameraInitRequestsRef = useRef(0);
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isInitiatorRef = useRef(false);
  const disconnectTimerRef = useRef<number | null>(null);
  const restartAttemptsRef = useRef(0);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const panStartTouchRef = useRef<{ x: number; y: number } | null>(null);
  const panStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const selfViewIdleTimerRef = useRef<number | null>(null);
  const selfViewExpandedTimerRef = useRef<number | null>(null);
  const callControlsHideTimerRef = useRef<number | null>(null);
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

  const {
    session,
    setStatus,
    setErrorMessage,
    setIsInitiator,
    setHasRemoteParticipant,
    setConnectedAt,
    setEndedAt,
    resetForRoomJoin,
  } = useCallSessionState();
  const { status, errorMessage, hasRemoteParticipant, connectedAt } = session;
  const [cameraMode, setCameraMode] = useState<CameraMode>("front");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const cameraModeRef = useRef<CameraMode>(cameraMode);
  const isMutedRef = useRef(isMuted);
  const isVideoOffRef = useRef(isVideoOff);
  const connectedAtRef = useRef<number | null>(null);
  const {
    shareNotice,
    remoteViewMode,
    remoteZoomScale,
    isPinchingRemote,
    isPanningRemote,
    remotePanOffset,
  } = useCallUiStore(
    useShallow((state) => ({
      shareNotice: state.shareNotice,
      remoteViewMode: state.remoteViewMode,
      remoteZoomScale: state.remoteZoomScale,
      isPinchingRemote: state.isPinchingRemote,
      isPanningRemote: state.isPanningRemote,
      remotePanOffset: state.remotePanOffset,
    })),
  );
  const {
    setShareNotice,
    clearShareNotice,
    setRemoteZoomScale,
    setIsPinchingRemote,
    setIsPanningRemote,
    setRemotePanOffset,
    resetRemoteTransform,
    toggleRemoteViewMode,
  } = useCallUiStore(
    useShallow((state) => ({
      setShareNotice: state.setShareNotice,
      clearShareNotice: state.clearShareNotice,
      setRemoteZoomScale: state.setRemoteZoomScale,
      setIsPinchingRemote: state.setIsPinchingRemote,
      setIsPanningRemote: state.setIsPanningRemote,
      setRemotePanOffset: state.setRemotePanOffset,
      resetRemoteTransform: state.resetRemoteTransform,
      toggleRemoteViewMode: state.toggleRemoteViewMode,
    })),
  );
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
  const [areCallControlsVisible, setAreCallControlsVisible] = useState(true);

  const validRoomId = roomId ?? "";
  const isMobileViewport = viewportSize.width <= 760;
  const forceRelayTransport = useMemo(() => shouldForceRelayTransport(), []);
  const inviteLink = useMemo(
    () => `${window.location.origin}/call/${validRoomId}`,
    [validRoomId],
  );
  const hasCompletedCallRef = useRef(false);
  const isCameraInitializationPhase = status.startsWith("call.status.camera.");
  const shouldAutoHideCallControls =
    hasRemoteParticipant &&
    status !== "call.status.ended" &&
    !isCameraInitializationPhase;

  cameraModeRef.current = cameraMode;
  isMutedRef.current = isMuted;
  isVideoOffRef.current = isVideoOff;
  connectedAtRef.current = connectedAt;

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

  function clearSelfViewExpandedTimer() {
    if (selfViewExpandedTimerRef.current !== null) {
      window.clearTimeout(selfViewExpandedTimerRef.current);
      selfViewExpandedTimerRef.current = null;
    }
  }

  function clearCallControlsHideTimer() {
    if (callControlsHideTimerRef.current !== null) {
      window.clearTimeout(callControlsHideTimerRef.current);
      callControlsHideTimerRef.current = null;
    }
  }

  function primeCallControlsHideTimer() {
    clearCallControlsHideTimer();

    if (!shouldAutoHideCallControls) {
      setAreCallControlsVisible(true);
      return;
    }

    callControlsHideTimerRef.current = window.setTimeout(() => {
      if (isPinchingRemote || isPanningRemote || selfViewDragRef.current) {
        primeCallControlsHideTimer();
        return;
      }

      setAreCallControlsVisible(false);
    }, 2400);
  }

  function markCallControlsInteraction() {
    if (!shouldAutoHideCallControls) {
      setAreCallControlsVisible(true);
      return;
    }

    setAreCallControlsVisible(true);
    primeCallControlsHideTimer();
  }

  function toggleCallControlsFromStageClick() {
    if (!shouldAutoHideCallControls) {
      setAreCallControlsVisible(true);
      return;
    }

    setAreCallControlsVisible((visible) => {
      const nextVisible = !visible;

      if (nextVisible) {
        primeCallControlsHideTimer();
      } else {
        clearCallControlsHideTimer();
      }

      return nextVisible;
    });
  }

  function collapseSelfViewExpanded() {
    setIsSelfViewExpanded((expanded) => {
      if (!expanded) return expanded;

      setSelfViewCorner(selfViewCompactStateRef.current.corner);
      setSelfViewPosition(selfViewCompactStateRef.current.position);
      return false;
    });
  }

  function primeSelfViewExpandedTimer() {
    clearSelfViewExpandedTimer();

    if (!isSelfViewExpanded || isSelfViewHidden) return;

    selfViewExpandedTimerRef.current = window.setTimeout(() => {
      if (selfViewDragRef.current) {
        primeSelfViewExpandedTimer();
        return;
      }

      collapseSelfViewExpanded();
    }, 2000);
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
    markCallControlsInteraction();

    if (isSelfViewExpanded && !isSelfViewHidden) {
      primeSelfViewExpandedTimer();
    }
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

  const localMediaController = useMemo(
    () =>
      createLocalMediaController({
        localVideoRef,
        localStreamRef,
        mediaStartPromiseRef,
        pcRef,
        getCameraMode: () => cameraModeRef.current,
        getIsMuted: () => isMutedRef.current,
        getIsVideoOff: () => isVideoOffRef.current,
        setErrorMessage,
        onLocalVideoMetadata: updateLocalAspectRatioFromElement,
        messages: {
          unsupportedBrowser: t("call.error.media.unsupportedBrowser"),
          notAllowed: t("call.error.media.notAllowed"),
          notFound: t("call.error.media.notFound"),
          notReadable: t("call.error.media.notReadable"),
          security: t("call.error.media.security"),
          startFailed: t("call.error.media.startFailed"),
        },
      }),
    [setErrorMessage, t],
  );

  const callSessionController = useMemo(
    () =>
      createCallSessionController({
        socketRef,
        pcRef,
        resolvedIceServersRef,
        localStreamRef,
        queuedCandidatesRef,
        isInitiatorRef,
        disconnectTimerRef,
        restartAttemptsRef,
        remoteVideoRef,
        forceRelay: forceRelayTransport,
        messages: {
          fallbackNetwork: t("call.error.fallbackNetwork"),
          unstableConnection: t("call.error.unstableConnection"),
          connectionLost: t("call.error.connectionLost"),
          roomFull: t("call.error.roomFull"),
          defaultError: t(DEFAULT_ERROR_KEY),
        },
        setStatus,
        setErrorMessage,
        setIsInitiator,
        setHasRemoteParticipant,
        resetRemoteTransform,
        ensureLocalMediaStarted: () =>
          localMediaController.ensureLocalMediaStarted(),
        syncLocalTracksToPeerConnection: (pc, stream) =>
          localMediaController.syncLocalTracksToPeerConnection(pc, stream),
      }),
    [
      forceRelayTransport,
      localMediaController,
      resetRemoteTransform,
      setErrorMessage,
      setHasRemoteParticipant,
      setIsInitiator,
      setStatus,
      t,
    ],
  );

  useEffect(() => {
    if (!shareNotice) return;

    const timer = window.setTimeout(() => {
      clearShareNotice();
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [clearShareNotice, shareNotice]);

  useEffect(() => {
    if (!errorMessage) return;

    const timer = window.setTimeout(() => {
      setErrorMessage(null);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [errorMessage, setErrorMessage]);

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
      clearSelfViewExpandedTimer();
      clearCallControlsHideTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!shouldAutoHideCallControls) {
      clearCallControlsHideTimer();
      setAreCallControlsVisible(true);
      return;
    }

    setAreCallControlsVisible(false);
    primeCallControlsHideTimer();

    return () => {
      clearCallControlsHideTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoHideCallControls]);

  useEffect(() => {
    if (!isSelfViewExpanded || isSelfViewHidden) {
      clearSelfViewExpandedTimer();
      return;
    }

    primeSelfViewExpandedTimer();

    return () => {
      clearSelfViewExpandedTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelfViewExpanded, isSelfViewHidden]);

  useEffect(() => {
    if (!isSelfViewExpanded || isSelfViewHidden) return;

    const handleOutsidePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (selfViewRef.current?.contains(target)) return;

      collapseSelfViewExpanded();
    };

    window.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", handleOutsidePointerDown, true);
    };
  }, [isSelfViewExpanded, isSelfViewHidden]);

  useEffect(() => {
    const markInteraction = () => {
      if (!isSelfViewHidden) {
        markSelfViewInteraction();
      }
    };

    window.addEventListener("keydown", markInteraction);
    return () => {
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
    if (status !== "call.status.connected") return;
    if (connectedAt !== null) return;
    const timestamp = Date.now();
    connectedAtRef.current = timestamp;
    setConnectedAt(timestamp);
  }, [connectedAt, setConnectedAt, status]);

  useEffect(() => {
    if (isSelfViewHidden) return;
    const stream = localStreamRef.current;
    localMediaController.syncLocalVideoElementWithStream(stream);
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
    resetForRoomJoin();

    const setup = async () => {
      try {
        setStatus("call.status.camera.requestingPermissions");

        const cameraStarted = await withCameraInitializationLoader(async () => {
          setStatus("call.status.camera.initializing");
          return localMediaController.ensureLocalMediaStarted();
        });

        if (!isMounted) return;
        if (!cameraStarted) {
          setStatus("call.status.camera.requestingPermissions");
          return;
        }

        setStatus("call.status.camera.ready");

        const iceServers = await resolveIceServers();
        resolvedIceServersRef.current = iceServers;

        const pc = callSessionController.createPeerConnection(
          validRoomId,
          iceServers,
        );
        pcRef.current = pc;

        if (localStreamRef.current) {
          localMediaController.syncLocalTracksToPeerConnection(
            pc,
            localStreamRef.current,
          );
        }

        setStatus("call.status.webrtc.connecting");

        const socket = createSignalingSocket((message) => {
          void onServerMessage(message, validRoomId);
        });

        socketRef.current = socket;

        socket.addEventListener("open", () => {
          setStatus("call.status.webrtc.waitingParticipant");
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
      } catch (error) {
        if (!isMounted) return;

        setStatus("call.status.ended");
        setErrorMessage(t(DEFAULT_ERROR_KEY));
      }
    };

    void setup();

    return () => {
      isMounted = false;
      leaveCall(validRoomId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callSessionController, localMediaController, validRoomId]);

  async function onServerMessage(message: ServerSignalMessage, room: string) {
    await callSessionController.handleServerMessage(message, room);

    if (message.type === "peer-left") {
      completeCallForAllParticipants();
    }
  }

  function getCurrentCallDurationMs(endedTimestamp: number): number {
    if (connectedAtRef.current === null) return 0;
    return Math.max(0, endedTimestamp - connectedAtRef.current);
  }

  function completeCallForAllParticipants() {
    if (hasCompletedCallRef.current) return;
    hasCompletedCallRef.current = true;

    const endedTimestamp = Date.now();
    const durationMs = getCurrentCallDurationMs(endedTimestamp);

    setEndedAt(endedTimestamp);
    setStatus("call.status.ended");
    leaveCall(validRoomId);

    navigate(`/call/${validRoomId}/completed`, {
      replace: true,
      state: { durationMs },
    });
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

  async function withCameraInitializationLoader<T>(
    action: () => Promise<T>,
  ): Promise<T> {
    cameraInitRequestsRef.current += 1;
    setIsCameraInitializing(true);

    try {
      return await action();
    } finally {
      cameraInitRequestsRef.current = Math.max(
        0,
        cameraInitRequestsRef.current - 1,
      );

      if (cameraInitRequestsRef.current === 0) {
        setIsCameraInitializing(false);
      }
    }
  }

  async function switchCamera() {
    if (isSwitchingCamera) return;

    const nextMode: CameraMode = cameraMode === "front" ? "back" : "front";
    const previousStatus = status;

    setIsSwitchingCamera(true);
    setStatus("call.status.camera.initializing");

    const started = await withCameraInitializationLoader(() =>
      localMediaController.startLocalMedia(nextMode),
    );

    if (started) {
      setCameraMode(nextMode);
      setStatus(previousStatus);
    } else {
      setStatus(previousStatus);
    }

    setIsSwitchingCamera(false);
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
    const nextMuted = !isMuted;

    localMediaController.setAudioEnabled(!nextMuted);

    setIsMuted(nextMuted);
  }

  async function toggleVideo() {
    const nextVideoOff = !isVideoOff;

    if (!localMediaController.hasVideoTrack()) {
      const started = await withCameraInitializationLoader(() =>
        localMediaController.startLocalMedia(cameraMode),
      );
      if (started) {
        setIsVideoOff(false);
      }
      return;
    }

    localMediaController.setVideoEnabled(!nextVideoOff);

    setIsVideoOff(nextVideoOff);
  }

  function leaveCall(room: string) {
    callSessionController.dispose(room);

    clearSelfViewIdleTimer();
    clearSelfViewExpandedTimer();
    clearCallControlsHideTimer();
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

    markSelfViewInteraction();

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
    markSelfViewInteraction();
    void switchCamera();
  }

  const selfViewDimensions = getSelfViewDimensions(isSelfViewExpanded);
  const selfViewRenderPosition = getSelfViewPositionForRender(
    selfViewDimensions.width,
    selfViewDimensions.height,
  );

  const endCall = () => {
    completeCallForAllParticipants();
  };

  return (
    <main className="relative min-h-dvh">
      <section className="relative min-h-dvh overflow-hidden bg-black">
        <RemoteVideoStage
          remoteGestureLayerRef={remoteGestureLayerRef}
          remoteVideoRef={remoteVideoRef}
          onStageClick={toggleCallControlsFromStageClick}
          onTouchStart={handleRemoteTouchStart}
          onTouchMove={handleRemoteTouchMove}
          onTouchEnd={handleRemoteTouchEnd}
          remoteViewMode={remoteViewMode}
          isPinchingRemote={isPinchingRemote}
          isPanningRemote={isPanningRemote}
          remotePanOffset={remotePanOffset}
          remoteZoomScale={remoteZoomScale}
        />

        <CallStatusOverlay
          isStatusVisible={
            areCallControlsVisible || !shouldAutoHideCallControls
          }
          statusLabel={t(status)}
          errorMessage={errorMessage}
          shareNotice={shareNotice}
        />

        <InvitePanel
          visible={!isCameraInitializationPhase && !hasRemoteParticipant}
          inviteLink={inviteLink}
          shareAriaLabel={t("call.invite.shareAria")}
          shareLabel={t("call.invite.shareCta")}
          copyAriaLabel={t("call.invite.copyAria")}
          onShare={() => void shareInviteLink()}
          onCopy={() => void copyInviteLink()}
        />

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
              markSelfViewInteraction();
              toggleSelfViewExpanded();
            }
          }}
          cameraMode={cameraMode}
          onLocalVideoMetadata={updateLocalAspectRatioFromElement}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isCameraInitializing={isCameraInitializing}
          cameraInitializingLabel={t("call.status.camera.initializing")}
          onSwitchCamera={async () => {
            markSelfViewInteraction();
            await switchCamera();
          }}
          onToggleVideo={async () => {
            markSelfViewInteraction();
            await toggleVideo();
          }}
          onHideSelfView={hideSelfView}
        />

        <ViewModeToggle
          isVisible={!isCameraInitializationPhase && areCallControlsVisible}
          remoteViewMode={remoteViewMode}
          onToggle={() => {
            markCallControlsInteraction();
            toggleRemoteViewMode();
          }}
          fitAriaLabel={t("call.view.fitAria")}
          fillAriaLabel={t("call.view.fillAria")}
          fitLabel={t("call.view.fitLabel")}
          fillLabel={t("call.view.fillLabel")}
        />

        <CallControlsPanel
          isVisible={!isCameraInitializationPhase && areCallControlsVisible}
          isVideoOff={isVideoOff}
          isMuted={isMuted}
          isSwitchingCamera={isSwitchingCamera}
          onToggleVideo={() => {
            markCallControlsInteraction();
            void toggleVideo();
          }}
          onToggleMute={() => {
            markCallControlsInteraction();
            void toggleMute();
          }}
          onSwitchCamera={() => {
            markCallControlsInteraction();
            void switchCamera();
          }}
          onEndCall={() => {
            markCallControlsInteraction();
            endCall();
          }}
          labels={{
            videoOnAria: t("call.controls.videoOnAria"),
            videoOffAria: t("call.controls.videoOffAria"),
            videoOn: t("call.controls.videoOnLabel"),
            videoOff: t("call.controls.videoOffLabel"),
            unmuteAria: t("call.controls.unmuteAria"),
            muteAria: t("call.controls.muteAria"),
            unmute: t("call.controls.unmuteLabel"),
            mute: t("call.controls.muteLabel"),
            flipAria: t("call.controls.flipAria"),
            flipping: t("call.controls.flippingLabel"),
            flip: t("call.controls.flipLabel"),
            endAria: t("call.controls.endAria"),
            end: t("call.controls.endLabel"),
          }}
        />
      </section>
    </main>
  );
}
