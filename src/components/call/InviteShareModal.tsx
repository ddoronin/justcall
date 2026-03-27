import { Copy, Share2, X } from "lucide-react";

type InviteShareModalProps = {
  open: boolean;
  title: string;
  inviteLink: string;
  shareAriaLabel: string;
  shareLabel: string;
  copyAriaLabel: string;
  copyLabel: string;
  closeAriaLabel: string;
  onShare: () => void;
  onCopy: () => void;
  onClose: () => void;
};

export default function InviteShareModal({
  open,
  title,
  inviteLink,
  shareAriaLabel,
  shareLabel,
  copyAriaLabel,
  copyLabel,
  closeAriaLabel,
  onShare,
  onCopy,
  onClose,
}: InviteShareModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#05060d99] p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="glass w-[min(520px,100%)] rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="m-0 text-lg font-semibold">{title}</h2>
          <button
            className="btn-interactive glass inline-flex h-9 w-9 items-center justify-center rounded-full p-0"
            onClick={onClose}
            aria-label={closeAriaLabel}
          >
            <X className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>

        <p
          className="mb-3 truncate rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-[#ecf2ff]"
          title={inviteLink}
        >
          {inviteLink}
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            className="btn-interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(140deg,#35d069,#16a34a)] px-4 py-2.5 text-white"
            onClick={onShare}
            aria-label={shareAriaLabel}
          >
            <Share2 className="h-[18px] w-[18px]" aria-hidden="true" />
            <span>{shareLabel}</span>
          </button>

          <button
            className="btn-interactive glass inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5"
            onClick={onCopy}
            aria-label={copyAriaLabel}
          >
            <Copy className="h-[18px] w-[18px]" aria-hidden="true" />
            <span>{copyLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
