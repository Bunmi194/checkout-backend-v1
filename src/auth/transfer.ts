import { z } from "zod";

export const validateTransferDetails = z.object({
    amount: z.string({
        required_error: "Amount is required"
    }),
    accountNumber: z.string({
        required_error: "Phone number is required"
    }),
    currency: z.string({
        required_error: "Currency is required"
    })
});