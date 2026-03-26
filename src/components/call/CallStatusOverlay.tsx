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
      <div className="absolute left-3 top-[max(12px,env(safe-area-inset-top))] z-[4] flex items-center gap-3">
        <div className="glass max-w-[min(68vw,420px)] truncate rounded-full px-4 py-[10px] text-sm text-[#edf2ff]">
          {statusLabel}
        </div>
      </div>

      {errorMessage ? (
        <p
          className="glass absolute left-3 right-3 top-[max(72px,calc(env(safe-area-inset-top)+60px))] z-[3] m-0 rounded-xl border-[#ff9f9f66] bg-[linear-gradient(145deg,#ed5b5b8f,#c9363685)] px-3 py-2.5 text-sm text-[#ffd4d4] max-[760px]:max-w-none min-[761px]:max-w-[min(calc(100%-220px),720px)]"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {shareNotice ? (
        <p className="glass absolute bottom-[max(96px,calc(env(safe-area-inset-bottom)+84px))] left-3 right-3 z-[5] m-0 rounded-xl px-3 py-2.5 text-sm text-[#def7e9] max-[760px]:bottom-[max(178px,calc(env(safe-area-inset-bottom)+166px))]">
          {shareNotice}
        </p>
      ) : null}
    </>
  );
}
