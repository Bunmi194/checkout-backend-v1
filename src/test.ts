// import axios from "axios";
// import {Request, Response, NextFunction} from "express"
// import { uuid } from "uuidv4";
// import dotenv from "dotenv"


// dotenv.config();

// const Flutterwave = require("flutterwave-node-v3");

// const token = process.env.FLUTTERWAVE_API_SECRET_KEY_TEST || "FLWSECK_TEST-25f9d923e1d66d20670c2846f88e4cdb-X";
// const publicKey = "FLWPUBK_TEST-61f4488e423858da2fe2f35dae6010cf-X";

// export const initializePayment = async (req: Request, res: Response) => {
//   console.log(req.body)
//   const email = req.body.email;
//   const phoneNumber = req.body.phone_number;
//   const booking = req.body.Booking;
//   const name = req.body.name;
//   const amount = Number(req.body.amount) || 100;
  
//   if (!email) {
//     return res.status(400).json({
//       message: "Email is required",
//     });
//   }
  
//   if (!phoneNumber) {
//     return res.status(400).json({
//       message: "Phone number is required",
//     });
//   }
  

//   const data = {
//     tx_ref: uuid(),
//     Booking: booking,
//     amount,
//     currency: "NGN",
//     redirect_url: "http://localhost:3000",
//     payment_options: "card",
//     customer: {
//       email,
//       phone_number: phoneNumber,
//       name,
//     },
//   };

//   try {
    
//     const response = await axios.post(
//       "https://api.flutterwave.com/v3/payments",
//       data,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );

//     res.send(response.data);
//   } catch (error) {
//     console.error(error);
//     throw error;
//   }
// };






// export const validatePayment = async (req: any, res: any) => {
//   const validate = req.params.transaction_id;

//   console.log("req:", req);

 
//   const id = req.query.transaction_id;
 

// //   console.log("Key: ", process.env.FLUTTERWAVE_PUBLIC_KEY);
// //   console.log("Secret Key: ", process.env.FLUTTERWAVE_SECRET_KEY);
//   const flw = new Flutterwave(
//     publicKey,
//     token
//   );
//   flw.Transaction.verify({ id: id })
//     .then(async (response: any) => {
//       console.log("id: ", response.data.status);

//       if (
//         response.data.status === "successful" &&
//         response.data.amount === response.data.charged_amount &&
//         response.data.currency === "NGN"
//       ) {
//         console.log("response: ", response);
//         //write to db
//         // await paymentModel.create({
//         //   email: response.data.customer.email,
//         //   phone_number: response.data.customer.phone_number,
//         //   name: response.data.customer.name
//         // });
//         //split payment
//         const splitPayment = [{
//           account_bank: "044",
//           account_number: "0690000037",
//           business_name: "FRSC",
//           business_email: "johnbull@gmail.com",
//           business_mobile: "09087930450",
//           country: "NG",
//           split_type: "percentage",
//           split_value: 0.7
//         },
//         {
//           account_bank: "045",
//           account_number: "0690000031",
//           business_name: "Law Enforcement",
//           business_email: "johndoe@gmail.com",
//           business_mobile: "09087930451",
//           country: "NG",
//           split_type: "percentage",
//           split_value: 0.1
//         },
//         {
//           account_bank: "045",
//           account_number: "0690000031",
//           business_name: "RoadbuddyTeam",
//           business_email: "johndoe@gmail.com",
//           business_mobile: "09087930451",
//           country: "NG",
//           split_type: "percentage",
//           split_value: 0.2
//         }
//       ];
//         const results = await Promise.all(splitPayment.map((details: any) =>
//           flw.Subaccount.create(details)
//           .then(console.log)
//           .catch(console.log)
//             // .then((result: any) => result)
//             // .catch((error: any) => error)
            
//         ));
//         console.log("result");

//         // return res.status(200)
        
//         //write to db
        

//         return res.status(200).json({ message: "transaction successful" });


//       } else {
//         console.log("response: ", response);
//         //fraud
//         return res.status(400).json({ message: "transaction failed" }); 
//       }
//     })
//     .catch((err: any) => {
//       //regular errors
//       return res.status(400).json({ message: "failed" });
//       console.log("id: ", err);
//     });
//   }

//     //split payment
// //    export const split = async (req: any,res :any ) => {

// //     console.log("req:", req);


// //     const splitPayment = [{
// //       account_bank: "044",
// //       account_number: "0690000037",
// //       business_name: "Flutterwave Developers",
// //       business_mobile: "09087930450",
// //       country: "NG",
// //       split_type: "percentage",
// //       split_value: 0.2
// //     }]

   
      
// //     const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);
// //     const results = await Promise.all(splitPayment.map((details: any) =>
// //   flw.Subaccount.create(details)
// //     .then((result: any) => result)
// //     .catch((error: any) => error)
// // ));

// // res.send(results);

    


// //   }




//   //  export const splitPayment = async (req: Request, res: Response) =>  {

   
// // const Flutterwave = require('flutterwave-node-v3');
// // const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);
// //  const details = [{
// //    account_bank: "044",
// //    account_number: "0690000037",
// //    business_name: "Flutterwave Developers",
// //    business_mobile: "09087930450",
// //    country: "NG",
// //    split_type: "percentage",
// //    split_value: 0.2
// // }];
// // try {
// //   const results = await Promise.all(splitPayment.map((details: any) =>
// //     flw.Subaccount.create(details)
// //       .then((result: any) => result)
// //       .catch((error: any) => error)
// //   ));

// //   res.send(results);
// // } catch (error) {
// //   console.error(error);
// //   res.status(500).send(error);
// // }

// // flw.Subaccount.create(details)
// //   .then(console.log)
// //   .catch(console.log);

// //  }