import type { Meta, StoryObj } from "@storybook/react-vite";
import InviteShareModal from "./InviteShareModal";

const meta = {
  title: "Call/InviteShareModal",
  component: InviteShareModal,
  args: {
    open: true,
    inviteLink: "https://just-call.app/call/story-room",
    title: "Share invite",
    shareAriaLabel: "Share invite link",
    shareLabel: "Share",
    copyAriaLabel: "Copy invite link",
    copyLabel: "Copy",
    closeAriaLabel: "Close share dialog",
    onShare: () => undefined,
    onCopy: () => undefined,
    onClose: () => undefined,
  },
} satisfies Meta<typeof InviteShareModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Closed: Story = {
  args: {
    open: false,
  },
};
