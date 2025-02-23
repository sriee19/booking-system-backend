import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const UpdateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phoneno: z.string().optional(),
});

export const CreateBookingSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  calendarDate: z.string(),
  fileurl: z.string().optional(),
});

export const UpdateBookingSchema = z.object({
    status: z.string().optional(),
    paymentStatus: z.string().optional(),
  });