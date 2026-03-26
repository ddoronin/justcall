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
    <main className="home-page">
      <div className="card glass">
        <h1>{t("home.title")}</h1>
        <p>{t("home.subtitle")}</p>
        <button className="primary home-start-button" onClick={startCall}>
          <Video className="home-start-icon" aria-hidden="true" />
          <span>{t("home.startCall")}</span>
        </button>
      </div>
    </main>
  );
}
