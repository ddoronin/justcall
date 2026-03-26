import type {
  KeyboardEventHandler,
  MutableRefObject,
  PointerEventHandler,
} from "react";
import {
  Eye,
  MicOff,
  Minimize2,
  SwitchCamera,
  Video,
  VideoOff,
} from "lucide-react";
import { useI18n } from "../i18n/provider";

type SelfViewContainerProps = {
  localVideoRef: MutableRefObject<HTMLVideoElement | null>;
  isSelfViewHidden: boolean;
  restoreSelfView: () => void;
  selfViewRef: MutableRefObject<HTMLDivElement | null>;
  isSelfViewExpanded: boolean;
  isDraggingSelfView: boolean;
  isSelfViewIdle: boolean;
  localAspectRatio: number;
  selfViewWidth: number;
  selfViewX: number;
  selfViewY: number;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
  onClick: () => void;
  onDoubleClick: PointerEventHandler<HTMLDivElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  cameraMode: "front" | "back";
  onLocalVideoMetadata: (video: HTMLVideoElement | null) => void;
  isMuted: boolean;
  isVideoOff: boolean;
  onSwitchCamera: () => Promise<void>;
  onToggleVideo: () => Promise<void>;
  onHideSelfView: () => void;
};

export default function SelfViewContainer({
  localVideoRef,
  isSelfViewHidden,
  restoreSelfView,
  selfViewRef,
  isSelfViewExpanded,
  isDraggingSelfView,
  isSelfViewIdle,
  localAspectRatio,
  selfViewWidth,
  selfViewX,
  selfViewY,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClick,
  onDoubleClick,
  onKeyDown,
  cameraMode,
  onLocalVideoMetadata,
  isMuted,
  isVideoOff,
  onSwitchCamera,
  onToggleVideo,
  onHideSelfView,
}: SelfViewContainerProps) {
  const { t } = useI18n();

  if (isSelfViewHidden) {
    return (
      <button
        className="glass icon-button self-view-restore"
        onClick={restoreSelfView}
        aria-label={t("call.selfView.showAria")}
      >
        <Eye className="control-icon" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      ref={selfViewRef}
      className={`local-preview ${isSelfViewExpanded ? "is-expanded" : ""} ${isDraggingSelfView ? "is-dragging" : ""} ${isSelfViewIdle ? "is-idle" : ""}`}
      style={{
        aspectRatio: `${localAspectRatio}`,
        width: `${selfViewWidth}px`,
        left: `${selfViewX}px`,
        top: `${selfViewY}px`,
      }}
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      aria-label={
        isSelfViewExpanded
          ? t("call.selfView.collapseAria")
          : t("call.selfView.expandAria")
      }
      aria-pressed={isSelfViewExpanded}
    >
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={`local-video ${cameraMode === "front" ? "mirrored" : ""}`}
        onLoadedMetadata={(event) => onLocalVideoMetadata(event.currentTarget)}
      />

      <div className="self-view-status" aria-hidden="true">
        {isMuted ? (
          <span className="self-view-badge">
            <MicOff className="self-view-badge-icon" />
          </span>
        ) : null}
        {isVideoOff ? (
          <span className="self-view-badge">
            <VideoOff className="self-view-badge-icon" />
          </span>
        ) : null}
        {cameraMode === "back" ? (
          <span className="self-view-badge">
            <SwitchCamera className="self-view-badge-icon" />
          </span>
        ) : null}
      </div>

      {isSelfViewExpanded ? (
        <div className="self-view-actions glass">
          <button
            className="glass icon-button self-view-action"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void onSwitchCamera();
            }}
            aria-label={t("call.controls.flipAria")}
          >
            <SwitchCamera className="control-icon" aria-hidden="true" />
          </button>
          <button
            className="glass icon-button self-view-action"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void onToggleVideo();
            }}
            aria-label={
              isVideoOff
                ? t("call.controls.videoOnAria")
                : t("call.controls.videoOffAria")
            }
          >
            {isVideoOff ? (
              <Video className="control-icon" aria-hidden="true" />
            ) : (
              <VideoOff className="control-icon" aria-hidden="true" />
            )}
          </button>
          <button
            className="glass icon-button self-view-action"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onHideSelfView();
            }}
            aria-label={t("call.selfView.hideAria")}
          >
            <Minimize2 className="control-icon" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
