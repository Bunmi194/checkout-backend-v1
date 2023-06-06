import request from "request";
import dotenv from "dotenv";
require("dotenv").config();

const token = process.env.PAYSTACK_API_SECRET_KEY_TEST || "sk_test_1c6935580e77aee5f31ad70219030a3ea7dd09ab";

export const initializePaymentPaystack = (formData: any, callback: Function) => {
    // console.log("formData: ", formData._previousDataValues);
    const options = {
        url: "https://api.paystack.co/transaction/initialize",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "cache-control": "no-cache",
        },
        body: JSON.parse(formData),
        json: true
    }

    const myCallback = (error: any, response: any, body: any) => {
        return callback(error, body);
    }
    request.post(options, myCallback);
};


export const verifyPaymentPaystack = (referenceId: string, callback: Function) => {
    const options = {
        url: `https://api.paystack.co/transaction/verify/${referenceId}`,
        headers: {
            "authorization": `Bearer ${token}`,
            "cache-control": "no-cache"
        }
    };

    const myCallback = (error: any, response: any, body: any) => {
        return callback(error, body);
    };

    request(options, myCallback);
}

