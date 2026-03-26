import type { MutableRefObject, TouchEventHandler } from "react";
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
      className="remote-video-gesture-layer"
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
        className={`remote-video ${remoteViewMode === "fit" ? "is-fit" : ""} ${isPinchingRemote || isPanningRemote ? "is-pinching" : ""}`}
        style={{
          transform: `translate3d(${remotePanOffset.x}px, ${remotePanOffset.y}px, 0) scale(${remoteZoomScale})`,
        }}
      />
    </div>
  );
}
