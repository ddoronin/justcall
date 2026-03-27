import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps, MutableRefObject } from "react";
import { useRef } from "react";
import RemoteVideoStage from "./RemoteVideoStage";

type RemoteVideoStageStoryArgs = Omit<
  ComponentProps<typeof RemoteVideoStage>,
  "remoteGestureLayerRef" | "remoteVideoRef"
>;

const meta = {
  title: "Call/RemoteVideoStage",
  args: {
    onStageClick: () => undefined,
    onTouchStart: () => undefined,
    onTouchMove: () => undefined,
    onTouchEnd: () => undefined,
    remoteViewMode: "fit",
    isPinchingRemote: false,
    isPanningRemote: false,
    remotePanOffset: { x: 0, y: 0 },
    remoteZoomScale: 1,
  },
  render: (args) => {
    const remoteGestureLayerRef = useRef<HTMLDivElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    return (
      <div className="h-dvh w-full bg-black">
        <RemoteVideoStage
          {...args}
          remoteGestureLayerRef={
            remoteGestureLayerRef as MutableRefObject<HTMLDivElement | null>
          }
          remoteVideoRef={
            remoteVideoRef as MutableRefObject<HTMLVideoElement | null>
          }
        />
      </div>
    );
  },
} satisfies Meta<RemoteVideoStageStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fit: Story = {};

export const Fill: Story = {
  args: {
    remoteViewMode: "fill",
  },
};

export const ZoomedAndPanned: Story = {
  args: {
    remoteViewMode: "fill",
    remoteZoomScale: 2,
    remotePanOffset: { x: 64, y: -32 },
    isPanningRemote: true,
  },
};
