import type { Meta, StoryObj } from "@storybook/react-vite";
import { Inbox, Search } from "lucide-react";
import { EmptyState } from "./empty-state";
import { Button } from "./button";

const meta: Meta<typeof EmptyState> = {
  title: "Patterns/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: <Inbox />,
    title: "Пока нет уведомлений",
    description: "Здесь появятся события из задач, заявок и команды",
  },
};

export const WithAction: Story = {
  args: {
    icon: <Search />,
    title: "Ничего не найдено",
    description: "Попробуйте сменить фильтры или сбросить их",
    action: <Button variant="outline">Сбросить фильтры</Button>,
  },
};

export const Compact: Story = {
  args: {
    icon: <Inbox />,
    title: "Пусто",
    description: "Внутри карточки",
    compact: true,
  },
};
