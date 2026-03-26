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
    <section className="modal-backdrop" onClick={onClose}>
      <div className="modal glass" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <input value={inviteLink} readOnly />
        <div className="modal-actions">
          <button className="glass icon-button" onClick={onCopy}>
            {copyButtonLabel}
          </button>
          <button className="glass primary share-button" onClick={onShare}>
            {shareButtonLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
