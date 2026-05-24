/** Пользователь внутри tenant. */

export type UserRole = "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN" | "OWNER";

export type UserStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  position: string | null;
  departmentId: string | null;
  managerId: string | null;
  hireDate: Date | null;
  birthDate: Date | null;
  citizenship: string | null;
  employmentType: EmploymentType | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  documents: UserDocument[];
}

export interface UserDocument {
  id: string;
  type: "PASSPORT" | "CONTRACT" | "DIPLOMA" | "MEDICAL" | "CERTIFICATE" | "OTHER";
  name: string;
  url: string;
  expiresAt: Date | null;
  uploadedAt: Date;
}
