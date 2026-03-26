import { Copy, Share2 } from "lucide-react";

type InvitePanelProps = {
  visible: boolean;
  inviteLink: string;
  shareAriaLabel: string;
  shareLabel: string;
  copyAriaLabel: string;
  onShare: () => void;
  onCopy: () => void;
};

export default function InvitePanel({
  visible,
  inviteLink,
  shareAriaLabel,
  shareLabel,
  copyAriaLabel,
  onShare,
  onCopy,
}: InvitePanelProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute left-3 right-3 top-1/2 z-[4] flex -translate-y-1/2 justify-center max-[760px]:left-4 max-[760px]:right-4 max-[760px]:top-[56%] max-[760px]:-translate-y-[56%]"
      role="status"
      aria-live="polite"
    >
      <div className="glass grid w-[min(560px,94vw)] gap-3 rounded-[20px] p-3.5 max-[760px]:w-full max-[760px]:gap-2.5 max-[760px]:rounded-[18px] max-[760px]:p-3">
        <button
          className="btn-interactive glass inline-flex min-h-[58px] w-full items-center justify-center gap-[10px] rounded-2xl border-0 bg-[linear-gradient(140deg,#35d069,#16a34a)] px-4 py-3 text-[21px] font-extrabold text-white shadow-[0_12px_28px_#10964173,inset_0_1px_0_#b6ffd66e] max-[760px]:min-h-[54px] max-[760px]:text-[19px]"
          onClick={onShare}
          aria-label={shareAriaLabel}
        >
          <Share2 className="h-[22px] w-[22px]" aria-hidden="true" />
          <span>{shareLabel}</span>
        </button>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] border border-white/15 bg-[linear-gradient(140deg,#ffffff20,#ffffff12)] p-2">
          <p
            className="m-0 truncate px-1 text-sm text-[#ecf2ff] max-[760px]:text-[13px]"
            title={inviteLink}
          >
            {inviteLink}
          </p>
          <button
            className="btn-interactive glass inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl p-0"
            onClick={onCopy}
            aria-label={copyAriaLabel}
          >
            <Copy className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
