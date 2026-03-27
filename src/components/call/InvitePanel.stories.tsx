import type { Meta, StoryObj } from "@storybook/react-vite";
import InvitePanel from "./InvitePanel";

const meta = {
  title: "Call/InvitePanel",
  component: InvitePanel,
  args: {
    visible: true,
    inviteLink: "https://just-call.app/call/story-room",
    shareAriaLabel: "Share invite link",
    shareLabel: "Share invite",
    copyAriaLabel: "Copy invite link",
    onShare: () => undefined,
    onCopy: () => undefined,
  },
} satisfies Meta<typeof InvitePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Hidden: Story = {
  args: {
    visible: false,
  },
};
