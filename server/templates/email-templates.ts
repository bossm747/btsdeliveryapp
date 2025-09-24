// Comprehensive Email Templates for BTS Delivery Platform
// Professional templates with BTS branding, multi-language support, and mobile-responsive design

export interface TemplateData {
  [key: string]: any;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailTemplateEngine {
  private brandColors = {
    primary: '#FF6B35',      // BTS Orange
    secondary: '#004225',    // BTS Green
    accent: '#FFD23F',       // BTS Yellow
    dark: '#1a1a1a',        // Dark text
    light: '#f8f9fa',       // Light background
    gray: '#6c757d',        // Gray text
    success: '#28a745',     // Success green
    warning: '#ffc107',     // Warning yellow
    danger: '#dc3545'       // Danger red
  };

  private baseStyles = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        line-height: 1.6; 
        color: ${this.brandColors.dark}; 
        background-color: ${this.brandColors.light};
      }
      .container { 
        max-width: 600px; 
        margin: 0 auto; 
        background-color: white; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border-radius: 12px;
        overflow: hidden;
      }
      .header { 
        background: linear-gradient(135deg, ${this.brandColors.primary} 0%, #e55a2b 100%);
        color: white; 
        padding: 30px 20px; 
        text-align: center; 
        position: relative;
      }
      .header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
        opacity: 0.1;
      }
      .logo { 
        font-size: 32px; 
        font-weight: bold; 
        margin-bottom: 8px;
        position: relative;
        z-index: 1;
      }
      .tagline {
        font-size: 14px;
        opacity: 0.9;
        position: relative;
        z-index: 1;
      }
      .content { 
        padding: 40px 30px;
        background-color: white;
      }
      .status-badge {
        display: inline-block;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 10px 0;
      }
      .order-details { 
        background-color: ${this.brandColors.light}; 
        padding: 25px; 
        margin: 25px 0; 
        border-radius: 12px; 
        border-left: 4px solid ${this.brandColors.primary};
      }
      .item { 
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0; 
        border-bottom: 1px solid #e9ecef; 
      }
      .item:last-child { border-bottom: none; }
      .item-details {
        flex: 1;
      }
      .item-name {
        font-weight: 600;
        color: ${this.brandColors.dark};
      }
      .item-notes {
        font-size: 13px;
        color: ${this.brandColors.gray};
        margin-top: 4px;
      }
      .item-price {
        font-weight: bold;
        color: ${this.brandColors.primary};
      }
      .total { 
        font-size: 20px; 
        font-weight: bold; 
        color: ${this.brandColors.primary}; 
        text-align: right;
        padding-top: 15px;
        border-top: 2px solid ${this.brandColors.primary};
        margin-top: 15px;
      }
      .button { 
        display: inline-block; 
        background: linear-gradient(135deg, ${this.brandColors.secondary} 0%, #003d1f 100%);
        color: white; 
        padding: 15px 30px; 
        text-decoration: none; 
        border-radius: 8px; 
        font-weight: bold;
        text-align: center;
        margin: 20px 0;
        box-shadow: 0 4px 12px rgba(0,66,37,0.3);
        transition: all 0.3s ease;
      }
      .button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,66,37,0.4);
      }
      .info-box {
        background-color: #e8f4fd;
        border: 1px solid #b3d9ff;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }
      .warning-box {
        background-color: #fff3cd;
        border: 1px solid #ffecb5;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }
      .footer { 
        background-color: ${this.brandColors.dark};
        color: white;
        text-align: center; 
        padding: 30px 20px; 
        font-size: 13px;
      }
      .footer a {
        color: ${this.brandColors.primary};
        text-decoration: none;
      }
      .footer-divider {
        height: 1px;
        background-color: #333;
        margin: 20px 0;
      }
      .social-links {
        margin: 15px 0;
      }
      .social-links a {
        margin: 0 8px;
        color: ${this.brandColors.primary};
        text-decoration: none;
      }
      .tracking-timeline {
        margin: 20px 0;
      }
      .timeline-item {
        display: flex;
        align-items: center;
        margin: 15px 0;
        padding: 10px;
        border-radius: 8px;
      }
      .timeline-item.active {
        background-color: #e8f5e8;
        border-left: 4px solid ${this.brandColors.success};
      }
      .timeline-item.pending {
        background-color: #f8f9fa;
        border-left: 4px solid ${this.brandColors.gray};
      }
      .timeline-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        margin-right: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
      }
      .timeline-icon.active {
        background-color: ${this.brandColors.success};
        color: white;
      }
      .timeline-icon.pending {
        background-color: ${this.brandColors.gray};
        color: white;
      }
      
      /* Mobile responsive */
      @media only screen and (max-width: 600px) {
        .container { margin: 10px; }
        .content { padding: 20px 15px; }
        .header { padding: 20px 15px; }
        .logo { font-size: 24px; }
        .order-details { padding: 15px; margin: 15px 0; }
        .item { flex-direction: column; align-items: flex-start; }
        .item-price { margin-top: 5px; }
        .button { display: block; text-align: center; }
      }
    </style>
  `;

  // Multi-language support
  private translations = {
    en: {
      greeting: "Hi",
      thankYou: "Thank you",
      orderConfirmed: "Order Confirmed!",
      orderUpdate: "Order Update",
      orderNumber: "Order #",
      total: "Total",
      deliveryAddress: "Delivery Address",
      estimatedDelivery: "Estimated Delivery",
      trackOrder: "Track Your Order",
      contactSupport: "Contact Support",
      teamSignature: "BTS Delivery Team",
      unsubscribe: "Unsubscribe from notifications",
      followUs: "Follow us on social media",
      questions: "Have questions?",
      contactUs: "Contact us at",
      or: "or call",
      copyright: "© 2024 BTS Delivery - Your trusted delivery partner in Batangas Province",
      status: {
        confirmed: "Confirmed",
        preparing: "Preparing",
        ready: "Ready for Pickup",
        picked_up: "Picked Up",
        in_transit: "On the Way",
        delivered: "Delivered"
      }
    },
    tl: {
      greeting: "Kumusta",
      thankYou: "Salamat",
      orderConfirmed: "Nakumpirma ang Order!",
      orderUpdate: "Update sa Order",
      orderNumber: "Order #",
      total: "Kabuuan",
      deliveryAddress: "Address ng Delivery",
      estimatedDelivery: "Tantyang Oras ng Delivery",
      trackOrder: "I-track ang Order",
      contactSupport: "Makipag-ugnayan sa Support",
      teamSignature: "BTS Delivery Team",
      unsubscribe: "Mag-unsubscribe sa mga notification",
      followUs: "I-follow kami sa social media",
      questions: "May mga tanong?",
      contactUs: "Makipag-ugnayan sa amin sa",
      or: "o tumawag sa",
      copyright: "© 2024 BTS Delivery - Ang pinagkakatiwalaang delivery partner sa Batangas Province",
      status: {
        confirmed: "Nakumpirma",
        preparing: "Ginagawa",
        ready: "Handa na",
        picked_up: "Nakuha na",
        in_transit: "Papunta na",
        delivered: "Nadeliver na"
      }
    }
  };

  private getTranslation(key: string, lang: 'en' | 'tl' = 'en'): string {
    const keys = key.split('.');
    let value: any = this.translations[lang];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || this.translations.en[key as keyof typeof this.translations.en] || key;
  }

  // Order Confirmation Template
  generateOrderConfirmationEmail(data: TemplateData, lang: 'en' | 'tl' = 'en'): EmailTemplate {
    const t = (key: string) => this.getTranslation(key, lang);
    
    const subject = `${t('orderConfirmed')} ${t('orderNumber')}${data.orderNumber} - BTS Delivery`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🐝 BTS Delivery</div>
            <div class="tagline">${lang === 'tl' ? 'Lasa ng Batangas, Delivered Fresh' : 'Taste of Batangas, Delivered Fresh'}</div>
            <h2 style="margin-top: 20px; position: relative; z-index: 1;">${t('orderConfirmed')}</h2>
            <div class="status-badge" style="background-color: ${this.brandColors.success}; color: white;">
              ${t('orderNumber')}${data.orderNumber}
            </div>
          </div>
          
          <div class="content">
            <h2>${t('greeting')} ${data.customerName}! 👋</h2>
            <p style="margin: 20px 0; font-size: 16px; line-height: 1.8;">
              ${t('thankYou')} ${lang === 'tl' ? 'sa inyong order! Ang masarap na pagkain mula sa' : 'for your order! Your delicious meal from'} <strong>${data.restaurantName}</strong> ${lang === 'tl' ? 'ay nakumpirma na at ginagawa na namin' : 'is confirmed and being prepared'}.
            </p>
            
            <div class="order-details">
              <h3 style="color: ${this.brandColors.secondary}; margin-bottom: 20px;">${lang === 'tl' ? 'Detalye ng Order' : 'Order Details'}</h3>
              
              <div style="margin-bottom: 20px;">
                <strong>${lang === 'tl' ? 'Restaurant:' : 'Restaurant:'}</strong> ${data.restaurantName}<br>
                <strong>${t('deliveryAddress')}:</strong> ${data.deliveryAddress.street}, ${data.deliveryAddress.barangay}, ${data.deliveryAddress.city}
                ${data.estimatedDeliveryTime ? `<br><strong>${t('estimatedDelivery')}:</strong> ${new Date(data.estimatedDeliveryTime).toLocaleString(lang === 'tl' ? 'tl-PH' : 'en-PH')}` : ''}
              </div>
              
              <div style="margin: 20px 0;">
                <h4 style="margin-bottom: 15px;">${lang === 'tl' ? 'Mga Items:' : 'Items:'}</h4>
                ${data.items.map((item: any) => `
                  <div class="item">
                    <div class="item-details">
                      <div class="item-name">${item.quantity}x ${item.name}</div>
                      ${item.notes ? `<div class="item-notes">${lang === 'tl' ? 'Note:' : 'Note:'} ${item.notes}</div>` : ''}
                    </div>
                    <div class="item-price">₱${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                `).join('')}
              </div>
              
              <div class="total">
                ${t('total')}: ₱${data.totalAmount.toFixed(2)}
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/orders/${data.orderId}/track" class="button">
                📱 ${t('trackOrder')}
              </a>
            </div>
            
            <div class="info-box">
              <p style="margin: 0;">
                <strong>📞 ${t('questions')}</strong><br>
                ${t('contactUs')} <a href="mailto:support@btsdelivery.com">support@btsdelivery.com</a> ${t('or')} <strong>(043) 123-4567</strong>
              </p>
            </div>
            
            <p style="margin-top: 30px; color: ${this.brandColors.gray};">
              ${lang === 'tl' ? 'Salamat sa pagpili sa BTS Delivery!' : 'Thank you for choosing BTS Delivery!'}
            </p>
          </div>
          
          <div class="footer">
            <div class="social-links">
              <a href="https://facebook.com/BTSDeliveryPH">Facebook</a> • 
              <a href="https://instagram.com/btsdeliveryph">Instagram</a> • 
              <a href="https://twitter.com/btsdeliveryph">Twitter</a>
            </div>
            
            <div class="footer-divider"></div>
            
            <p>${t('copyright')}</p>
            <p style="margin-top: 10px; font-size: 11px; opacity: 0.8;">
              ${lang === 'tl' ? 'Natanggap mo ang email na ito dahil may order ka sa BTS Delivery.' : 'You received this email because you placed an order with BTS Delivery.'}
            </p>
            <p style="margin-top: 5px;">
              <a href="${process.env.FRONTEND_URL}/unsubscribe?email=${data.customerEmail}">${t('unsubscribe')}</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      ${t('orderConfirmed')} ${t('orderNumber')}${data.orderNumber}
      
      ${t('greeting')} ${data.customerName},
      
      ${t('thankYou')} ${lang === 'tl' ? 'sa inyong order sa' : 'for your order from'} ${data.restaurantName}!
      
      ${lang === 'tl' ? 'Detalye ng Order:' : 'Order Details:'}
      ${data.items.map((item: any) => `- ${item.quantity}x ${item.name}: ₱${(item.price * item.quantity).toFixed(2)}`).join('\n')}
      
      ${t('total')}: ₱${data.totalAmount.toFixed(2)}
      ${t('deliveryAddress')}: ${data.deliveryAddress.street}, ${data.deliveryAddress.barangay}, ${data.deliveryAddress.city}
      
      ${t('trackOrder')}: ${process.env.FRONTEND_URL}/orders/${data.orderId}/track
      
      ${t('teamSignature')}
    `;
    
    return { subject, html, text };
  }

  // Order Status Update Template
  generateOrderStatusUpdateEmail(data: TemplateData, lang: 'en' | 'tl' = 'en'): EmailTemplate {
    const t = (key: string) => this.getTranslation(key, lang);
    
    const statusColors = {
      confirmed: this.brandColors.primary,
      preparing: '#ff8c00',
      ready: '#9933cc',
      picked_up: '#00aa88',
      in_transit: '#00cc66',
      delivered: this.brandColors.success,
      cancelled: this.brandColors.danger
    };
    
    const statusColor = statusColors[data.status as keyof typeof statusColors] || this.brandColors.gray;
    const statusText = t(`status.${data.status}`);
    
    const subject = `${t('orderUpdate')} - ${data.restaurantName} ${t('orderNumber')}${data.orderNumber}`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%);">
            <div class="logo">🐝 BTS Delivery</div>
            <h2 style="margin-top: 20px; position: relative; z-index: 1;">${t('orderUpdate')}</h2>
            <div class="status-badge" style="background-color: rgba(255,255,255,0.2); color: white;">
              ${t('orderNumber')}${data.orderNumber}
            </div>
            <div style="font-size: 18px; margin-top: 10px; position: relative; z-index: 1;">
              📍 ${statusText}
            </div>
          </div>
          
          <div class="content">
            <h2>${t('greeting')} ${data.customerName}!</h2>
            
            <div class="order-details" style="border-left-color: ${statusColor};">
              <h3 style="color: ${statusColor}; margin-bottom: 15px;">
                📊 ${lang === 'tl' ? 'Update sa Status' : 'Status Update'}
              </h3>
              <p style="font-size: 16px; margin: 15px 0; padding: 15px; background-color: white; border-radius: 8px; border-left: 4px solid ${statusColor};">
                ${data.message}
              </p>
              ${data.additionalMessage ? `<p style="font-style: italic; color: ${this.brandColors.gray};"><em>${data.additionalMessage}</em></p>` : ''}
            </div>

            ${this.generateTrackingTimeline(data, lang, statusColor)}
            
            <div style="margin: 25px 0;">
              <p><strong>${lang === 'tl' ? 'Restaurant:' : 'Restaurant:'}</strong> ${data.restaurantName}</p>
              ${data.estimatedDeliveryTime ? `<p><strong>${t('estimatedDelivery')}:</strong> ${new Date(data.estimatedDeliveryTime).toLocaleString(lang === 'tl' ? 'tl-PH' : 'en-PH')}</p>` : ''}
              ${data.riderName ? `<p><strong>${lang === 'tl' ? 'Rider mo:' : 'Your Rider:'}</strong> ${data.riderName} ${data.riderPhone ? `• ${data.riderPhone}` : ''}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/orders/${data.orderId}/track" class="button">
                📱 ${t('trackOrder')}
              </a>
            </div>
            
            <p style="color: ${this.brandColors.gray};">
              ${lang === 'tl' ? 'Salamat sa pagpili sa BTS Delivery!' : 'Thank you for choosing BTS Delivery!'}
            </p>
          </div>
          
          <div class="footer">
            <p>${t('copyright')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      ${t('orderUpdate')} - ${t('orderNumber')}${data.orderNumber}
      
      ${t('greeting')} ${data.customerName},
      
      ${data.message}
      
      ${lang === 'tl' ? 'Restaurant:' : 'Restaurant:'} ${data.restaurantName}
      ${lang === 'tl' ? 'Status:' : 'Status:'} ${statusText}
      
      ${t('trackOrder')}: ${process.env.FRONTEND_URL}/orders/${data.orderId}/track
      
      ${t('teamSignature')}
    `;
    
    return { subject, html, text };
  }

  private generateTrackingTimeline(data: TemplateData, lang: 'en' | 'tl', activeColor: string): string {
    const statuses = ['confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered'];
    const currentIndex = statuses.indexOf(data.status);
    
    const statusIcons = {
      confirmed: '✅',
      preparing: '👨‍🍳',
      ready: '📦',
      picked_up: '🏃‍♂️',
      in_transit: '🚗',
      delivered: '🎉'
    };
    
    const statusLabels = {
      en: {
        confirmed: 'Order Confirmed',
        preparing: 'Preparing Food',
        ready: 'Ready for Pickup',
        picked_up: 'Picked Up',
        in_transit: 'On the Way',
        delivered: 'Delivered'
      },
      tl: {
        confirmed: 'Nakumpirma',
        preparing: 'Ginagawa',
        ready: 'Handa na',
        picked_up: 'Nakuha na',
        in_transit: 'Papunta na',
        delivered: 'Nadeliver na'
      }
    };
    
    return `
      <div class="tracking-timeline">
        <h4 style="margin-bottom: 20px; color: ${this.brandColors.secondary};">
          📍 ${lang === 'tl' ? 'Timeline ng Order' : 'Order Timeline'}
        </h4>
        ${statuses.map((status, index) => {
          const isActive = index <= currentIndex;
          const icon = statusIcons[status as keyof typeof statusIcons];
          const label = statusLabels[lang][status as keyof typeof statusLabels[typeof lang]];
          
          return `
            <div class="timeline-item ${isActive ? 'active' : 'pending'}">
              <div class="timeline-icon ${isActive ? 'active' : 'pending'}" style="${isActive ? `background-color: ${activeColor};` : ''}">
                ${isActive ? icon : index + 1}
              </div>
              <div>
                <strong>${label}</strong>
                ${index === currentIndex ? `<div style="font-size: 12px; color: ${activeColor};">${lang === 'tl' ? 'Kasalukuyan' : 'Current'}</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Welcome Email Template
  generateWelcomeEmail(data: TemplateData, lang: 'en' | 'tl' = 'en'): EmailTemplate {
    const t = (key: string) => this.getTranslation(key, lang);
    
    const subject = lang === 'tl' ? 
      `Maligayang pagdating sa BTS Delivery, ${data.name}! 🎉` : 
      `Welcome to BTS Delivery, ${data.name}! 🎉`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🐝 BTS Delivery</div>
            <div class="tagline">${lang === 'tl' ? 'Lasa ng Batangas, Delivered Fresh' : 'Taste of Batangas, Delivered Fresh'}</div>
            <h2 style="margin-top: 20px; position: relative; z-index: 1;">
              ${lang === 'tl' ? 'Maligayang Pagdating!' : 'Welcome!'}
            </h2>
          </div>
          
          <div class="content">
            <h2>${t('greeting')} ${data.name}! 👋</h2>
            <p style="margin: 20px 0; font-size: 16px; line-height: 1.8;">
              ${lang === 'tl' ? 
                'Salamat sa pag-sign up sa BTS Delivery - ang pinakamabilis at pinaka-reliable na delivery service sa buong Batangas Province!' :
                'Thank you for signing up with BTS Delivery - the fastest and most reliable delivery service in Batangas Province!'
              }
            </p>
            
            <div class="order-details">
              <h3 style="color: ${this.brandColors.secondary}; margin-bottom: 20px;">
                ${lang === 'tl' ? '🎯 Ano ang pwede mong gawin?' : '🎯 What can you do?'}
              </h3>
              
              <div style="margin: 15px 0;">
                <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid ${this.brandColors.accent};">
                  <strong>🍕 ${lang === 'tl' ? 'Food Delivery' : 'Food Delivery'}</strong>
                  <p style="margin: 5px 0; color: ${this.brandColors.gray};">
                    ${lang === 'tl' ? 'Order mula sa mga paboritong restaurants sa Batangas' : 'Order from your favorite restaurants in Batangas'}
                  </p>
                </div>
                
                <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid ${this.brandColors.accent};">
                  <strong>🛒 ${lang === 'tl' ? 'Pabili Service' : 'Grocery Shopping'}</strong>
                  <p style="margin: 5px 0; color: ${this.brandColors.gray};">
                    ${lang === 'tl' ? 'Ipabili ang kailangan mo mula sa grocery, pharmacy, at iba pa' : 'Get your essentials from grocery stores, pharmacies, and more'}
                  </p>
                </div>
                
                <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid ${this.brandColors.accent};">
                  <strong>💸 ${lang === 'tl' ? 'Pabayad Service' : 'Bill Payment'}</strong>
                  <p style="margin: 5px 0; color: ${this.brandColors.gray};">
                    ${lang === 'tl' ? 'Bayaran ang bills nang walang pila' : 'Pay your bills without the hassle of long queues'}
                  </p>
                </div>
                
                <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid ${this.brandColors.accent};">
                  <strong>📦 ${lang === 'tl' ? 'Parcel Delivery' : 'Parcel Delivery'}</strong>
                  <p style="margin: 5px 0; color: ${this.brandColors.gray};">
                    ${lang === 'tl' ? 'Magpadala ng packages sa buong Batangas' : 'Send packages anywhere in Batangas Province'}
                  </p>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/order" class="button">
                🚀 ${lang === 'tl' ? 'Mag-Order Ngayon' : 'Start Ordering Now'}
              </a>
            </div>
            
            <div class="info-box">
              <h3 style="margin-bottom: 15px;">${lang === 'tl' ? '🎁 Special Welcome Offer!' : '🎁 Special Welcome Offer!'}</h3>
              <p style="margin: 0;">
                ${lang === 'tl' ? 
                  'Gamitin ang code <strong>WELCOME100</strong> para sa ₱100 OFF sa inyong first order!' :
                  'Use code <strong>WELCOME100</strong> for ₱100 OFF your first order!'
                }
              </p>
            </div>
            
            <div style="margin: 30px 0;">
              <p><strong>📞 ${t('questions')}</strong></p>
              <p>${t('contactUs')} <a href="mailto:support@btsdelivery.com">support@btsdelivery.com</a> ${t('or')} <strong>(043) 123-4567</strong></p>
            </div>
          </div>
          
          <div class="footer">
            <div class="social-links">
              <a href="https://facebook.com/BTSDeliveryPH">Facebook</a> • 
              <a href="https://instagram.com/btsdeliveryph">Instagram</a> • 
              <a href="https://twitter.com/btsdeliveryph">Twitter</a>
            </div>
            
            <div class="footer-divider"></div>
            
            <p>${t('copyright')}</p>
            <p style="margin-top: 10px; font-size: 11px; opacity: 0.8;">
              ${t('followUs')} - @BTSDeliveryPH
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      ${lang === 'tl' ? 'Maligayang Pagdating sa BTS Delivery!' : 'Welcome to BTS Delivery!'}
      
      ${t('greeting')} ${data.name},
      
      ${lang === 'tl' ? 
        'Salamat sa pag-sign up sa BTS Delivery!' :
        'Thank you for signing up with BTS Delivery!'
      }
      
      ${lang === 'tl' ? 'Mga serbisyo namin:' : 'Our services:'}
      • ${lang === 'tl' ? 'Food Delivery - Order sa mga restaurants' : 'Food Delivery - Order from restaurants'}
      • ${lang === 'tl' ? 'Pabili Service - Grocery at pharmacy' : 'Grocery Shopping - From stores and pharmacies'}
      • ${lang === 'tl' ? 'Pabayad Service - Bayad ng bills' : 'Bill Payment - Pay bills easily'}
      • ${lang === 'tl' ? 'Parcel Delivery - Padala ng packages' : 'Parcel Delivery - Send packages'}
      
      ${lang === 'tl' ? 'Special Offer: WELCOME100 para sa ₱100 OFF!' : 'Special Offer: WELCOME100 for ₱100 OFF!'}
      
      ${t('teamSignature')}
    `;
    
    return { subject, html, text };
  }

  // Vendor New Order Template
  generateVendorNewOrderEmail(data: TemplateData, lang: 'en' | 'tl' = 'en'): EmailTemplate {
    const subject = `${lang === 'tl' ? 'Bagong Order!' : 'New Order!'} #${data.orderNumber} - ${data.customerName}`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, ${this.brandColors.success} 0%, #1e7e34 100%);">
            <div class="logo">🐝 BTS Delivery</div>
            <h2 style="margin-top: 20px; position: relative; z-index: 1;">
              ${lang === 'tl' ? '🔔 Bagong Order Received!' : '🔔 New Order Received!'}
            </h2>
            <div class="status-badge" style="background-color: rgba(255,255,255,0.2); color: white;">
              Order #${data.orderNumber}
            </div>
          </div>
          
          <div class="content">
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0; font-size: 16px; font-weight: bold; color: #8b6914;">
                ⏰ ${lang === 'tl' ? 'Mangyaring tumugon sa loob ng 10 minuto upang mapanatili ang inyong rating.' : 'Please respond within 10 minutes to maintain your restaurant rating.'}
              </p>
            </div>
            
            <div class="order-details">
              <h3 style="color: ${this.brandColors.secondary}; margin-bottom: 20px;">
                📋 ${lang === 'tl' ? 'Detalye ng Order' : 'Order Details'}
              </h3>
              
              <div style="margin-bottom: 20px;">
                <p><strong>${lang === 'tl' ? 'Customer:' : 'Customer:'}</strong> ${data.customerName}</p>
                <p><strong>${lang === 'tl' ? 'Phone:' : 'Phone:'}</strong> ${data.customerPhone}</p>
                <p><strong>${lang === 'tl' ? 'Order Time:' : 'Order Time:'}</strong> ${new Date().toLocaleString(lang === 'tl' ? 'tl-PH' : 'en-PH')}</p>
              </div>
              
              <h4 style="margin-bottom: 15px;">${lang === 'tl' ? 'Mga Items:' : 'Order Items:'}</h4>
              ${data.items.map((item: any) => `
                <div class="item">
                  <div class="item-details">
                    <div class="item-name">${item.quantity}x ${item.name}</div>
                    ${item.notes ? `<div class="item-notes">${lang === 'tl' ? 'Special Instructions:' : 'Special Instructions:'} ${item.notes}</div>` : ''}
                  </div>
                  <div class="item-price">₱${(item.price * item.quantity).toFixed(2)}</div>
                </div>
              `).join('')}
              
              <div class="total">
                ${lang === 'tl' ? 'Kabuuan:' : 'Total:'} ₱${data.totalAmount.toFixed(2)}
              </div>
            </div>
            
            <div style="margin: 25px 0;">
              <p><strong>${lang === 'tl' ? 'Delivery Address:' : 'Delivery Address:'}</strong></p>
              <p>${data.deliveryAddress.street}, ${data.deliveryAddress.barangay}<br>
              ${data.deliveryAddress.city}, ${data.deliveryAddress.province}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/vendor/orders/${data.orderId}/accept" 
                 class="button" style="background: linear-gradient(135deg, ${this.brandColors.success} 0%, #1e7e34 100%); margin-right: 10px;">
                ✅ ${lang === 'tl' ? 'Tanggapin ang Order' : 'Accept Order'}
              </a>
              <a href="${process.env.FRONTEND_URL}/vendor/orders/${data.orderId}/decline" 
                 class="button" style="background: linear-gradient(135deg, ${this.brandColors.danger} 0%, #bd2130 100%);">
                ❌ ${lang === 'tl' ? 'Tanggihan' : 'Decline'}
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>${lang === 'tl' ? '© 2024 BTS Delivery - Partner Dashboard' : '© 2024 BTS Delivery - Partner Dashboard'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      ${lang === 'tl' ? 'Bagong Order!' : 'New Order!'} #${data.orderNumber}
      
      Customer: ${data.customerName}
      Phone: ${data.customerPhone}
      
      ${lang === 'tl' ? 'Items:' : 'Items:'}
      ${data.items.map((item: any) => `- ${item.quantity}x ${item.name}: ₱${(item.price * item.quantity).toFixed(2)}`).join('\n')}
      
      ${lang === 'tl' ? 'Kabuuan:' : 'Total:'} ₱${data.totalAmount.toFixed(2)}
      
      ${lang === 'tl' ? 'Address:' : 'Address:'} ${data.deliveryAddress.street}, ${data.deliveryAddress.barangay}, ${data.deliveryAddress.city}
      
      ${lang === 'tl' ? 'Tanggapin:' : 'Accept:'} ${process.env.FRONTEND_URL}/vendor/orders/${data.orderId}/accept
      ${lang === 'tl' ? 'Tanggihan:' : 'Decline:'} ${process.env.FRONTEND_URL}/vendor/orders/${data.orderId}/decline
    `;
    
    return { subject, html, text };
  }

  // Payment Confirmation Template
  generatePaymentConfirmationEmail(data: TemplateData, lang: 'en' | 'tl' = 'en'): EmailTemplate {
    const t = (key: string) => this.getTranslation(key, lang);
    
    const subject = lang === 'tl' ? 
      `✅ Bayad na ang Order #${data.orderNumber} - BTS Delivery` : 
      `✅ Payment Confirmed for Order #${data.orderNumber} - BTS Delivery`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, ${this.brandColors.success} 0%, #1e7e34 100%);">
            <div class="logo">🐝 BTS Delivery</div>
            <h2 style="margin-top: 20px; position: relative; z-index: 1;">
              ${lang === 'tl' ? '💳 Bayad Nakumpirma!' : '💳 Payment Confirmed!'}
            </h2>
            <div class="status-badge" style="background-color: rgba(255,255,255,0.2); color: white;">
              ₱${data.amount.toFixed(2)}
            </div>
          </div>
          
          <div class="content">
            <h2>${t('greeting')} ${data.customerName}!</h2>
            <p style="margin: 20px 0; font-size: 16px; line-height: 1.8;">
              ${lang === 'tl' ? 
                `Salamat! Nakumpirma na ang inyong bayad na ₱${data.amount.toFixed(2)} para sa Order #${data.orderNumber}.` :
                `Thank you! Your payment of ₱${data.amount.toFixed(2)} for Order #${data.orderNumber} has been confirmed.`
              }
            </p>
            
            <div class="order-details" style="border-left-color: ${this.brandColors.success};">
              <h3 style="color: ${this.brandColors.success}; margin-bottom: 20px;">
                💳 ${lang === 'tl' ? 'Detalye ng Bayad' : 'Payment Details'}
              </h3>
              
              <div style="margin: 15px 0;">
                <strong>${lang === 'tl' ? 'Order Number:' : 'Order Number:'}</strong> #${data.orderNumber}<br>
                <strong>${lang === 'tl' ? 'Halaga:' : 'Amount:'}</strong> ₱${data.amount.toFixed(2)}<br>
                <strong>${lang === 'tl' ? 'Paraan ng Bayad:' : 'Payment Method:'}</strong> ${data.paymentMethod}<br>
                <strong>${lang === 'tl' ? 'Transaction ID:' : 'Transaction ID:'}</strong> ${data.transactionId}<br>
                <strong>${lang === 'tl' ? 'Petsa:' : 'Date:'}</strong> ${new Date(data.paidAt).toLocaleString(lang === 'tl' ? 'tl-PH' : 'en-PH')}
              </div>
              
              ${data.receipt ? `
                <div style="margin: 20px 0; padding: 15px; background-color: white; border-radius: 8px; border: 1px solid #e9ecef;">
                  <h4 style="margin-bottom: 10px;">${lang === 'tl' ? '📋 Resibo' : '📋 Receipt'}</h4>
                  <p style="font-family: monospace; font-size: 12px; color: ${this.brandColors.gray};">
                    ${data.receipt}
                  </p>
                </div>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/orders/${data.orderId}/track" class="button">
                📱 ${t('trackOrder')}
              </a>
            </div>
            
            <div class="info-box">
              <p style="margin: 0;">
                <strong>📞 ${t('questions')}</strong><br>
                ${t('contactUs')} <a href="mailto:support@btsdelivery.com">support@btsdelivery.com</a> ${t('or')} <strong>(043) 123-4567</strong>
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>${t('copyright')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      ${lang === 'tl' ? 'Bayad Nakumpirma!' : 'Payment Confirmed!'} - Order #${data.orderNumber}
      
      ${t('greeting')} ${data.customerName},
      
      ${lang === 'tl' ? 
        `Salamat! Nakumpirma na ang inyong bayad na ₱${data.amount.toFixed(2)}.` :
        `Thank you! Your payment of ₱${data.amount.toFixed(2)} has been confirmed.`
      }
      
      ${lang === 'tl' ? 'Detalye ng Bayad:' : 'Payment Details:'}
      - Order: #${data.orderNumber}
      - ${lang === 'tl' ? 'Halaga:' : 'Amount:'} ₱${data.amount.toFixed(2)}
      - ${lang === 'tl' ? 'Paraan ng Bayad:' : 'Payment Method:'} ${data.paymentMethod}
      - Transaction ID: ${data.transactionId}
      
      ${t('trackOrder')}: ${process.env.FRONTEND_URL}/orders/${data.orderId}/track
      
      ${t('teamSignature')}
    `;
    
    return { subject, html, text };
  }

  // Rider Assignment Email Template
  generateRiderAssignmentEmail(data: TemplateData, lang: 'en' | 'tl' = 'en'): EmailTemplate {
    const t = (key: string) => this.getTranslation(key, lang);
    
    const subject = lang === 'tl' ? 
      `🚗 Bagong Delivery Assignment - Order #${data.orderNumber}` : 
      `🚗 New Delivery Assignment - Order #${data.orderNumber}`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #00aa88 0%, #007a63 100%);">
            <div class="logo">🐝 BTS Delivery</div>
            <h2 style="margin-top: 20px; position: relative; z-index: 1;">
              ${lang === 'tl' ? '🚗 Bagong Delivery' : '🚗 New Delivery'}
            </h2>
            <div class="status-badge" style="background-color: rgba(255,255,255,0.2); color: white;">
              ${lang === 'tl' ? 'Kumita ng' : 'Earn'} ₱${data.estimatedEarnings}
            </div>
          </div>
          
          <div class="content">
            <h2>${t('greeting')} ${data.riderName}!</h2>
            <p style="margin: 20px 0; font-size: 16px; line-height: 1.8;">
              ${lang === 'tl' ? 
                `May bagong delivery assignment para sa inyo. Kumita ng ₱${data.estimatedEarnings} sa delivery na ito!` :
                `You have a new delivery assignment. Earn ₱${data.estimatedEarnings} for this delivery!`
              }
            </p>
            
            <div class="order-details">
              <h3 style="color: ${this.brandColors.secondary}; margin-bottom: 20px;">
                📦 ${lang === 'tl' ? 'Detalye ng Delivery' : 'Delivery Details'}
              </h3>
              
              <div style="margin: 15px 0;">
                <strong>${lang === 'tl' ? 'Order Number:' : 'Order Number:'}</strong> #${data.orderNumber}<br>
                <strong>${lang === 'tl' ? 'Restaurant:' : 'Restaurant:'}</strong> ${data.restaurantName}<br>
                <strong>${lang === 'tl' ? 'Customer:' : 'Customer:'}</strong> ${data.customerName}<br>
                <strong>${lang === 'tl' ? 'Phone:' : 'Phone:'}</strong> ${data.customerPhone}
              </div>
              
              <div style="margin: 20px 0;">
                <h4>${lang === 'tl' ? '📍 Mga Address' : '📍 Addresses'}</h4>
                <div style="margin: 10px 0; padding: 15px; background-color: white; border-radius: 8px; border-left: 4px solid #ff6b35;">
                  <strong>${lang === 'tl' ? 'Pickup:' : 'Pickup:'}</strong><br>
                  ${data.pickupAddress.name}<br>
                  ${data.pickupAddress.street}, ${data.pickupAddress.barangay}, ${data.pickupAddress.city}
                </div>
                <div style="margin: 10px 0; padding: 15px; background-color: white; border-radius: 8px; border-left: 4px solid #28a745;">
                  <strong>${lang === 'tl' ? 'Delivery:' : 'Delivery:'}</strong><br>
                  ${data.deliveryAddress.street}, ${data.deliveryAddress.barangay}, ${data.deliveryAddress.city}<br>
                  ${data.deliveryAddress.landmark ? `<em>Landmark: ${data.deliveryAddress.landmark}</em><br>` : ''}
                  ${data.deliveryInstructions ? `<em>Instructions: ${data.deliveryInstructions}</em>` : ''}
                </div>
              </div>
              
              <div class="total">
                ${lang === 'tl' ? 'Kikitain mo:' : 'Your Earnings:'} ₱${data.estimatedEarnings}
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/rider/orders/${data.orderId}/accept" class="button">
                ✅ ${lang === 'tl' ? 'Tanggapin ang Order' : 'Accept Order'}
              </a>
            </div>
            
            <div class="warning-box">
              <p style="margin: 0;">
                <strong>⏰ ${lang === 'tl' ? 'Importante!' : 'Important!'}</strong><br>
                ${lang === 'tl' ? 
                  'Mangyaring i-accept ang order sa loob ng 5 minutos. Mag-expire ito kung hindi.' :
                  'Please accept this order within 5 minutes, or it will expire.'
                }
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>${t('copyright')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      ${lang === 'tl' ? 'Bagong Delivery Assignment' : 'New Delivery Assignment'} - Order #${data.orderNumber}
      
      ${t('greeting')} ${data.riderName},
      
      ${lang === 'tl' ? 
        `May bagong delivery assignment para sa inyo. Kumita ng ₱${data.estimatedEarnings}!` :
        `You have a new delivery assignment. Earn ₱${data.estimatedEarnings}!`
      }
      
      ${lang === 'tl' ? 'Detalye:' : 'Details:'}
      - Order: #${data.orderNumber}
      - Restaurant: ${data.restaurantName}
      - Customer: ${data.customerName} (${data.customerPhone})
      - Pickup: ${data.pickupAddress.name}
      - Delivery: ${data.deliveryAddress.street}, ${data.deliveryAddress.city}
      
      ${lang === 'tl' ? 'Tanggapin:' : 'Accept:'} ${process.env.FRONTEND_URL}/rider/orders/${data.orderId}/accept
      
      ${t('teamSignature')}
    `;
    
    return { subject, html, text };
  }

  // Admin Alert Email Template
  generateAdminAlertEmail(data: TemplateData, lang: 'en' | 'tl' = 'en'): EmailTemplate {
    const severityColors = {
      low: '#17a2b8',
      medium: '#ffc107', 
      high: '#fd7e14',
      critical: '#dc3545'
    };
    
    const severityColor = severityColors[data.severity as keyof typeof severityColors] || '#6c757d';
    
    const subject = `🚨 ${data.severity.toUpperCase()}: ${data.title} - BTS Delivery Admin Alert`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, ${severityColor} 0%, ${severityColor}dd 100%);">
            <div class="logo">🐝 BTS Delivery</div>
            <div class="tagline">Admin Alert System</div>
            <h2 style="margin-top: 20px; position: relative; z-index: 1;">
              🚨 ${data.severity.toUpperCase()} ALERT
            </h2>
            <div class="status-badge" style="background-color: rgba(255,255,255,0.2); color: white;">
              ${data.category || 'System Alert'}
            </div>
          </div>
          
          <div class="content">
            <h2>⚠️ ${data.title}</h2>
            
            <div class="order-details" style="border-left-color: ${severityColor};">
              <h3 style="color: ${severityColor}; margin-bottom: 15px;">
                📊 Alert Details
              </h3>
              <p style="font-size: 16px; margin: 15px 0; padding: 15px; background-color: white; border-radius: 8px; border-left: 4px solid ${severityColor};">
                ${data.message}
              </p>
              
              <div style="margin: 20px 0;">
                <strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${data.severity.toUpperCase()}</span><br>
                <strong>Category:</strong> ${data.category || 'System'}<br>
                <strong>Time:</strong> ${new Date(data.timestamp || Date.now()).toLocaleString('en-PH')}<br>
                ${data.affectedUsers ? `<strong>Affected Users:</strong> ${data.affectedUsers}<br>` : ''}
                ${data.systemComponent ? `<strong>Component:</strong> ${data.systemComponent}<br>` : ''}
                ${data.errorCode ? `<strong>Error Code:</strong> ${data.errorCode}<br>` : ''}
              </div>
              
              ${data.additionalInfo ? `
                <div style="margin: 15px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                  <h4>Additional Information:</h4>
                  <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${data.additionalInfo}</pre>
                </div>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/admin/alerts/${data.alertId}" class="button" style="background: linear-gradient(135deg, ${severityColor} 0%, ${severityColor}dd 100%);">
                🔍 View Alert Details
              </a>
            </div>
            
            ${data.severity === 'critical' ? `
              <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <strong>🆘 CRITICAL ALERT - Immediate Action Required</strong><br>
                This alert requires immediate attention. Please investigate and resolve as soon as possible.
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>© 2024 BTS Delivery - Admin Alert System</p>
            <p>This is an automated alert. Do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      ADMIN ALERT - ${data.severity.toUpperCase()}: ${data.title}
      
      ${data.message}
      
      Details:
      - Severity: ${data.severity.toUpperCase()}
      - Category: ${data.category || 'System'}
      - Time: ${new Date(data.timestamp || Date.now()).toLocaleString('en-PH')}
      ${data.affectedUsers ? `- Affected Users: ${data.affectedUsers}` : ''}
      ${data.systemComponent ? `- Component: ${data.systemComponent}` : ''}
      ${data.errorCode ? `- Error Code: ${data.errorCode}` : ''}
      
      View Details: ${process.env.FRONTEND_URL}/admin/alerts/${data.alertId}
      
      BTS Delivery Admin Alert System
    `;
    
    return { subject, html, text };
  }

  // Promotional Email Template
  generatePromotionalEmail(data: TemplateData, lang: 'en' | 'tl' = 'en'): EmailTemplate {
    const t = (key: string) => this.getTranslation(key, lang);
    
    const subject = lang === 'tl' ? 
      `🎉 ${data.title} - Special Offer sa BTS Delivery!` : 
      `🎉 ${data.title} - Special Offer from BTS Delivery!`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, ${this.brandColors.accent} 0%, #e6bc1a 100%); color: ${this.brandColors.dark};">
            <div class="logo" style="color: ${this.brandColors.dark};">🐝 BTS Delivery</div>
            <h2 style="margin-top: 20px; position: relative; z-index: 1; color: ${this.brandColors.dark};">
              🎉 ${data.title}
            </h2>
            ${data.discount ? `
              <div class="status-badge" style="background-color: ${this.brandColors.primary}; color: white;">
                ${data.discount}% OFF
              </div>
            ` : ''}
          </div>
          
          <div class="content">
            <h2>${t('greeting')} ${data.customerName || 'Valued Customer'}!</h2>
            
            ${data.imageUrl ? `
              <div style="text-align: center; margin: 20px 0;">
                <img src="${data.imageUrl}" alt="${data.title}" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              </div>
            ` : ''}
            
            <p style="margin: 20px 0; font-size: 16px; line-height: 1.8;">
              ${data.description}
            </p>
            
            <div class="order-details" style="border-left-color: ${this.brandColors.accent};">
              <h3 style="color: ${this.brandColors.secondary}; margin-bottom: 20px;">
                🎯 ${lang === 'tl' ? 'Detalye ng Promo' : 'Promotion Details'}
              </h3>
              
              <div style="margin: 15px 0;">
                ${data.promoCode ? `
                  <div style="text-align: center; margin: 20px 0; padding: 20px; background: linear-gradient(135deg, ${this.brandColors.accent} 0%, #e6bc1a 100%); border-radius: 12px;">
                    <h4 style="margin: 0 0 10px 0; color: ${this.brandColors.dark};">${lang === 'tl' ? 'Promo Code:' : 'Promo Code:'}</h4>
                    <div style="font-size: 24px; font-weight: bold; color: ${this.brandColors.dark}; letter-spacing: 2px; font-family: monospace;">
                      ${data.promoCode}
                    </div>
                  </div>
                ` : ''}
                
                ${data.discount ? `<strong>${lang === 'tl' ? 'Discount:' : 'Discount:'}</strong> ${data.discount}% OFF<br>` : ''}
                ${data.minimumOrder ? `<strong>${lang === 'tl' ? 'Minimum Order:' : 'Minimum Order:'}</strong> ₱${data.minimumOrder}<br>` : ''}
                ${data.maxDiscount ? `<strong>${lang === 'tl' ? 'Max Discount:' : 'Max Discount:'}</strong> ₱${data.maxDiscount}<br>` : ''}
                ${data.validUntil ? `<strong>${lang === 'tl' ? 'Valid Until:' : 'Valid Until:'}</strong> ${new Date(data.validUntil).toLocaleDateString(lang === 'tl' ? 'tl-PH' : 'en-PH')}<br>` : ''}
                ${data.applicableRestaurants ? `<strong>${lang === 'tl' ? 'Available sa:' : 'Available at:'}</strong> ${data.applicableRestaurants}<br>` : ''}
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/restaurants${data.promoCode ? `?promo=${data.promoCode}` : ''}" class="button">
                🛒 ${lang === 'tl' ? 'Mag-Order Ngayon' : 'Order Now'}
              </a>
            </div>
            
            <div class="info-box">
              <p style="margin: 0;">
                ${lang === 'tl' ? 
                  'Huwag palampasin ang limited-time offer na ito! I-share sa mga kaibigan para mas maraming makakakuha ng discount.' :
                  "Don't miss this limited-time offer! Share with friends so more people can enjoy the discount."
                }
              </p>
            </div>
          </div>
          
          <div class="footer">
            <div class="social-links">
              <a href="https://facebook.com/BTSDeliveryPH">Facebook</a> • 
              <a href="https://instagram.com/btsdeliveryph">Instagram</a> • 
              <a href="https://twitter.com/btsdeliveryph">Twitter</a>
            </div>
            
            <div class="footer-divider"></div>
            
            <p>${t('copyright')}</p>
            <p style="margin-top: 10px; font-size: 11px; opacity: 0.8;">
              ${lang === 'tl' ? 
                'Natanggap mo ang promotional email na ito dahil naka-subscribe ka sa BTS Delivery updates.' :
                'You received this promotional email because you subscribed to BTS Delivery updates.'
              }
            </p>
            <p style="margin-top: 5px;">
              <a href="${process.env.FRONTEND_URL}/unsubscribe?email=${data.customerEmail}&type=promotional">
                ${lang === 'tl' ? 'Mag-unsubscribe sa promotional emails' : 'Unsubscribe from promotional emails'}
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      ${data.title} - ${lang === 'tl' ? 'Special Offer sa BTS Delivery!' : 'Special Offer from BTS Delivery!'}
      
      ${t('greeting')} ${data.customerName || 'Valued Customer'},
      
      ${data.description}
      
      ${lang === 'tl' ? 'Detalye ng Promo:' : 'Promotion Details:'}
      ${data.promoCode ? `- Promo Code: ${data.promoCode}` : ''}
      ${data.discount ? `- Discount: ${data.discount}% OFF` : ''}
      ${data.minimumOrder ? `- Minimum Order: ₱${data.minimumOrder}` : ''}
      ${data.validUntil ? `- Valid Until: ${new Date(data.validUntil).toLocaleDateString(lang === 'tl' ? 'tl-PH' : 'en-PH')}` : ''}
      
      ${lang === 'tl' ? 'Mag-order ngayon:' : 'Order now:'} ${process.env.FRONTEND_URL}/restaurants${data.promoCode ? `?promo=${data.promoCode}` : ''}
      
      ${t('teamSignature')}
      
      ${lang === 'tl' ? 'Mag-unsubscribe:' : 'Unsubscribe:'} ${process.env.FRONTEND_URL}/unsubscribe?email=${data.customerEmail}&type=promotional
    `;
    
    return { subject, html, text };
  }
}

// Export singleton instance
export const emailTemplateEngine = new EmailTemplateEngine();

// Export specific template generators for easy access
export const generateOrderConfirmation = (data: TemplateData, lang: 'en' | 'tl' = 'en') => 
  emailTemplateEngine.generateOrderConfirmationEmail(data, lang);

export const generateOrderStatusUpdate = (data: TemplateData, lang: 'en' | 'tl' = 'en') => 
  emailTemplateEngine.generateOrderStatusUpdateEmail(data, lang);

export const generateWelcomeEmail = (data: TemplateData, lang: 'en' | 'tl' = 'en') => 
  emailTemplateEngine.generateWelcomeEmail(data, lang);

export const generateVendorNewOrder = (data: TemplateData, lang: 'en' | 'tl' = 'en') => 
  emailTemplateEngine.generateVendorNewOrderEmail(data, lang);

export const generatePromotional = (data: TemplateData, lang: 'en' | 'tl' = 'en') => 
  emailTemplateEngine.generatePromotionalEmail(data, lang);