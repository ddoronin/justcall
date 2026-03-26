import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Video } from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();
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
        <h1>JustCall</h1>
        <p>Simple video calls, just a tap away.</p>
        <button className="primary home-start-button" onClick={startCall}>
          <Video className="home-start-icon" aria-hidden="true" />
          <span>Start Video Call</span>
        </button>
      </div>
    </main>
  );
}
