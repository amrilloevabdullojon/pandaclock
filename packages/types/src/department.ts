/** Структурные подразделения tenant. */

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  headId: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentTree extends Department {
  children: DepartmentTree[];
  employeeCount: number;
}
