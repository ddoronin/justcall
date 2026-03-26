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
    <div className="invite-center-wrap" role="status" aria-live="polite">
      <div className="glass invite-center-card">
        <button
          className="glass primary invite-center-button"
          onClick={onShare}
          aria-label={shareAriaLabel}
        >
          <Share2 className="invite-cta-icon" aria-hidden="true" />
          <span>{shareLabel}</span>
        </button>

        <div className="invite-link-row">
          <p className="invite-center-url" title={inviteLink}>
            {inviteLink}
          </p>
          <button
            className="glass icon-button invite-copy-button"
            onClick={onCopy}
            aria-label={copyAriaLabel}
          >
            <Copy className="invite-copy-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
