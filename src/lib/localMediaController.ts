import type { MutableRefObject } from "react";

export type CameraMode = "front" | "back";

type MediaErrorMessages = {
  unsupportedBrowser: string;
  notAllowed: string;
  notFound: string;
  notReadable: string;
  security: string;
  startFailed: string;
};

type LocalMediaControllerDeps = {
  localVideoRef: MutableRefObject<HTMLVideoElement | null>;
  localStreamRef: MutableRefObject<MediaStream | null>;
  mediaStartPromiseRef: MutableRefObject<Promise<boolean> | null>;
  pcRef: MutableRefObject<RTCPeerConnection | null>;
  getCameraMode: () => CameraMode;
  getIsMuted: () => boolean;
  getIsVideoOff: () => boolean;
  setErrorMessage: (errorMessage: string | null) => void;
  onLocalVideoMetadata: (video: HTMLVideoElement | null) => void;
  messages: MediaErrorMessages;
};

function getVideoConstraintCandidates(
  mode: CameraMode,
): Array<boolean | MediaTrackConstraints> {
  if (mode === "back") {
    return [
      { facingMode: { exact: "environment" } },
      { facingMode: "environment" },
      true,
    ];
  }

  return [{ facingMode: "user" }, true];
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function syncLocalTracksToPeerConnection(
  pc: RTCPeerConnection,
  stream: MediaStream,
) {
  stream.getTracks().forEach((track) => {
    const sender = pc
      .getSenders()
      .find((existingSender) => existingSender.track?.kind === track.kind);

    if (sender) {
      void sender.replaceTrack(track);
    } else {
      pc.addTrack(track, stream);
    }
  });
}

function getMediaErrorMessage(error: unknown, messages: MediaErrorMessages) {
  const mediaError = error as DOMException;

  if (mediaError?.name === "NotAllowedError") {
    return messages.notAllowed;
  }
  if (mediaError?.name === "NotFoundError") {
    return messages.notFound;
  }
  if (mediaError?.name === "NotReadableError") {
    return messages.notReadable;
  }
  if (mediaError?.name === "SecurityError") {
    return messages.security;
  }

  return messages.startFailed;
}

export function createLocalMediaController(deps: LocalMediaControllerDeps) {
  async function attachLocalMedia(mode: CameraMode) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new DOMException(
        deps.messages.unsupportedBrowser,
        "NotSupportedError",
      );
    }

    let lastError: unknown;

    for (const videoConstraint of getVideoConstraintCandidates(mode)) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: true,
        });
      } catch {
        try {
          return await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            audio: false,
          });
        } catch (error) {
          lastError = error;
        }
      }
    }

    throw lastError;
  }

  function syncLocalVideoElementWithStream(stream: MediaStream | null) {
    const videoElement = deps.localVideoRef.current;
    if (!videoElement) return;

    videoElement.srcObject = stream;
    if (stream) {
      void videoElement.play().catch(() => {
        // ignore autoplay promise rejections
      });
      deps.onLocalVideoMetadata(videoElement);
    }
  }

  function applyMediaPreferenceToStream(stream: MediaStream) {
    const audioEnabled = !deps.getIsMuted();
    const videoEnabled = !deps.getIsVideoOff();

    stream.getAudioTracks().forEach((track) => {
      track.enabled = audioEnabled;
    });

    stream.getVideoTracks().forEach((track) => {
      track.enabled = videoEnabled;
    });
  }

  async function startLocalMedia(
    mode: CameraMode = deps.getCameraMode(),
  ): Promise<boolean> {
    try {
      const stream = await attachLocalMedia(mode);
      const previousStream = deps.localStreamRef.current;

      applyMediaPreferenceToStream(stream);

      deps.localStreamRef.current = stream;
      deps.setErrorMessage(null);

      syncLocalVideoElementWithStream(stream);

      const pc = deps.pcRef.current;
      if (pc) {
        syncLocalTracksToPeerConnection(pc, stream);
      }

      if (previousStream && previousStream.id !== stream.id) {
        stopStream(previousStream);
      }

      return true;
    } catch (error) {
      deps.setErrorMessage(getMediaErrorMessage(error, deps.messages));
      return false;
    }
  }

  async function ensureLocalMediaStarted(): Promise<boolean> {
    if (deps.localStreamRef.current) return true;

    if (!deps.mediaStartPromiseRef.current) {
      deps.mediaStartPromiseRef.current = startLocalMedia().finally(() => {
        deps.mediaStartPromiseRef.current = null;
      });
    }

    return deps.mediaStartPromiseRef.current;
  }

  function setAudioEnabled(enabled: boolean) {
    deps.localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  function setVideoEnabled(enabled: boolean) {
    deps.localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  function hasVideoTrack() {
    const stream = deps.localStreamRef.current;
    return Boolean(stream && stream.getVideoTracks().length > 0);
  }

  return {
    startLocalMedia,
    ensureLocalMediaStarted,
    syncLocalTracksToPeerConnection,
    syncLocalVideoElementWithStream,
    setAudioEnabled,
    setVideoEnabled,
    hasVideoTrack,
  };
}
