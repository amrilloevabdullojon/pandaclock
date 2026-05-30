import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Button } from "./button";

const meta: Meta = {
  title: "Primitives/Card",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Активные сотрудники</CardTitle>
        <CardDescription>За последние 30 дней</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-extrabold">142</p>
        <p className="text-muted-foreground text-sm">+12% относительно прошлого месяца</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm">
          Подробнее
        </Button>
        <Button size="sm">Открыть</Button>
      </CardFooter>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card className="w-72">
      <CardContent className="p-5">
        <p className="text-foreground text-base font-semibold">Без header</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Карточка из одного CardContent — для виджетов dashboard.
        </p>
      </CardContent>
    </Card>
  ),
};
