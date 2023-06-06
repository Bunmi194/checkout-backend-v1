export const emailBroadcastFunction = (appName: string, content: string) => {
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ${appName}</title>
      <style>
        /* CSS styles for the email */
        body {
          font-family: Arial, sans-serif;
          background-color: #f2f2f2;
          margin: 0;
          padding: 0;
        }
        .checkout__logo__wrapper{
        	display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .logo {
        	width: 80px;
            height: 80px;
        }
        
        .content {
          margin-bottom: 30px;
        }
        
        .button {
          display: inline-block;
          background-color: #007bff;
          color: #ffffff !important;
          padding: 12px 20px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        }
        .checkout__name{
        	font-size: 24px;
            padding-bottom: 40px;
            font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="checkout__logo__wrapper">
        	<div class="header">
          <img src="https://res.cloudinary.com/dsc6pgrgv/image/upload/v1685547693/checkout_u1gqlx.png" alt="Checkout App Logo" class="logo">
        </div>
        <div>
        	<h3 class="checkout__name">Checkout</h3>
        </div>
        </div>
        <div class="content">
          <h2>Notification on your ${appName} account</h2>
          <p>${content}</p>
          <p><a href="http://localhost:3000/" class="button">Login your Account</a></p>
        </div>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>${appName} Team</p>
      </div>
    </body>
    </html>
    `
  }
