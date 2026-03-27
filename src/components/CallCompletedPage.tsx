import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PhoneOff, Video } from "lucide-react";
import { useI18n } from "../i18n/provider";

type CompletedLocationState = {
  durationMs?: number;
};

function formatCallDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const paddedSeconds = String(seconds).padStart(2, "0");
  const paddedMinutes = String(minutes).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

export default function CallCompletedPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const location = useLocation();
  const state = location.state as CompletedLocationState | null;

  const startCall = () => {
    const roomId = crypto.randomUUID();
    navigate(`/call/${roomId}`);
  };

  const duration = useMemo(() => {
    const durationMs = state?.durationMs;
    if (typeof durationMs !== "number" || Number.isNaN(durationMs)) {
      return formatCallDuration(0);
    }

    return formatCallDuration(durationMs);
  }, [state?.durationMs]);

  return (
    <main className="grid min-h-dvh place-items-center p-6 max-[760px]:p-4">
      <div className="glass w-full max-w-[480px] rounded-[24px] p-7 text-center max-[760px]:rounded-[20px] max-[760px]:p-[22px]">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ef444430] text-[#fecaca]">
          <PhoneOff className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="mb-2 text-[30px] tracking-[0.2px] max-[760px]:text-[26px]">
          {t("call.completed.message")}
        </h1>

        <p className="mb-6 text-[15px] text-[#d9e1ff]">
          {t("call.completed.durationLabel")}: {duration}
        </p>

        <button
          className="btn-interactive inline-flex min-h-[50px] w-full items-center justify-center rounded-[14px] border-0 bg-[linear-gradient(140deg,#35d069,#16a34a)] px-4 py-3 font-bold text-white"
          onClick={startCall}
        >
          <Video className="mr-2 h-5 w-5" aria-hidden="true" />
          {t("home.startCall")}
        </button>
      </div>
    </main>
  );
}
