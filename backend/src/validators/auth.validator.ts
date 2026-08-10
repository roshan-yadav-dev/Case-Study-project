import { z } from "zod";

export const loginSchema = z.object({
    email: z
        .string({ message: "Email must be a string" })
        .trim()
        .toLowerCase()
        .min(1, "Email is required")
        .email("Invalid email format"),
    password: z
        .string({ message: "Password must be a string" })
        .min(1, "Password is required"),
});

export type LoginDto = z.infer<typeof loginSchema>;
