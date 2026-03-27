import type { Meta, StoryObj } from "@storybook/react-vite";
import CallControlsPanel from "./CallControlsPanel";

const meta = {
  title: "Call/CallControlsPanel",
  component: CallControlsPanel,
  args: {
    isVisible: true,
    isVideoOff: false,
    isMuted: false,
    isSwitchingCamera: false,
    onToggleVideo: () => undefined,
    onToggleMute: () => undefined,
    onSwitchCamera: () => undefined,
    onEndCall: () => undefined,
    labels: {
      videoOnAria: "Enable video",
      videoOffAria: "Disable video",
      videoOn: "Video on",
      videoOff: "Video off",
      unmuteAria: "Unmute microphone",
      muteAria: "Mute microphone",
      unmute: "Unmute",
      mute: "Mute",
      flipAria: "Switch camera",
      flipping: "Switching...",
      flip: "Flip",
      endAria: "End call",
      end: "End",
    },
  },
} satisfies Meta<typeof CallControlsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MutedAndVideoOff: Story = {
  args: {
    isMuted: true,
    isVideoOff: true,
  },
};

export const Hidden: Story = {
  args: {
    isVisible: false,
  },
};
