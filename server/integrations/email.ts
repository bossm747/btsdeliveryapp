import sgMail from '@sendgrid/mail';

export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean>;
  sendOrderConfirmation(to: string, orderDetails: any): Promise<boolean>;
  sendWelcomeEmail(to: string, name: string): Promise<boolean>;
  sendEmailVerification(to: string, name: string, verificationToken: string): Promise<boolean>;
  sendPasswordReset(to: string, name: string, resetToken: string): Promise<boolean>;
}

// SendGrid Email Provider
export class SendGridProvider implements EmailProvider {
  private apiKeyAvailable: boolean;
  
  constructor() {
    this.apiKeyAvailable = !!process.env.SENDGRID_API_KEY;
    if (this.apiKeyAvailable) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    } else {
      console.warn("SendGrid API key not found. Email functionality will be disabled.");
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!this.apiKeyAvailable) {
      console.log(`Email would be sent to ${to} with subject: ${subject}`);
      console.log("SendGrid API key not available - email not sent in development mode");
      return true; // Return success in development mode
    }
    
    try {
      const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@btsdelivery.com',
        subject,
        text: text || subject,
        html,
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  async sendOrderConfirmation(to: string, orderDetails: any): Promise<boolean> {
    if (!this.apiKeyAvailable) {
      console.log(`Order confirmation email would be sent to ${to} for order ${orderDetails.orderNumber}`);
      return true; // Return success in development mode
    }
    
    const html = `
      <!DOCTYPE html>
      <html lang="tl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF6B35; color: white; padding: 20px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .order-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .item { padding: 10px 0; border-bottom: 1px solid #eee; }
          .total { font-size: 18px; font-weight: bold; color: #FF6B35; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { background-color: #004225; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">BTS Delivery</div>
            <p>Salamat sa inyong order!</p>
          </div>
          <div class="content">
            <h2>Order Confirmation #${orderDetails.orderNumber}</h2>
            <p>Kumusta ${orderDetails.customerName},</p>
            <p>Nakumpirma na ang inyong order at nagsimula na kaming maghanda nito.</p>
            
            <div class="order-details">
              <h3>Order Details:</h3>
              <p><strong>Restaurant:</strong> ${orderDetails.restaurantName}</p>
              <p><strong>Delivery Address:</strong> ${orderDetails.deliveryAddress}</p>
              <p><strong>Estimated Delivery:</strong> ${orderDetails.estimatedDelivery}</p>
              
              <h4>Items:</h4>
              ${orderDetails.items.map((item: any) => `
                <div class="item">
                  <span>${item.quantity}x ${item.name}</span>
                  <span style="float: right;">₱${item.price}</span>
                </div>
              `).join('')}
              
              <div class="total">
                <p>Subtotal: ₱${orderDetails.subtotal}</p>
                <p>Delivery Fee: ₱${orderDetails.deliveryFee}</p>
                <p>Total: ₱${orderDetails.total}</p>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="https://btsdelivery.com/track/${orderDetails.orderNumber}" class="button">
                Track Your Order
              </a>
            </div>
            
            <p>Para sa mga katanungan, kontakin kami sa support@btsdelivery.com o tawagan sa (043) 123-4567.</p>
          </div>
          <div class="footer">
            <p>© 2024 BTS Delivery - #1 Delivery Service sa Batangas Province</p>
            <p>Ang email na ito ay para kay ${to}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      BTS Delivery - Order Confirmation #${orderDetails.orderNumber}
      
      Salamat sa inyong order!
      
      Restaurant: ${orderDetails.restaurantName}
      Delivery Address: ${orderDetails.deliveryAddress}
      Total: ₱${orderDetails.total}
      
      Track your order: https://btsdelivery.com/track/${orderDetails.orderNumber}
    `;

    return await this.sendEmail(
      to,
      `Order Confirmation #${orderDetails.orderNumber} - BTS Delivery`,
      html,
      text
    );
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    if (!this.apiKeyAvailable) {
      console.log(`Welcome email would be sent to ${to} for ${name}`);
      return true; // Return success in development mode
    }
    
    const html = `
      <!DOCTYPE html>
      <html lang="tl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF6B35; color: white; padding: 30px; text-align: center; }
          .logo { font-size: 28px; font-weight: bold; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .feature { padding: 15px; margin: 10px 0; background-color: white; border-left: 4px solid #FFD23F; }
          .button { background-color: #004225; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">BTS Delivery</div>
            <h2>Maligayang Pagdating!</h2>
          </div>
          <div class="content">
            <h2>Kumusta ${name}! 👋</h2>
            <p>Salamat sa pag-sign up sa BTS Delivery - ang pinakamabilis at pinaka-reliable na delivery service sa buong Batangas Province!</p>
            
            <h3>Ano ang pwede mong gawin sa BTS Delivery?</h3>
            
            <div class="feature">
              <strong>🍕 Food Delivery</strong>
              <p>Order mula sa mga paboritong restaurants sa Batangas</p>
            </div>
            
            <div class="feature">
              <strong>🛒 Pabili Service</strong>
              <p>Ipabili ang kailangan mo mula sa grocery, pharmacy, at iba pa</p>
            </div>
            
            <div class="feature">
              <strong>💸 Pabayad Service</strong>
              <p>Bayaran ang bills nang walang pila</p>
            </div>
            
            <div class="feature">
              <strong>📦 Parcel Delivery</strong>
              <p>Magpadala ng packages sa buong Batangas</p>
            </div>
            
            <div style="text-align: center;">
              <a href="https://btsdelivery.com/order" class="button">
                Mag-Order Ngayon
              </a>
            </div>
            
            <h3>Special Welcome Offer!</h3>
            <p>Gamitin ang code <strong>WELCOME100</strong> para sa ₱100 OFF sa inyong first order!</p>
            
            <p>May tanong? Email kami sa support@btsdelivery.com o tawagan sa (043) 123-4567.</p>
          </div>
          <div class="footer">
            <p>© 2024 BTS Delivery - Lasa ng Batangas, Delivered Fresh</p>
            <p>Follow us on Facebook: @BTSDeliveryPH</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Maligayang Pagdating sa BTS Delivery, ${name}!
      
      Salamat sa pag-sign up sa BTS Delivery - ang #1 delivery service sa Batangas Province!
      
      Services available:
      - Food Delivery
      - Pabili Service
      - Pabayad Service
      - Parcel Delivery
      
      Welcome offer: Use code WELCOME100 for ₱100 OFF!
      
      Visit: https://btsdelivery.com
    `;

    return await this.sendEmail(
      to,
      `Maligayang Pagdating sa BTS Delivery, ${name}!`,
      html,
      text
    );
  }

  async sendEmailVerification(to: string, name: string, verificationToken: string): Promise<boolean> {
    if (!this.apiKeyAvailable) {
      console.log(`Email verification would be sent to ${to} for ${name}`);
      console.log(`Verification URL: ${process.env.BASE_URL || 'https://bts-delivery.replit.app'}/verify-email?token=${verificationToken}`);
      return true; // Return success in development mode
    }
    
    const verificationUrl = `${process.env.BASE_URL || 'https://bts-delivery.replit.app'}/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="tl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #004225; color: white; padding: 30px; text-align: center; }
          .logo { font-size: 28px; font-weight: bold; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .verification-box { padding: 25px; margin: 20px 0; background-color: white; border-radius: 8px; border-left: 4px solid #FF6B35; }
          .button { background-color: #FF6B35; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .security-note { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 4px; border-left: 4px solid #ffeaa7; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">BTS Delivery</div>
            <h2>Verify Your Email Address</h2>
          </div>
          <div class="content">
            <h2>Kumusta ${name}! 👋</h2>
            <p>Salamat sa pag-sign up sa BTS Delivery! Para ma-activate ang inyong account, kailangan namin i-verify ang inyong email address.</p>
            
            <div class="verification-box">
              <h3>🔐 Email Verification Required</h3>
              <p>Para ma-secure ang inyong account at ma-enjoy ang lahat ng services namin, i-click lang ang button sa baba:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">
                  ✅ Verify Email Address
                </a>
              </div>
              
              <p><small>O copy-paste ang link na ito sa inyong browser:</small></p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${verificationUrl}
              </p>
            </div>
            
            <div class="security-note">
              <strong>🛡️ Security Reminder:</strong>
              <ul>
                <li>Ang link na ito ay mag-expire sa loob ng 24 hours</li>
                <li>Hindi namin hihingin ang inyong password sa email</li>
                <li>I-report agad ang suspicious emails sa security@btsdelivery.com</li>
              </ul>
            </div>
            
            <p>Matapos i-verify ang email, makakagawa na kayo ng orders at ma-enjoy ang mga benefits:</p>
            <ul>
              <li>🚀 Mas mabilis na checkout</li>
              <li>📱 Order notifications sa phone at email</li>
              <li>⭐ Loyalty points para sa rewards</li>
              <li>🎯 Personalized recommendations</li>
            </ul>
            
            <p>Need help? Tawagan kami sa (043) 123-4567 o email sa support@btsdelivery.com</p>
          </div>
          <div class="footer">
            <p>© 2024 BTS Delivery - Lasa ng Batangas, Delivered Fresh</p>
            <p>Ang email na ito ay para kay ${to}</p>
            <p>Hindi kayo nag-sign up? <a href="mailto:support@btsdelivery.com">I-report dito</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      BTS Delivery - Email Verification Required
      
      Kumusta ${name}!
      
      Salamat sa pag-sign up sa BTS Delivery! Para ma-activate ang inyong account, i-verify ang inyong email address.
      
      I-click ang link na ito o copy-paste sa browser:
      ${verificationUrl}
      
      Security reminder:
      - Ang link ay mag-expire sa loob ng 24 hours
      - Hindi namin hihingin ang password sa email
      
      Need help? Tawagan kami sa (043) 123-4567
    `;

    return await this.sendEmail(
      to,
      "Verify Your Email - BTS Delivery",
      html,
      text
    );
  }

  async sendPasswordReset(to: string, name: string, resetToken: string): Promise<boolean> {
    if (!this.apiKeyAvailable) {
      console.log(`Password reset email would be sent to ${to} for ${name}`);
      console.log(`Reset URL: ${process.env.BASE_URL || 'https://bts-delivery.replit.app'}/reset-password?token=${resetToken}`);
      return true; // Return success in development mode
    }
    
    const resetUrl = `${process.env.BASE_URL || 'https://bts-delivery.replit.app'}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="tl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 30px; text-align: center; }
          .logo { font-size: 28px; font-weight: bold; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .reset-box { padding: 25px; margin: 20px 0; background-color: white; border-radius: 8px; border-left: 4px solid #dc3545; }
          .button { background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background-color: #f8d7da; padding: 15px; margin: 20px 0; border-radius: 4px; border-left: 4px solid #dc3545; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">BTS Delivery</div>
            <h2>🔐 Password Reset Request</h2>
          </div>
          <div class="content">
            <h2>Kumusta ${name}!</h2>
            <p>Nakatanggap kami ng request para i-reset ang password ng inyong BTS Delivery account.</p>
            
            <div class="reset-box">
              <h3>🔑 Reset Your Password</h3>
              <p>Para mag-create ng bagong password, i-click ang button sa baba:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">
                  🔓 Reset Password
                </a>
              </div>
              
              <p><small>O copy-paste ang link na ito sa inyong browser:</small></p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${resetUrl}
              </p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Information:</strong>
              <ul>
                <li>Ang link na ito ay mag-expire sa loob ng 1 hour</li>
                <li>Gamitin lang ang link kung kayo mismo ang nag-request</li>
                <li>Hindi namin hihingin ang current password sa email</li>
                <li>Mag-logout sa lahat ng devices pagkatapos mag-reset</li>
              </ul>
            </div>
            
            <h4>Hindi kayo nag-request ng password reset?</h4>
            <p>Kung hindi kayo ang nag-request nito, i-ignore lang ang email na ito. Ang inyong account ay secure pa rin. Para sa extra security, pwede ninyo ring:</p>
            <ul>
              <li>I-check ang recent login activity sa account settings</li>
              <li>I-update ang password regularly</li>
              <li>I-enable two-factor authentication</li>
            </ul>
            
            <p>May security concerns? I-contact agad kami sa security@btsdelivery.com o tawagan sa (043) 123-4567</p>
          </div>
          <div class="footer">
            <p>© 2024 BTS Delivery - Lasa ng Batangas, Delivered Fresh</p>
            <p>Ang email na ito ay para kay ${to}</p>
            <p>Security Alert: I-report ang suspicious activity sa security@btsdelivery.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      BTS Delivery - Password Reset Request
      
      Kumusta ${name}!
      
      Nakatanggap kami ng request para i-reset ang password ng inyong account.
      
      Para mag-reset ng password, i-click ang link na ito:
      ${resetUrl}
      
      Security Information:
      - Ang link ay mag-expire sa loob ng 1 hour
      - Gamitin lang kung kayo ang nag-request
      - I-ignore kung hindi kayo ang nag-request
      
      May questions? Tawagan kami sa (043) 123-4567
    `;

    return await this.sendEmail(
      to,
      "🔐 Password Reset Request - BTS Delivery",
      html,
      text
    );
  }
}

// Email Service
export class EmailService {
  private provider: EmailProvider;

  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      this.provider = new SendGridProvider();
    } else {
      console.warn("No email provider configured, using console output");
      // Fallback for development
      this.provider = {
        async sendEmail(to: string, subject: string, html: string, text?: string) {
          console.log(`Email to ${to}: ${subject}`);
          console.log("Content:", text || html);
          return true;
        },
        async sendOrderConfirmation(to: string, orderDetails: any) {
          console.log(`Order confirmation email to ${to}:`, orderDetails);
          return true;
        },
        async sendWelcomeEmail(to: string, name: string) {
          console.log(`Welcome email to ${to}: Welcome ${name}!`);
          return true;
        },
        async sendEmailVerification(to: string, name: string, verificationToken: string) {
          console.log(`Email verification to ${to}: Token ${verificationToken}`);
          return true;
        },
        async sendPasswordReset(to: string, name: string, resetToken: string) {
          console.log(`Password reset email to ${to}: Token ${resetToken}`);
          return true;
        }
      };
    }
  }

  async sendOrderConfirmation(email: string, orderDetails: any): Promise<boolean> {
    return await this.provider.sendOrderConfirmation(email, orderDetails);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    return await this.provider.sendWelcomeEmail(email, name);
  }

  async sendEmailVerification(email: string, name: string, verificationToken: string): Promise<boolean> {
    return await this.provider.sendEmailVerification(email, name, verificationToken);
  }

  async sendPasswordReset(email: string, name: string, resetToken: string): Promise<boolean> {
    return await this.provider.sendPasswordReset(email, name, resetToken);
  }

  async sendRiderNotification(email: string, orderDetails: any): Promise<boolean> {
    const subject = `New Delivery Assignment - Order #${orderDetails.orderNumber}`;
    const html = `
      <h3>New Delivery Assignment</h3>
      <p>Order #${orderDetails.orderNumber}</p>
      <p>Pickup: ${orderDetails.restaurantAddress}</p>
      <p>Delivery: ${orderDetails.deliveryAddress}</p>
      <p>Customer: ${orderDetails.customerName} - ${orderDetails.customerPhone}</p>
      <p>Amount to collect: ₱${orderDetails.totalAmount}</p>
    `;
    return await this.provider.sendEmail(email, subject, html);
  }

  async sendVendorOrderNotification(email: string, orderDetails: any): Promise<boolean> {
    const subject = `New Order #${orderDetails.orderNumber} - BTS Delivery`;
    const html = `
      <h3>New Order Received!</h3>
      <p>Order #${orderDetails.orderNumber}</p>
      <p>Customer: ${orderDetails.customerName}</p>
      <p>Items: ${orderDetails.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}</p>
      <p>Total: ₱${orderDetails.total}</p>
      <p>Delivery Address: ${orderDetails.deliveryAddress}</p>
      <p>Please confirm the order in your vendor dashboard.</p>
    `;
    return await this.provider.sendEmail(email, subject, html);
  }
}

export const emailService = new EmailService();