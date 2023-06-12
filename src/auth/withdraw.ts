import { z } from "zod";

export const validateWithdrawalInputs = z.object({
    amount: z.string({
        required_error: "Amount is required"
    }),
    bankAccount: z.string({
        required_error: "BankAccount is required"
    }),
    bank: z.string({
        required_error: "Bank is required"
    }),
    currency: z.string({
        required_error: "Currency is required"
    })
})