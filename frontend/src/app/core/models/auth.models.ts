export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterRequest {
  name: string;
  lastName: string;
  dni: string;
  email: string;
  deliveryAddress: string;
  phone: string;
  password: string;
}

export interface UserProfile {
  id: number;
  name: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  roles: string[];
}

export interface UpdateProfileRequest {
  name?: string;
  lastName?: string;
  deliveryAddress?: string;
  phone?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
