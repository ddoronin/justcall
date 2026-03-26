type CallStatusOverlayProps = {
  statusLabel: string;
  errorMessage: string | null;
  shareNotice: string | null;
};

export default function CallStatusOverlay({
  statusLabel,
  errorMessage,
  shareNotice,
}: CallStatusOverlayProps) {
  return (
    <>
      <div className="top-overlay">
        <div className="glass status-pill">{statusLabel}</div>
      </div>

      {errorMessage ? (
        <p className="glass error-banner" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {shareNotice ? <p className="glass share-notice">{shareNotice}</p> : null}
    </>
  );
}
