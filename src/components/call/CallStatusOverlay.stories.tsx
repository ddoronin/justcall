import type { Meta, StoryObj } from "@storybook/react-vite";
import CallStatusOverlay from "./CallStatusOverlay";

const meta = {
  title: "Call/CallStatusOverlay",
  component: CallStatusOverlay,
  args: {
    isStatusVisible: true,
    statusLabel: "Waiting for participant",
    errorMessage: null,
    shareNotice: null,
  },
} satisfies Meta<typeof CallStatusOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    errorMessage: "Cannot connect to signaling server.",
  },
};

export const WithShareNotice: Story = {
  args: {
    shareNotice: "Invite link copied",
  },
};
