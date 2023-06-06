import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_API_SECRET_KEY_TEST!, {
  apiVersion: "2022-11-15",
});

export const initializePaymentStripe = async (amount: number) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Fund Checkout Wallet",
          },
          unit_amount: amount * 100,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: "http://localhost:3000/dashboard",
    cancel_url: "http://localhost:3000/dashboard",
  });
  return session;
};
