import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";
import { Label } from "./label";

const meta: Meta<typeof Input> = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "Введите имя" },
};

export const Email: Story = {
  args: { type: "email", placeholder: "you@example.com" },
};

export const Password: Story = {
  args: { type: "password", placeholder: "Пароль" },
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-72 space-y-1.5">
      <Label htmlFor="email">Корпоративный email</Label>
      <Input id="email" type="email" placeholder="ivan@cloudit.uz" />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, value: "Недоступно" },
};
