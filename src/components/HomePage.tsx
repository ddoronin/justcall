import { useNavigate } from "react-router-dom";
import { useState } from "react";

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
        <p>FaceTime-style calls in one tap.</p>
        <button className="primary" onClick={startCall}>
          Start Call
        </button>

        <div className="join-block">
          <input
            value={joinValue}
            onChange={(event) => setJoinValue(event.target.value)}
            placeholder="Paste call link or room ID"
            aria-label="Call link or room ID"
          />
          <button className="glass icon-button" onClick={joinCall}>
            Join Call
          </button>
        </div>
      </div>
    </main>
  );
}
