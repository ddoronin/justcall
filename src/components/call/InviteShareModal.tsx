type InviteShareModalProps = {
  open: boolean;
  inviteLink: string;
  title: string;
  subtitle: string;
  copyButtonLabel: string;
  shareButtonLabel: string;
  onClose: () => void;
  onCopy: () => void;
  onShare: () => void;
};

export default function InviteShareModal({
  open,
  inviteLink,
  title,
  subtitle,
  copyButtonLabel,
  shareButtonLabel,
  onClose,
  onCopy,
  onShare,
}: InviteShareModalProps) {
  if (!open) return null;

  return (
    <section
      className="fixed inset-0 z-20 grid place-items-end bg-[radial-gradient(circle_at_50%_12%,#9ec5ff1a,#04050baa_58%)] p-4 backdrop-blur-[6px]"
      onClick={onClose}
    >
      <div
        className="glass relative mb-[max(0px,env(safe-area-inset-bottom))] grid w-[min(520px,100%)] gap-2.5 overflow-hidden rounded-[20px] border border-white/25 bg-[linear-gradient(150deg,#ffffff2d,#ffffff14_45%,#a3b8ff18_100%)] p-4 shadow-[0_20px_44px_#02030a6b,inset_0_1px_0_#ffffff3d] max-[760px]:w-full max-[760px]:rounded-t-[18px] max-[760px]:rounded-b-none"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="m-0 text-xl">{title}</h2>
        <p className="m-0 text-[#dbe3ff]">{subtitle}</p>
        <input
          value={inviteLink}
          readOnly
          className="w-full rounded-xl border border-white/15 bg-white/10 p-3 text-[#f5f7ff] outline-none placeholder:text-[#d3d8ee96]"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <button
            className="btn-interactive glass inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-3 font-semibold"
            onClick={onCopy}
          >
            {copyButtonLabel}
          </button>
          <button
            className="btn-interactive glass inline-flex min-h-[44px] items-center justify-center rounded-xl border-0 bg-[linear-gradient(140deg,#35d069,#16a34a)] px-4 py-3 font-bold text-white"
            onClick={onShare}
          >
            {shareButtonLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
