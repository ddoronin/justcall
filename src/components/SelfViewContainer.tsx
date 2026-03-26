import type {
  KeyboardEventHandler,
  MutableRefObject,
  PointerEventHandler,
} from "react";
import {
  Eye,
  Loader2,
  MicOff,
  Minimize2,
  SwitchCamera,
  Video,
  VideoOff,
} from "lucide-react";
import clsx from "clsx";
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
  isCameraInitializing: boolean;
  cameraInitializingLabel: string;
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
  isCameraInitializing,
  cameraInitializingLabel,
  onSwitchCamera,
  onToggleVideo,
  onHideSelfView,
}: SelfViewContainerProps) {
  const { t } = useI18n();

  if (isSelfViewHidden) {
    return (
      <button
        className="btn-interactive glass absolute right-3.5 top-[max(84px,calc(env(safe-area-inset-top)+68px))] z-10 inline-flex h-[42px] w-[42px] items-center justify-center rounded-full p-0 max-[760px]:right-3 max-[760px]:top-[max(80px,calc(env(safe-area-inset-top)+64px))]"
        onClick={restoreSelfView}
        aria-label={t("call.selfView.showAria")}
      >
        <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      ref={selfViewRef}
      className={clsx(
        "absolute z-[9] select-none touch-none overflow-hidden rounded-[22px] border border-white/20 bg-[linear-gradient(145deg,#ffffff2a,#ffffff14)] shadow-[0_8px_24px_#04050b52] backdrop-blur-[20px] transition-[left,top,width,opacity,transform,box-shadow] duration-300 ease-out cursor-grab max-[760px]:rounded-[20px]",
        isSelfViewExpanded && "z-[12]",
        isDraggingSelfView &&
          "cursor-grabbing shadow-[0_14px_30px_#04050b76] transition-none",
        isSelfViewIdle && "scale-95 opacity-70",
      )}
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
        className={clsx(
          "h-full w-full rounded-[inherit] border-0 bg-[#121316] object-cover shadow-none",
          cameraMode === "front" && "-scale-x-100",
        )}
        onLoadedMetadata={(event) => onLocalVideoMetadata(event.currentTarget)}
      />

      {isCameraInitializing ? (
        <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center bg-[#090c15b3] backdrop-blur-[2px]">
          <div className="glass inline-flex items-center gap-2.5 rounded-full px-3.5 py-2 text-xs font-medium text-[#edf2ff]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            <span>{cameraInitializingLabel}</span>
          </div>
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute left-2 top-2 z-[2] inline-flex items-center gap-1.5"
        aria-hidden="true"
      >
        {isMuted ? (
          <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/15 bg-[#10131cc4]">
            <MicOff className="h-[13px] w-[13px]" />
          </span>
        ) : null}
        {isVideoOff ? (
          <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/15 bg-[#10131cc4]">
            <VideoOff className="h-[13px] w-[13px]" />
          </span>
        ) : null}
        {cameraMode === "back" ? (
          <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/15 bg-[#10131cc4]">
            <SwitchCamera className="h-[13px] w-[13px]" />
          </span>
        ) : null}
      </div>

      {isSelfViewExpanded ? (
        <div className="glass absolute bottom-2.5 left-1/2 z-[2] inline-flex -translate-x-1/2 items-center gap-2 rounded-full p-1.5">
          <button
            className="btn-interactive glass inline-flex h-9 w-9 items-center justify-center rounded-full p-0 max-[760px]:h-[34px] max-[760px]:w-[34px]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void onSwitchCamera();
            }}
            aria-label={t("call.controls.flipAria")}
          >
            <SwitchCamera className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <button
            className="btn-interactive glass inline-flex h-9 w-9 items-center justify-center rounded-full p-0 max-[760px]:h-[34px] max-[760px]:w-[34px]"
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
              <Video className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <VideoOff className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
          </button>
          <button
            className="btn-interactive glass inline-flex h-9 w-9 items-center justify-center rounded-full p-0 max-[760px]:h-[34px] max-[760px]:w-[34px]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onHideSelfView();
            }}
            aria-label={t("call.selfView.hideAria")}
          >
            <Minimize2 className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
