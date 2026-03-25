import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  const startCall = () => {
    const roomId = crypto.randomUUID();
    navigate(`/call/${roomId}`);
  };

  return (
    <main className="home-page">
      <div className="card">
        <h1>JustCall</h1>
        <p>Start a video call and send the link.</p>
        <button className="primary" onClick={startCall}>
          Start Call
        </button>
      </div>
    </main>
  );
}
