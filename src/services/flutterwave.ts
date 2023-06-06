import request from "request";
import dotenv from "dotenv";
import Flutterwave from "flutterwave-node-v3";

require("dotenv").config();

const token = process.env.FLUTTERWAVE_API_SECRET_KEY_TEST || "FLWSECK_TEST-25f9d923e1d66d20670c2846f88e4cdb-X";
const publicKey = "FLWPUBK_TEST-61f4488e423858da2fe2f35dae6010cf-X";
const encryptionKey: string = "FLWSECK_TESTe843f37d9496";

export const initializePaymentFlutterwave = (formData: any, callback: Function) => {
    const options = {
        url: "https://api.flutterwave.com/v3/payments",
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "cache-control": "no-cache",
        },
        body: formData,
        json: true
    }

    const myCallback = (error: any, response: any, body: any) => {
        return callback(error, body);
    }
    request(options, myCallback);
};

export const verifyPaymentFlutterwave = (referenceId: string, callback: Function) => {
    const flw = new Flutterwave(
        publicKey,
        token
      );
      const myCallback = (err: any, result: any) => {
        return callback(err, result);
      };
    return flw.Transaction.verify({ id: referenceId }, myCallback);
}

export const encrypt = (payload: any) => {
    const text = JSON.stringify(payload);
    const forge = require("node-forge");
    const cipher = forge.cipher.createCipher(
        "3DES-ECB",
        forge.util.createBuffer(encryptionKey)
    );
    cipher.start({iv: ""});
    cipher.update(forge.util.createBuffer(text, "utf-8"));
    cipher.finish();
    const encrypted = cipher.output;
    return forge.util.encode64(encrypted.getBytes());
}

// import Flutterwave from 'flutterwave-node-v3';
// const flw = new Flutterwave(publicKey, token);

// export const initializePaymentFlutterwave = async () => {
//     const payload = {
//         card_number: '1234123412341234',
//         cvv: '323',
//         expiry_month: '10',
//         expiry_year: '28',
//         currency: 'NGN',
//         amount: '7500',
//         email: 'bunmidavids194@gmail.com',
//         fullname: 'Flutterwave Developers',
//         tx_ref: '12344556',
//         redirect_url: 'https://localhost:3000',
//         enckey: encryptionKey
//     }
    
//     return flw.Charge.card(payload)
//         .then((response:any) => {
//             console.log("response: ", response);
//             return response;
//         }
//         );
        
// }

// Install with: npm i flutterwave-node-v3

const flw = new Flutterwave(publicKey, token);

export const payWithUSSD = (payload:any, callback: Function) => {
    
    const myCallback = (result:any) => {
        return callback(result);
    }
    flw.Charge.ussd(payload)
        .then(myCallback)
        .catch(console.log);//
    
}
const verify = async () => {

    const transactionId = "4369355";
    const result = await flw.Transaction.verify({ id: transactionId });
    console.log("result: " + JSON.stringify(result));
};

verify();