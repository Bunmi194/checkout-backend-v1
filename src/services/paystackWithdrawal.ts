import request from "request";
import dotenv from "dotenv";
require("dotenv").config();

const token =
  process.env.PAYSTACK_API_SECRET_KEY_TEST ||
  "sk_test_1c6935580e77aee5f31ad70219030a3ea7dd09ab";

//verify the account number
export const verifyAccountNumber = (
  accountNumber: string,
  bankCode: string,
  callback: Function
) => {
  const options = {
    url: `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "cache-control": "no-cache",
    },
  };
  const myCallback = (err: any, body: any) => {
    return callback(err, body);
  };
  request(options, myCallback);
};

//create a transfer recipient
export const createTransferRecipient = (formData: any, callback: Function) => {
  // console.log("formDataLIIIITT: ", formData);
  const options = {
    url: `https://api.paystack.co/transferrecipient`,
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "cache-control": "no-cache",
    },
    body: JSON.stringify(formData),
  };
  const myCallback = (err: any, body: any) => {
    return callback(err, body);
  };
  request.post(options, myCallback);
};
//initiate a transfer

export const initiateTransfer = (formData: any, callback: Function) => {
  const options = {
    url: `https://api.paystack.co/transfer`,
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "cache-control": "no-cache",
    },
    body: JSON.stringify(formData),
  };
  const myCallback = (err: any, body: any) => {
    return callback(err, body);
  };
  request.post(options, myCallback);
};
//listen for transfer status
