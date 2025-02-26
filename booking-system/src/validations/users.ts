import { z } from "zod";


export const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
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