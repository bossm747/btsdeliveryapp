import nodemailer from 'nodemailer';
import { emailTemplateEngine } from '../templates/email-templates.js';

export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean>;
  sendOrderConfirmation(to: string, orderDetails: any, lang?: 'en' | 'tl'): Promise<boolean>;
  sendOrderStatusUpdate(to: string, orderData: any, lang?: 'en' | 'tl'): Promise<boolean>;
  sendWelcomeEmail(to: string, name: string, lang?: 'en' | 'tl'): Promise<boolean>;
  sendEmailVerification(to: string, name: string, verificationToken: string, lang?: 'en' | 'tl'): Promise<boolean>;
  sendPasswordReset(to: string, name: string, resetToken: string, lang?: 'en' | 'tl'): Promise<boolean>;
  sendVendorOrderNotification(to: string, orderData: any, lang?: 'en' | 'tl'): Promise<boolean>;
  sendRiderAssignmentNotification(to: string, assignmentData: any, lang?: 'en' | 'tl'): Promise<boolean>;
  sendPaymentConfirmation(to: string, paymentData: any, lang?: 'en' | 'tl'): Promise<boolean>;
  sendPromotionalEmail(to: string, promotionData: any, lang?: 'en' | 'tl'): Promise<boolean>;
  sendAdminAlert(to: string, alertData: any, lang?: 'en' | 'tl'): Promise<boolean>;
}

// SMTP Configuration
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'admin@innovatehub.ph',
    pass: process.env.SMTP_PASS || 'Bossmarc@747'
  }
};

const FROM_EMAIL = process.env.SMTP_FROM || 'BTS Delivery <admin@innovatehub.ph>';

