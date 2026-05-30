import type { Meta, StoryObj } from "@storybook/react-vite";
import { Users } from "lucide-react";
import { PageHeader } from "./page-header";
import { Button } from "./button";

const meta: Meta<typeof PageHeader> = {
  title: "Patterns/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof PageHeader>;

export const Full: Story = {
  args: {
    title: "Сотрудники",
    description: "В команде 142 человека",
    icon: <Users className="h-6 w-6" />,
    actions: <Button>Пригласить</Button>,
    breadcrumbs: (
      <nav className="text-muted-foreground text-xs">
        Dashboard / <span className="text-foreground font-semibold">Сотрудники</span>
      </nav>
    ),
  },
};

export const TitleOnly: Story = {
  args: { title: "Уведомления" },
};
