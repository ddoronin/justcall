import type { MutableRefObject, TouchEventHandler } from "react";
import clsx from "clsx";
import type { RemoteViewMode } from "../../store/callUiStore";

type RemoteVideoStageProps = {
  remoteGestureLayerRef: MutableRefObject<HTMLDivElement | null>;
  remoteVideoRef: MutableRefObject<HTMLVideoElement | null>;
  onTouchStart: TouchEventHandler<HTMLDivElement>;
  onTouchMove: TouchEventHandler<HTMLDivElement>;
  onTouchEnd: TouchEventHandler<HTMLDivElement>;
  remoteViewMode: RemoteViewMode;
  isPinchingRemote: boolean;
  isPanningRemote: boolean;
  remotePanOffset: { x: number; y: number };
  remoteZoomScale: number;
};

export default function RemoteVideoStage({
  remoteGestureLayerRef,
  remoteVideoRef,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  remoteViewMode,
  isPinchingRemote,
  isPanningRemote,
  remotePanOffset,
  remoteZoomScale,
}: RemoteVideoStageProps) {
  return (
    <div
      className="h-dvh w-full touch-none overflow-hidden"
      ref={remoteGestureLayerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={clsx(
          "h-dvh w-full origin-center bg-[#07080d] transition-[transform,object-fit] duration-200 ease-out",
          remoteViewMode === "fit" ? "object-contain" : "object-cover",
          (isPinchingRemote || isPanningRemote) && "transition-none",
        )}
        style={{
          transform: `translate3d(${remotePanOffset.x}px, ${remotePanOffset.y}px, 0) scale(${remoteZoomScale})`,
        }}
      />
    </div>
  );
}
