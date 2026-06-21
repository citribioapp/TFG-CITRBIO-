export interface AdminUserSummary {
  id: number;
  name: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string | null;
  deliveryAddress: string | null;
  roles: string[];
  createdAt: string;
}

export interface UpdateUserRolesRequest {
  roles: string[];
}