// Nodemailer SMTP Email Provider
export class NodemailerProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(SMTP_CONFIG.auth.user && SMTP_CONFIG.auth.pass);

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        secure: SMTP_CONFIG.secure,
        auth: SMTP_CONFIG.auth,
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates
        }
      });

      // Verify connection on startup
      this.transporter.verify((error: Error | null, success: true | undefined) => {
        if (error) {
          console.error('SMTP connection failed:', error.message);
          this.isConfigured = false;
        } else {
          console.log('✅ SMTP server is ready to send emails');
        }
      });
    } else {
      console.warn('SMTP credentials not configured. Email functionality will be limited.');
      this.transporter = nodemailer.createTransport({
        jsonTransport: true // For development/testing - outputs to console
      });
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: FROM_EMAIL,
        to,
        subject,
        html,
        text: text || subject
      };

      if (!this.isConfigured) {
        console.log(`📧 [DEV] Email would be sent to ${to}`);
        console.log(`   Subject: ${subject}`);
        return true;
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${to}: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('Failed to send email:', error.message);
      return false;
    }
  }

  async sendOrderConfirmation(to: string, orderDetails: any, lang: 'en' | 'tl' = 'tl'): Promise<boolean> {
    const templateData = {
      orderId: orderDetails.id || orderDetails.orderId,
      orderNumber: orderDetails.orderNumber,
      customerName: orderDetails.customerName,
      customerEmail: to,
      restaurantName: orderDetails.restaurantName,
      deliveryAddress: orderDetails.deliveryAddress,
      estimatedDeliveryTime: orderDetails.estimatedDeliveryTime,
      items: orderDetails.items,
      totalAmount: orderDetails.total || orderDetails.totalAmount,
      subtotal: orderDetails.subtotal,
      deliveryFee: orderDetails.deliveryFee
    };

    const template = emailTemplateEngine.generateOrderConfirmationEmail(templateData, lang);
    return await this.sendEmail(to, template.subject, template.html, template.text);
  }

  async sendOrderStatusUpdate(to: string, orderData: any, lang: 'en' | 'tl' = 'tl'): Promise<boolean> {
    const template = emailTemplateEngine.generateOrderStatusUpdateEmail(orderData, lang);
    return await this.sendEmail(to, template.subject, template.html, template.text);
  }

  async sendWelcomeEmail(to: string, name: string, lang: 'en' | 'tl' = 'tl'): Promise<boolean> {
    const template = emailTemplateEngine.generateWelcomeEmail({ name, email: to }, lang);
    return await this.sendEmail(to, template.subject, template.html, template.text);
  }

  async sendVendorOrderNotification(to: string, orderData: any, lang: 'en' | 'tl' = 'tl'): Promise<boolean> {
    const template = emailTemplateEngine.generateVendorNewOrderEmail(orderData, lang);
    return await this.sendEmail(to, template.subject, template.html, template.text);
  }

  async sendRiderAssignmentNotification(to: string, assignmentData: any, lang: 'en' | 'tl' = 'tl'): Promise<boolean> {
    const template = emailTemplateEngine.generateRiderAssignmentEmail(assignmentData, lang);
    return await this.sendEmail(to, template.subject, template.html, template.text);
  }

  async sendPaymentConfirmation(to: string, paymentData: any, lang: 'en' | 'tl' = 'tl'): Promise<boolean> {
    const template = emailTemplateEngine.generatePaymentConfirmationEmail(paymentData, lang);
    return await this.sendEmail(to, template.subject, template.html, template.text);
  }

  async sendPromotionalEmail(to: string, promotionData: any, lang: 'en' | 'tl' = 'tl'): Promise<boolean> {
    const template = emailTemplateEngine.generatePromotionalEmail(promotionData, lang);
    return await this.sendEmail(to, template.subject, template.html, template.text);
  }

  async sendAdminAlert(to: string, alertData: any, lang: 'en' | 'tl' = 'en'): Promise<boolean> {
    const template = emailTemplateEngine.generateAdminAlertEmail(alertData, lang);
    return await this.sendEmail(to, template.subject, template.html, template.text);
  }

  async sendEmailVerification(to: string, name: string, verificationToken: string, lang: 'en' | 'tl' = 'tl'): Promise<boolean> {
    const verificationUrl = `${process.env.BASE_URL || 'https://btsdelivery.com'}/verify-email?token=${verificationToken}`;

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
            <h2>Kumusta ${name}!</h2>
            <p>Salamat sa pag-sign up sa BTS Delivery! Para ma-activate ang inyong account, kailangan namin i-verify ang inyong email address.</p>

            <div class="verification-box">
              <h3>Email Verification Required</h3>
              <p>Para ma-secure ang inyong account at ma-enjoy ang lahat ng services namin, i-click lang ang button sa baba:</p>

              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">
                  Verify Email Address
                </a>
              </div>

              <p><small>O copy-paste ang link na ito sa inyong browser:</small></p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${verificationUrl}
              </p>
            </div>

            <div class="security-note">
              <strong>Security Reminder:</strong>
              <ul>
                <li>Ang link na ito ay mag-expire sa loob ng 24 hours</li>
                <li>Hindi namin hihingin ang inyong password sa email</li>
                <li>I-report agad ang suspicious emails sa security@btsdelivery.com</li>
              </ul>
            </div>

            <p>Matapos i-verify ang email, makakagawa na kayo ng orders at ma-enjoy ang mga benefits:</p>
            <ul>
              <li>Mas mabilis na checkout</li>
              <li>Order notifications sa phone at email</li>
              <li>Loyalty points para sa rewards</li>
              <li>Personalized recommendations</li>
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

    return await this.sendEmail(to, "Verify Your Email - BTS Delivery", html, text);
  }

  async sendPasswordReset(to: string, name: string, resetToken: string, lang: 'en' | 'tl' = 'tl'): Promise<boolean> {
    const resetUrl = `${process.env.BASE_URL || 'https://btsdelivery.com'}/reset-password?token=${resetToken}`;

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
            <h2>Password Reset Request</h2>
          </div>
          <div class="content">
            <h2>Kumusta ${name}!</h2>
            <p>Nakatanggap kami ng request para i-reset ang password ng inyong BTS Delivery account.</p>

            <div class="reset-box">
              <h3>Reset Your Password</h3>
              <p>Para mag-create ng bagong password, i-click ang button sa baba:</p>

              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">
                  Reset Password
                </a>
              </div>

              <p><small>O copy-paste ang link na ito sa inyong browser:</small></p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${resetUrl}
              </p>
            </div>

            <div class="warning">
              <strong>Important Security Information:</strong>
              <ul>
                <li>Ang link na ito ay mag-expire sa loob ng 1 hour</li>
                <li>Gamitin lang ang link kung kayo mismo ang nag-request</li>
                <li>Hindi namin hihingin ang current password sa email</li>
                <li>Mag-logout sa lahat ng devices pagkatapos mag-reset</li>
              </ul>
            </div>

            <h4>Hindi kayo nag-request ng password reset?</h4>
            <p>Kung hindi kayo ang nag-request nito, i-ignore lang ang email na ito. Ang inyong account ay secure pa rin.</p>

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

    return await this.sendEmail(to, "Password Reset Request - BTS Delivery", html, text);
  }
}

