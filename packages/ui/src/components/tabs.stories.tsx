import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta: Meta = {
  title: "Primitives/Tabs",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <Tabs defaultValue="profile" className="w-96">
      <TabsList>
        <TabsTrigger value="profile">Профиль</TabsTrigger>
        <TabsTrigger value="time">Время</TabsTrigger>
        <TabsTrigger value="tasks">Задачи</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="py-4 text-sm">
        Личные данные сотрудника.
      </TabsContent>
      <TabsContent value="time" className="py-4 text-sm">
        История отметок clock-in/out.
      </TabsContent>
      <TabsContent value="tasks" className="py-4 text-sm">
        Назначенные задачи.
      </TabsContent>
    </Tabs>
  ),
};
