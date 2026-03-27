import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CallPage from "./CallPage";

type WebApiBackup = {
  WebSocket?: typeof WebSocket;
  RTCPeerConnection?: typeof RTCPeerConnection;
  RTCSessionDescription?: typeof RTCSessionDescription;
  RTCIceCandidate?: typeof RTCIceCandidate;
  mediaDevices?: MediaDevices;
  share?: Navigator["share"];
  clipboard?: Navigator["clipboard"];
};

function setupCallPageMocks(): () => void {
  const backup: WebApiBackup = {
    WebSocket: globalThis.WebSocket,
    RTCPeerConnection: globalThis.RTCPeerConnection,
    RTCSessionDescription: globalThis.RTCSessionDescription,
    RTCIceCandidate: globalThis.RTCIceCandidate,
    mediaDevices: navigator.mediaDevices,
    share: navigator.share,
    clipboard: navigator.clipboard,
  };

  class MockWebSocket extends EventTarget {
    static readonly OPEN = 1;
    static readonly CLOSED = 3;
    readonly OPEN = MockWebSocket.OPEN;
    readyState = MockWebSocket.OPEN;

    constructor(_url: string) {
      super();
      window.setTimeout(() => {
        this.dispatchEvent(new Event("open"));
      }, 0);
    }

    send(_data: string) {
      return undefined;
    }

    close() {
      this.readyState = MockWebSocket.CLOSED;
      this.dispatchEvent(new CloseEvent("close"));
    }
  }

  class MockRTCSessionDescription {
    type: RTCSdpType;
    sdp?: string;

    constructor(init: RTCSessionDescriptionInit) {
      this.type = init.type;
      this.sdp = init.sdp;
    }
  }

  class MockRTCIceCandidate {
    readonly candidate: RTCIceCandidateInit;

    constructor(candidate: RTCIceCandidateInit) {
      this.candidate = candidate;
    }

    toJSON() {
      return this.candidate;
    }
  }

  class MockPeerConnection {
    connectionState: RTCPeerConnectionState = "new";
    signalingState: RTCSignalingState = "stable";
    remoteDescription: RTCSessionDescription | null = null;
    localDescription: RTCSessionDescription | null = null;
    ontrack: RTCPeerConnection["ontrack"] = null;
    onicecandidate: RTCPeerConnection["onicecandidate"] = null;
    onconnectionstatechange: RTCPeerConnection["onconnectionstatechange"] =
      null;

    createOffer(): Promise<RTCSessionDescriptionInit> {
      return Promise.resolve({ type: "offer", sdp: "mock-offer" });
    }

    createAnswer(): Promise<RTCSessionDescriptionInit> {
      return Promise.resolve({ type: "answer", sdp: "mock-answer" });
    }

    setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
      this.localDescription = new MockRTCSessionDescription(
        description,
      ) as unknown as RTCSessionDescription;
      return Promise.resolve();
    }

    setRemoteDescription(
      description: RTCSessionDescriptionInit,
    ): Promise<void> {
      this.remoteDescription = new MockRTCSessionDescription(
        description,
      ) as unknown as RTCSessionDescription;
      return Promise.resolve();
    }

    addIceCandidate(_candidate: RTCIceCandidateInit): Promise<void> {
      return Promise.resolve();
    }

    getSenders(): RTCRtpSender[] {
      return [];
    }

    addTrack(): RTCRtpSender {
      return {} as RTCRtpSender;
    }

    close() {
      this.connectionState = "closed";
      this.signalingState = "closed";
    }
  }

  const mockedMediaDevices: MediaDevices = {
    ...navigator.mediaDevices,
    getUserMedia: async () => new MediaStream(),
  };

  Object.defineProperty(globalThis, "WebSocket", {
    configurable: true,
    writable: true,
    value: MockWebSocket,
  });
  Object.defineProperty(globalThis, "RTCPeerConnection", {
    configurable: true,
    writable: true,
    value: MockPeerConnection,
  });
  Object.defineProperty(globalThis, "RTCSessionDescription", {
    configurable: true,
    writable: true,
    value: MockRTCSessionDescription,
  });
  Object.defineProperty(globalThis, "RTCIceCandidate", {
    configurable: true,
    writable: true,
    value: MockRTCIceCandidate,
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: mockedMediaDevices,
  });
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: async () => undefined,
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => undefined,
    },
  });

  return () => {
    if (backup.WebSocket) {
      Object.defineProperty(globalThis, "WebSocket", {
        configurable: true,
        writable: true,
        value: backup.WebSocket,
      });
    }
    if (backup.RTCPeerConnection) {
      Object.defineProperty(globalThis, "RTCPeerConnection", {
        configurable: true,
        writable: true,
        value: backup.RTCPeerConnection,
      });
    }
    if (backup.RTCSessionDescription) {
      Object.defineProperty(globalThis, "RTCSessionDescription", {
        configurable: true,
        writable: true,
        value: backup.RTCSessionDescription,
      });
    }
    if (backup.RTCIceCandidate) {
      Object.defineProperty(globalThis, "RTCIceCandidate", {
        configurable: true,
        writable: true,
        value: backup.RTCIceCandidate,
      });
    }
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: backup.mediaDevices,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: backup.share,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: backup.clipboard,
    });
  };
}

function MockedCallPageStory() {
  useEffect(() => setupCallPageMocks(), []);

  return (
    <Routes>
      <Route path="/call/:roomId" element={<CallPage />} />
    </Routes>
  );
}

const meta = {
  title: "Pages/CallPage",
  component: CallPage,
} satisfies Meta<typeof CallPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MemoryRouter initialEntries={["/call/story-room"]}>
      <MockedCallPageStory />
    </MemoryRouter>
  ),
};
