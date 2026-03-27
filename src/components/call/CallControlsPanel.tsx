import {
  Mic,
  MicOff,
  Phone,
  SwitchCamera,
  Video,
  VideoOff,
} from "lucide-react";
import clsx from "clsx";

type CallControlsPanelProps = {
  isVisible: boolean;
  isVideoOff: boolean;
  isMuted: boolean;
  isSwitchingCamera: boolean;
  onToggleVideo: () => void;
  onToggleMute: () => void;
  onSwitchCamera: () => void;
  onEndCall: () => void;
  labels: {
    videoOnAria: string;
    videoOffAria: string;
    videoOn: string;
    videoOff: string;
    unmuteAria: string;
    muteAria: string;
    unmute: string;
    mute: string;
    flipAria: string;
    flipping: string;
    flip: string;
    endAria: string;
    end: string;
  };
};

export default function CallControlsPanel({
  isVisible,
  isVideoOff,
  isMuted,
  isSwitchingCamera,
  onToggleVideo,
  onToggleMute,
  onSwitchCamera,
  onEndCall,
  labels,
}: CallControlsPanelProps) {
  const baseButtonClassName =
    "btn-interactive glass inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] min-h-[44px] max-[760px]:min-h-12 max-[760px]:gap-0 max-[760px]:p-[11px]";

  return (
    <div
      className={clsx(
        "glass absolute right-3.5 top-1/2 z-[6] grid w-[min(190px,28vw)] -translate-y-1/2 gap-2.5 rounded-[18px] p-2.5 transition-all duration-300 ease-out max-[760px]:left-3 max-[760px]:right-3 max-[760px]:top-auto max-[760px]:w-auto max-[760px]:translate-y-0 max-[760px]:grid-cols-4 max-[760px]:gap-2.5 max-[760px]:bottom-[max(12px,env(safe-area-inset-bottom))]",
        isVisible
          ? "opacity-100 translate-x-0 max-[760px]:translate-y-0"
          : "pointer-events-none opacity-0 translate-x-8 max-[760px]:translate-x-0 max-[760px]:translate-y-8",
      )}
      aria-hidden={!isVisible}
    >
      <button
        className={clsx(
          baseButtonClassName,
          isVideoOff &&
            "border-[#c9deff7a] bg-[linear-gradient(145deg,#97c4ff66,#5d89d466)]",
        )}
        onClick={onToggleVideo}
        aria-pressed={isVideoOff}
        aria-label={isVideoOff ? labels.videoOnAria : labels.videoOffAria}
      >
        {isVideoOff ? (
          <VideoOff className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        ) : (
          <Video className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        )}
        <span className="max-[760px]:hidden">
          {isVideoOff ? labels.videoOn : labels.videoOff}
        </span>
      </button>
      <button
        className={clsx(
          baseButtonClassName,
          isMuted &&
            "border-[#c9deff7a] bg-[linear-gradient(145deg,#97c4ff66,#5d89d466)]",
        )}
        onClick={onToggleMute}
        aria-pressed={isMuted}
        aria-label={isMuted ? labels.unmuteAria : labels.muteAria}
      >
        {isMuted ? (
          <MicOff className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        ) : (
          <Mic className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        )}
        <span className="max-[760px]:hidden">
          {isMuted ? labels.unmute : labels.mute}
        </span>
      </button>
      <button
        className={baseButtonClassName}
        onClick={onSwitchCamera}
        disabled={isSwitchingCamera}
        aria-label={labels.flipAria}
      >
        <SwitchCamera
          className="h-[18px] w-[18px] shrink-0"
          aria-hidden="true"
        />
        <span className="max-[760px]:hidden">
          {isSwitchingCamera ? labels.flipping : labels.flip}
        </span>
      </button>
      <button
        className={clsx(
          baseButtonClassName,
          "text-white border-[#ff9f9f66] bg-[linear-gradient(145deg,#ed5b5b8f,#c9363685)]",
        )}
        onClick={onEndCall}
        aria-label={labels.endAria}
      >
        <Phone
          className="h-[18px] w-[18px] shrink-0 rotate-[130deg]"
          aria-hidden="true"
        />
        <span className="max-[760px]:hidden">{labels.end}</span>
      </button>
    </div>
  );
}
