import { z } from "zod";

export const validateUserInputOnSignup = z.object({
    firstName: z.string({
        required_error: "First name is required"
    }),
    lastName: z.string({
        required_error: "Last name is required"
    }),
    email: z.string({
        required_error: "Email is required"
    }).email("Invalid email"),
    password: z.string({
        required_error: "Password is required"
    }).min(5, "Password length must be greater than 5"),
    confirmPassword: z.string({
        required_error: "Password is required"
    }).min(5, "Password length must be greater than 5"),
    balance: z.number().default(0),
});

export const validateUserInputOnLogin = z.object({
    email: z.string({
        required_error: "Email is required"
    }).email("Invalid email"),
    password: z.string({
        required_error: "Password is required"
    }).min(5, "Password length must be greater than 5"),
});

export const validateToken = z.object({
    token: z.string({
        required_error: "Token is required"
    })
});
export const validateFundWalletDetails = z.object({
    amount: z.string({
        required_error: "Amount is required"
    }),
    phoneNumber: z.string({
        required_error: "Phone number is required"
    }),
    booking: z.string({
        required_error: "Booking is required"
    }),
    currency: z.string({
        required_error: "Currency is required"
    }),
    gateway: z.string({
        required_error: "Currency is required"
    }),
});
