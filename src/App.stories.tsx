import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

const meta = {
  title: "App/App",
  component: App,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof App>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HomeRoute: Story = {};

export const UnknownRouteRedirectsHome: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/unknown"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
};
