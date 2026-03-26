import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./components/HomePage";
import CallPage from "./components/CallPage";
import CallCompletedPage from "./components/CallCompletedPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/call/:roomId" element={<CallPage />} />
      <Route path="/call/:roomId/completed" element={<CallCompletedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
