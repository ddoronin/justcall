import type { Translations } from "../types";

const enUS: Translations = {
  "home.title": "JustCall",
  "home.subtitle": "Simple video calls, just a tap away.",
  "home.startCall": "Start Video Call",
  "call.status.camera.requestingPermissions":
    "Waiting for camera permission...",
  "call.status.camera.initializing": "Initializing camera...",
  "call.status.camera.ready": "Camera is ready",
  "call.status.webrtc.connecting": "Establishing call connection...",
  "call.status.webrtc.waitingParticipant": "Waiting for someone to join",
  "call.status.connected": "Call connected",
  "call.status.ended": "Call ended",
  "call.error.default": "Something went wrong. Please refresh and try again.",
  "call.error.serverUnreachable":
    "Could not reach the call server. Please refresh and try again.",
  "call.error.roomFull": "This call is full. Please ask for a new call link.",
  "call.error.fallbackNetwork":
    "Using fallback network settings. If calls fail, check ICE/TURN env values.",
  "call.error.unstableConnection":
    "Connection is unstable. Waiting for call recovery...",
  "call.error.connectionLost":
    "Connection lost. Your network may block direct calls. Please refresh and try again.",
  "call.error.media.notAllowed":
    "Video/microphone permission was denied. Click Enable Video below after allowing access in browser settings.",
  "call.error.media.notFound": "No camera was found on this device.",
  "call.error.media.notReadable":
    "Video is busy in another app. Close other apps using camera and try again.",
  "call.error.media.security": "Video is blocked by browser security settings.",
  "call.error.media.startFailed":
    "Could not start camera/microphone. Click Enable Video to try again.",
  "call.error.media.unsupportedBrowser":
    "This browser does not support camera access.",
  "call.share.inviteCopied": "Invite link copied.",
  "call.share.copyFailed": "Could not copy link. Please copy it manually.",
  "call.share.opened": "Share opened.",
  "call.share.title": "Join my JustCall",
  "call.share.text": "Join my video call",
  "call.invite.shareAria": "Share invite link",
  "call.invite.shareCta": "Share call invite",
  "call.invite.copyAria": "Copy invite link",
  "call.view.fitAria": "Fit video into screen",
  "call.view.fillAria": "Fill screen with video",
  "call.view.fitLabel": "Fit to screen",
  "call.view.fillLabel": "Fill screen",
  "call.controls.videoOnAria": "Turn camera on",
  "call.controls.videoOffAria": "Turn camera off",
  "call.controls.videoOnLabel": "Video On",
  "call.controls.videoOffLabel": "Video Off",
  "call.controls.unmuteAria": "Unmute microphone",
  "call.controls.muteAria": "Mute microphone",
  "call.controls.unmuteLabel": "Unmute",
  "call.controls.muteLabel": "Mute",
  "call.controls.flipAria": "Flip camera",
  "call.controls.flippingLabel": "Flipping...",
  "call.controls.flipLabel": "Flip",
  "call.controls.endAria": "End call",
  "call.controls.endLabel": "End",
  "call.selfView.expandAria": "Expand self view",
  "call.selfView.collapseAria": "Collapse self view",
  "call.selfView.hideAria": "Hide self view",
  "call.selfView.showAria": "Show self view",
  "call.completed.message": "The video call completed.",
  "call.completed.durationLabel": "Call duration",
  "call.completed.goHome": "Go to home page",
};

export default enUS;
