export type ClientSignalMessage =
  | { type: "join-room"; roomId: string }
  | { type: "offer"; roomId: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; roomId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; roomId: string; candidate: RTCIceCandidateInit }
  | { type: "leave"; roomId: string };

export type ServerSignalMessage =
  | {
      type: "joined";
      roomId: string;
      participantId: string;
      isInitiator: boolean;
    }
  | { type: "peer-joined"; roomId: string }
  | { type: "offer"; roomId: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; roomId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; roomId: string; candidate: RTCIceCandidateInit }
  | { type: "peer-left"; roomId: string }
  | { type: "room-full"; roomId: string }
  | { type: "error"; message: string };

export type CallStatus =
  | "Preparing your camera..."
  | "Waiting for Mom to join"
  | "Joining call..."
  | "Connecting call..."
  | "Call connected"
  | "Call ended";
