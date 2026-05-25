export interface DemoUser {
  username: string;
  password: string;
}

export interface AuthUser {
  username: string;
}

export interface JwtPayload {
  sub: string;
  exp: number;
  iat: number;
}
