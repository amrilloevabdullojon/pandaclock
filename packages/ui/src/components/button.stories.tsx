import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive", "link"],
    },
    size: { control: "select", options: ["sm", "default", "lg", "icon"] },
    disabled: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: "Сохранить" },
};

export const Secondary: Story = {
  args: { variant: "secondary", children: "Отмена" },
};

export const Outline: Story = {
  args: { variant: "outline", children: "Загрузить" },
};

export const Destructive: Story = {
  args: { variant: "destructive", children: "Удалить" },
};

export const Ghost: Story = {
  args: { variant: "ghost", children: "Подробнее" },
};

export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      <Plus />
      Создать задачу
    </Button>
  ),
};

export const IconOnly: Story = {
  args: { size: "icon", "aria-label": "Удалить" },
  render: (args) => (
    <Button {...args}>
      <Trash2 />
    </Button>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, children: "Недоступно" },
};
