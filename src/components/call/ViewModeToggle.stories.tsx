import type { Meta, StoryObj } from "@storybook/react-vite";
import ViewModeToggle from "./ViewModeToggle";

const meta = {
  title: "Call/ViewModeToggle",
  component: ViewModeToggle,
  args: {
    isVisible: true,
    remoteViewMode: "fit",
    onToggle: () => undefined,
    fitAriaLabel: "Fit remote video",
    fillAriaLabel: "Fill remote video",
    fitLabel: "Fit",
    fillLabel: "Fill",
  },
} satisfies Meta<typeof ViewModeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FitMode: Story = {};

export const FillMode: Story = {
  args: {
    remoteViewMode: "fill",
  },
};

export const Hidden: Story = {
  args: {
    isVisible: false,
  },
};
