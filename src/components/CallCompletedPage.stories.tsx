import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CallCompletedPage from "./CallCompletedPage";

const meta = {
  title: "Pages/CallCompletedPage",
  component: CallCompletedPage,
  render: () => (
    <Routes>
      <Route path="/call/:roomId/completed" element={<CallCompletedPage />} />
    </Routes>
  ),
} satisfies Meta<typeof CallCompletedPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDuration: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/call/story-room/completed",
            state: { durationMs: 5 * 60 * 1000 + 13 * 1000 },
          },
        ]}
      >
        <Story />
      </MemoryRouter>
    ),
  ],
};

export const WithoutDurationState: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/call/story-room/completed"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
};
