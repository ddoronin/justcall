import { Maximize2, Minimize2 } from "lucide-react";
import type { RemoteViewMode } from "../../store/callUiStore";

type ViewModeToggleProps = {
  remoteViewMode: RemoteViewMode;
  onToggle: () => void;
  fitAriaLabel: string;
  fillAriaLabel: string;
  fitLabel: string;
  fillLabel: string;
};

export default function ViewModeToggle({
  remoteViewMode,
  onToggle,
  fitAriaLabel,
  fillAriaLabel,
  fitLabel,
  fillLabel,
}: ViewModeToggleProps) {
  return (
    <button
      className="glass icon-button view-mode-toggle"
      onClick={onToggle}
      aria-label={remoteViewMode === "fill" ? fitAriaLabel : fillAriaLabel}
    >
      {remoteViewMode === "fill" ? (
        <Minimize2 className="control-icon" aria-hidden="true" />
      ) : (
        <Maximize2 className="control-icon" aria-hidden="true" />
      )}
      <span>{remoteViewMode === "fill" ? fitLabel : fillLabel}</span>
    </button>
  );
}
