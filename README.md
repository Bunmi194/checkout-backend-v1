# Checkout Backend V1

This branch contains the source code for Checkout Backend. Checkout is a fintech web application built with TypeScript, PostgreSQL for data persistence and ExpressJS. You can interact with some of my other projects on my [Portfolio](https://bunmioladipupo.vercel.app/).

## Dependencies

Please note that all dependencies used to build and deploy this project are free and as such, interacting with the live demo depends on the availability of the following services

- `render.com`: The backend was deployed on render for free
- `vercel.com`: The database and frontend were deployed on vercel for free
- `gmail.com`: The email service provider for signup and notifications.

## Live preview

This project is available live at [Checkout](https://checkout-frontend-three.vercel.app/). Feel free to interact with the live preview and contact me at `bunmidavids194@gmail.com` should there be any comments or suggestions for improvements.

Although it is advised that you sign up on the platform for full access (typically takes less than a minute to sign up with a google account), you can use the following details for fast access to the dashboard without having to sign up. 


**Caveat**
Please note that the details are for testing purposes only and there is a posibility that someone somewhere might be using the same details as you simultaneously which could distort your user experience.

- **Test Details**: 

No test details available.

## Sign up and log in

Please use an active email address to sign up as there would be need to verify your email address

## Account details

Your unique account details will appear on the Card on the top right for large screens while for small screens, please click on the menu icon on the top left and then select either of `Fund account`, `Transfer` or `Withdraw`. Your account number is the last ten digits after the asterisk. For `**** **10 1010 1010`, your account number is `1010101010`.

## Fund account

The API key for PayStack payment gateway is in test mode and as such, no real transaction is required. Just follow the prompt and you'd be fine.

## Transfer funds

You need to have the account number of the recipient to initiate a transfer. I used transaction queries to process the transfer and as such, the sender and recipient would both receive the transaction notification at the same time only after a successful transfer.

## Withdraw funds

To withdraw funds and send the money to your Nigerian Bank Account, please provide details of your account. Enter your account number and select your bank from the list of currently supported banks in Nigeria.

## Security

Amongst other security measures put in place for secure transactions, I implemented email verification/Google Oauth, OTP authentication and idempotency.

## Frontend

You can find the link to the frontend repository at [Checkout-Frontend](https://github.com/Bunmi194/checkoutFrontend).

## Closing

Thank you for stopping by. Checkout the live project at [Checkout](https://checkout-frontend-three.vercel.app/) and pay me a visit at [my portfolio](https://bunmioladipupo.vercel.app/)

```bash
checkout$ exit
``` 