// Console-only fallback provider for development
class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    console.log(`📧 [CONSOLE] Email to ${to}: ${subject}`);
    return true;
  }

  async sendOrderConfirmation(to: string, orderDetails: any, lang?: 'en' | 'tl'): Promise<boolean> {
    console.log(`📧 [CONSOLE] Order confirmation to ${to}:`, orderDetails.orderNumber);
    return true;
  }

  async sendOrderStatusUpdate(to: string, orderData: any, lang?: 'en' | 'tl'): Promise<boolean> {
    console.log(`📧 [CONSOLE] Order status update to ${to}:`, orderData.status);
    return true;
  }

  async sendWelcomeEmail(to: string, name: string, lang?: 'en' | 'tl'): Promise<boolean> {
    console.log(`📧 [CONSOLE] Welcome email to ${to}: Welcome ${name}!`);
    return true;
  }

  async sendEmailVerification(to: string, name: string, verificationToken: string, lang?: 'en' | 'tl'): Promise<boolean> {
    console.log(`📧 [CONSOLE] Email verification to ${to}: Token ${verificationToken}`);
    return true;
  }

  async sendPasswordReset(to: string, name: string, resetToken: string, lang?: 'en' | 'tl'): Promise<boolean> {
    console.log(`📧 [CONSOLE] Password reset to ${to}: Token ${resetToken}`);
    return true;
  }

  async sendVendorOrderNotification(to: string, orderData: any, lang?: 'en' | 'tl'): Promise<boolean> {
    console.log(`📧 [CONSOLE] Vendor order notification to ${to}`);
    return true;
  }

  async sendRiderAssignmentNotification(to: string, assignmentData: any, lang?: 'en' | 'tl'): Promise<boolean> {
    console.log(`📧 [CONSOLE] Rider assignment to ${to}`);
    return true;
  }

  async sendPaymentConfirmation(to: string, paymentData: any, lang?: 'en' | 'tl'): Promise<boolean> {
    console.log(`📧 [CONSOLE] Payment confirmation to ${to}`);
    return true;
  }

  async sendPromotionalEmail(to: string, promotionData: any, lang?: 'en' | 'tl'): Promise<boolean> {
    console.log(`📧 [CONSOLE] Promotional email to ${to}`);
    return true;
  }

  async sendAdminAlert(to: string, alertData: any, lang?: 'en' | 'tl'): Promise<boolean> {
    console.log(`📧 [CONSOLE] Admin alert to ${to}`);
    return true;
  }
}

// Email Service - Main entry point
export class EmailService {
  private provider: EmailProvider;

  constructor() {
    // Use Nodemailer SMTP provider by default
    this.provider = new NodemailerProvider();
  }

  async sendOrderConfirmation(email: string, orderDetails: any): Promise<boolean> {
    return await this.provider.sendOrderConfirmation(email, orderDetails);
  }

  async sendOrderStatusUpdate(email: string, orderData: any): Promise<boolean> {
    return await this.provider.sendOrderStatusUpdate(email, orderData);
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

  async sendVendorOrderNotification(email: string, orderData: any): Promise<boolean> {
    return await this.provider.sendVendorOrderNotification(email, orderData);
  }

  async sendRiderAssignmentNotification(email: string, assignmentData: any): Promise<boolean> {
    return await this.provider.sendRiderAssignmentNotification(email, assignmentData);
  }

  async sendPaymentConfirmation(email: string, paymentData: any): Promise<boolean> {
    return await this.provider.sendPaymentConfirmation(email, paymentData);
  }

  async sendPromotionalEmail(email: string, promotionData: any): Promise<boolean> {
    return await this.provider.sendPromotionalEmail(email, promotionData);
  }

  async sendAdminAlert(email: string, alertData: any): Promise<boolean> {
    return await this.provider.sendAdminAlert(email, alertData);
  }

  async sendRiderNotification(email: string, orderDetails: any): Promise<boolean> {
    return await this.provider.sendRiderAssignmentNotification(email, orderDetails);
  }

  // Generic email sending for custom use cases
  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    return await this.provider.sendEmail(to, subject, html, text);
  }
}

export const emailService = new EmailService();
