import { z } from "zod";

export const PaymentSchema = z.object({
  bookingUid: z.string().uuid(), // Booking UUID
  amount: z.number().positive(), // Payment amount
});