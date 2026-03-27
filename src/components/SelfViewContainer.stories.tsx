import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps, MutableRefObject } from "react";
import { useRef } from "react";
import SelfViewContainer from "./SelfViewContainer";

type SelfViewStoryArgs = Omit<
  ComponentProps<typeof SelfViewContainer>,
  "localVideoRef" | "selfViewRef"
>;

const meta = {
  title: "Call/SelfViewContainer",
  args: {
    isSelfViewHidden: false,
    restoreSelfView: () => undefined,
    isSelfViewExpanded: true,
    isDraggingSelfView: false,
    isSelfViewIdle: false,
    localAspectRatio: 16 / 9,
    selfViewWidth: 320,
    selfViewX: 24,
    selfViewY: 24,
    onPointerDown: () => undefined,
    onPointerMove: () => undefined,
    onPointerUp: () => undefined,
    onPointerCancel: () => undefined,
    onClick: () => undefined,
    onDoubleClick: () => undefined,
    onKeyDown: () => undefined,
    cameraMode: "front",
    onLocalVideoMetadata: () => undefined,
    isMuted: false,
    isVideoOff: false,
    isCameraInitializing: false,
    cameraInitializingLabel: "Initializing camera",
    onSwitchCamera: async () => undefined,
    onToggleVideo: async () => undefined,
    onHideSelfView: () => undefined,
  },
  render: (args) => {
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const selfViewRef = useRef<HTMLDivElement | null>(null);

    return (
      <div className="relative h-dvh w-full bg-black p-4">
        <SelfViewContainer
          {...args}
          localVideoRef={
            localVideoRef as MutableRefObject<HTMLVideoElement | null>
          }
          selfViewRef={selfViewRef as MutableRefObject<HTMLDivElement | null>}
        />
      </div>
    );
  },
} satisfies Meta<SelfViewStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {};

export const Compact: Story = {
  args: {
    isSelfViewExpanded: false,
    selfViewWidth: 180,
  },
};

export const Hidden: Story = {
  args: {
    isSelfViewHidden: true,
  },
};

export const WithStatusBadges: Story = {
  args: {
    isMuted: true,
    isVideoOff: true,
    cameraMode: "back",
  },
};

export const InitializingCamera: Story = {
  args: {
    isCameraInitializing: true,
  },
};
