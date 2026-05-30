import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert, AlertDescription, AlertTitle } from "./alert";

const meta: Meta<typeof Alert> = {
  title: "Primitives/Alert",
  component: Alert,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "success", "warning", "danger", "neutral"],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Alert>;

export const Info: Story = {
  args: { variant: "info" },
  render: (args) => (
    <Alert {...args} className="w-96">
      <AlertTitle>Все системы работают</AlertTitle>
      <AlertDescription>API, БД и MinIO ответили за 230 мс.</AlertDescription>
    </Alert>
  ),
};

export const Success: Story = {
  args: { variant: "success" },
  render: (args) => (
    <Alert {...args} className="w-96">
      <AlertTitle>Заявка одобрена</AlertTitle>
      <AlertDescription>Anvar получит уведомление на email.</AlertDescription>
    </Alert>
  ),
};

export const Warning: Story = {
  args: { variant: "warning" },
  render: (args) => (
    <Alert {...args} className="w-96">
      <AlertTitle>Истекает срок</AlertTitle>
      <AlertDescription>Подписка кончается через 5 дней — продлите тариф.</AlertDescription>
    </Alert>
  ),
};

export const Danger: Story = {
  args: { variant: "danger" },
  render: (args) => (
    <Alert {...args} className="w-96">
      <AlertTitle>Не удалось сохранить</AlertTitle>
      <AlertDescription>Проверьте подключение и попробуйте ещё раз.</AlertDescription>
    </Alert>
  ),
};
