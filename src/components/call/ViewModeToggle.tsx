import { Maximize2, Minimize2 } from "lucide-react";
import clsx from "clsx";
import type { RemoteViewMode } from "../../store/callUiStore";

type ViewModeToggleProps = {
  isVisible: boolean;
  remoteViewMode: RemoteViewMode;
  onToggle: () => void;
  fitAriaLabel: string;
  fillAriaLabel: string;
  fitLabel: string;
  fillLabel: string;
};

export default function ViewModeToggle({
  isVisible,
  remoteViewMode,
  onToggle,
  fitAriaLabel,
  fillAriaLabel,
  fitLabel,
  fillLabel,
}: ViewModeToggleProps) {
  return (
    <button
      className={clsx(
        "btn-interactive glass absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-1/2 z-[6] inline-flex min-h-[46px] -translate-x-1/2 items-center justify-center gap-2 rounded-full px-[14px] py-[10px] transition-all duration-300 ease-out max-[760px]:bottom-[max(98px,calc(env(safe-area-inset-bottom)+86px))] max-[760px]:min-h-[44px] max-[760px]:px-3 max-[760px]:py-2",
        isVisible
          ? "opacity-100 translate-y-0"
          : "pointer-events-none opacity-0 translate-y-8",
      )}
      onClick={onToggle}
      aria-label={remoteViewMode === "fill" ? fitAriaLabel : fillAriaLabel}
      aria-hidden={!isVisible}
    >
      {remoteViewMode === "fill" ? (
        <Minimize2 className="h-[18px] w-[18px]" aria-hidden="true" />
      ) : (
        <Maximize2 className="h-[18px] w-[18px]" aria-hidden="true" />
      )}
      <span>{remoteViewMode === "fill" ? fitLabel : fillLabel}</span>
    </button>
  );
}
