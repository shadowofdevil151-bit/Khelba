import { z } from "zod";

export const AuthValidator = {
  registerSchema: z.object({
    body: z.object({
      username: z.string().trim().min(3, "Username must contain 3 characters."),
      email: z.string().trim().toLowerCase().email("Invalid email address."),
      password: z.string().trim().min(4, "Password must contain 4 characters.")
    })
  }),

  loginSchema: z.object({
    body: z.object({
      email: z.string().trim().toLowerCase().email("Invalid email address."),
      password: z.string().trim().min(4, "Invalid password.")
    })
  }),

  resetPasswordSchema: z.object({
    params: z.object({
      token: z
        .string()
        .trim()
        .length(64, "Invalid token format.") // 32 bytes in hex = 64 characters
        .regex(/^[a-f0-9]+$/, "Invalid token format.") // Ensures it is a valid hex string
    }),
    body: z.object({
      password: z
        .string()
        .trim()
        .min(4, "Password must be at least 4 characters long.") // Upgraded for security
        .max(100, "Password is too long.") // Prevents long password Denial of Service (DoS) attacks
    })
  }),

  verifyEmailSchema: z.object({
    params: z.object({
      token: z
        .string()
        .trim()
        .length(64, "Invalid token format.") // 32 bytes in hex = 64 characters
        .regex(/^[a-f0-9]+$/, "Invalid token format.") // Ensures it is a valid hex string
    }),
  }),

  forgotPasswordSchema: z.object({
    body: z.object({
      email: z.string().trim().toLowerCase().email("Invalid email address."),

    })
  }),

  changePasswordSchema: z.object({
    body: z.object({
      currentPassword: z
        .string()
        .trim()
        .min(4, "Password must be at least 4 characters long.") // Upgraded for security
        .max(100, "Password is too long."), // Prevents long password Denial of Service (DoS) attacks
      newPassword: z
        .string()
        .trim()
        .min(4, "Password must be at least 4 characters long.") // Upgraded for security
        .max(100, "Password is too long.") // Prevents long password Denial of Service (DoS) attacks
    })
  }),

  emailSchema: z.object({
    body: z.object({
      email: z.string().trim().toLowerCase().email("Invalid email address.")
    })
  }),
};
