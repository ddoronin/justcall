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
    <main className="grid min-h-dvh place-items-center p-6 max-[760px]:p-4">
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
    </main>
  );
}
