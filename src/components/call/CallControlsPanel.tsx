import {
  Mic,
  MicOff,
  Phone,
  SwitchCamera,
  Video,
  VideoOff,
} from "lucide-react";

type CallControlsPanelProps = {
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
  isVideoOff,
  isMuted,
  isSwitchingCamera,
  onToggleVideo,
  onToggleMute,
  onSwitchCamera,
  onEndCall,
  labels,
}: CallControlsPanelProps) {
  return (
    <div className="controls-float glass">
      <button
        className={`glass icon-button control-button ${isVideoOff ? "is-active" : ""}`}
        onClick={onToggleVideo}
        aria-pressed={isVideoOff}
        aria-label={isVideoOff ? labels.videoOnAria : labels.videoOffAria}
      >
        {isVideoOff ? (
          <VideoOff className="control-icon" aria-hidden="true" />
        ) : (
          <Video className="control-icon" aria-hidden="true" />
        )}
        <span className="control-label">
          {isVideoOff ? labels.videoOn : labels.videoOff}
        </span>
      </button>
      <button
        className={`glass icon-button control-button ${isMuted ? "is-active" : ""}`}
        onClick={onToggleMute}
        aria-pressed={isMuted}
        aria-label={isMuted ? labels.unmuteAria : labels.muteAria}
      >
        {isMuted ? (
          <MicOff className="control-icon" aria-hidden="true" />
        ) : (
          <Mic className="control-icon" aria-hidden="true" />
        )}
        <span className="control-label">
          {isMuted ? labels.unmute : labels.mute}
        </span>
      </button>
      <button
        className="glass icon-button control-button"
        onClick={onSwitchCamera}
        disabled={isSwitchingCamera}
        aria-label={labels.flipAria}
      >
        <SwitchCamera className="control-icon" aria-hidden="true" />
        <span className="control-label">
          {isSwitchingCamera ? labels.flipping : labels.flip}
        </span>
      </button>
      <button
        className="glass danger icon-button control-button end-button"
        onClick={onEndCall}
        aria-label={labels.endAria}
      >
        <Phone className="control-icon end-call-icon" aria-hidden="true" />
        <span className="control-label">{labels.end}</span>
      </button>
    </div>
  );
}
