import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Video } from "lucide-react";
import { useI18n } from "../i18n/provider";

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [joinValue, setJoinValue] = useState("");

  const startCall = () => {
    const roomId = crypto.randomUUID();
    navigate(`/call/${roomId}`);
  };

  const joinCall = () => {
    const input = joinValue.trim();
    if (!input) return;

    let roomId = input;

    try {
      const parsed = new URL(input);
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "call" && parts[1]) {
        roomId = parts[1];
      }
    } catch {
      const match = input.match(/\/call\/([^/?#]+)/);
      if (match?.[1]) {
        roomId = match[1];
      }
    }

    navigate(`/call/${roomId}`);
  };

  return (
    <main className="relative grid min-h-dvh place-items-center p-6 max-[760px]:p-4">
      <div className="glass w-full max-w-[440px] rounded-[24px] p-7 text-center max-[760px]:rounded-[20px] max-[760px]:p-[22px]">
        <h1 className="mb-[10px] text-[32px] tracking-[0.3px]">
          {t("home.title")}
        </h1>
        <p className="m-0 whitespace-nowrap">{t("home.subtitle")}</p>
        <button
          className="btn-interactive mt-[18px] inline-flex min-h-[52px] w-full items-center justify-center gap-[10px] rounded-[14px] border-0 bg-[linear-gradient(140deg,#35d069,#16a34a)] px-4 py-3 text-white"
          onClick={startCall}
        >
          <Video className="h-5 w-5" aria-hidden="true" />
          <span>{t("home.startCall")}</span>
        </button>
      </div>
      <a
        href="https://github.com/ddoronin/justcall"
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub repository"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-white/45 transition hover:bg-white/5 hover:text-white/75 focus-visible:bg-white/5 focus-visible:text-white/80"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.72-4.04-1.41-4.04-1.41a3.18 3.18 0 0 0-1.34-1.76c-1.1-.75.08-.73.08-.73a2.52 2.52 0 0 1 1.84 1.23 2.57 2.57 0 0 0 3.5 1 2.58 2.58 0 0 1 .77-1.62c-2.67-.3-5.47-1.34-5.47-5.94a4.65 4.65 0 0 1 1.24-3.22 4.32 4.32 0 0 1 .12-3.18s1.01-.32 3.3 1.23a11.38 11.38 0 0 1 6.01 0c2.28-1.55 3.29-1.23 3.29-1.23a4.31 4.31 0 0 1 .12 3.18 4.64 4.64 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.49 5.93a2.9 2.9 0 0 1 .82 2.24v3.31c0 .32.21.7.83.58A12 12 0 0 0 12 .5Z" />
        </svg>
      </a>
    </main>
  );
}
