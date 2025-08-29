import { Link } from "wouter";
import btsLogo from "@assets/bts-logo-transparent.png";

export default function Footer() {
  return (
    <footer className="bts-gradient-secondary text-white py-12 relative overflow-hidden" data-testid="footer">
      <div className="absolute inset-0 bts-shimmer opacity-10"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <img 
                src={btsLogo} 
                alt="BTS Delivery Logo" 
                className="w-10 h-10 object-contain rounded-full bg-white p-0.5"
              />
              <span className="font-bold text-xl text-[#FFD23F]">BTS Delivery</span>
            </div>
            <p className="text-white/80" data-testid="footer-description">
              Bringing the best of Batangas to your doorstep with reliable, fast delivery service.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-4">Para sa Customers</h4>
            <ul className="space-y-2 text-white/80">
              <li><Link href="/" className="hover:text-white transition-colors">How to Order</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Track Order</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Customer Support</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">FAQs</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-4">Para sa Partners</h4>
            <ul className="space-y-2 text-white/80">
              <li><Link href="/vendor-dashboard" className="hover:text-white transition-colors">Restaurant Signup</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Rider Application</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Business Solutions</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Commission Rates</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-4">Contact Us</h4>
            <ul className="space-y-2 text-white/80">
              <li className="flex items-center space-x-2">
                <span>📞</span>
                <span>+63 917 123 4567</span>
              </li>
              <li className="flex items-center space-x-2">
                <span>✉️</span>
                <span>support@btsdelivery.ph</span>
              </li>
              <li className="flex items-center space-x-2">
                <span>📍</span>
                <span>Batangas City, Philippines</span>
              </li>
            </ul>
            
            <div className="flex space-x-4 mt-4">
              <a href="#" className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                📘
              </a>
              <a href="#" className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                📷
              </a>
              <a href="#" className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                🐦
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/20 mt-12 pt-8 text-center text-white/60">
          <p>&copy; 2024 BTS Delivery. All rights reserved. | Privacy Policy | Terms of Service</p>
        </div>
      </div>
    </footer>
  );
}
