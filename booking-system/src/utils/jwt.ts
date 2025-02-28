import { sign, verify } from "hono/jwt";

export const generateToken = (payload: any, secret: string) => {
  return sign(payload, secret, "HS256");
};

export const verifyToken = (token: string, secret: string) => {
  return verify(token, secret, "HS256");
};