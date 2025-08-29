import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface LanguageContextType {
  language: "en" | "tl";
  setLanguage: (lang: "en" | "tl") => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.restaurants": "Restaurants",
    "nav.orders": "Orders",
    "nav.cart": "Cart",
    "nav.profile": "Profile",
    "nav.admin": "Admin",
    "nav.notifications": "Notifications",
    "nav.rewards": "Rewards",
    
    // Services
    "service.food": "Food Delivery",
    "service.pabili": "Pabili Service",
    "service.pabayad": "Pabayad Service",
    "service.parcel": "Parcel Delivery",
    
    // Common Actions
    "action.order": "Order Now",
    "action.addToCart": "Add to Cart",
    "action.checkout": "Checkout",
    "action.search": "Search",
    "action.filter": "Filter",
    "action.viewMore": "View More",
    "action.close": "Close",
    "action.confirm": "Confirm",
    "action.cancel": "Cancel",
    "action.save": "Save",
    "action.edit": "Edit",
    "action.delete": "Delete",
    
    // Status
    "status.pending": "Pending",
    "status.confirmed": "Confirmed",
    "status.preparing": "Preparing",
    "status.ready": "Ready for Pickup",
    "status.inTransit": "In Transit",
    "status.delivered": "Delivered",
    "status.cancelled": "Cancelled",
    
    // User Interface
    "ui.welcome": "Welcome",
    "ui.loading": "Loading...",
    "ui.noResults": "No results found",
    "ui.error": "Something went wrong",
    "ui.success": "Success!",
    "ui.points": "Points",
    "ui.tier": "Tier",
    "ui.deliveryFee": "Delivery Fee",
    "ui.subtotal": "Subtotal",
    "ui.total": "Total",
    "ui.estimatedTime": "Estimated Time",
    "ui.minutes": "minutes",
    
    // Messages
    "msg.orderPlaced": "Your order has been placed successfully!",
    "msg.itemAdded": "Item added to cart",
    "msg.loginRequired": "Please login to continue",
    "msg.pointsEarned": "You earned points!",
    "msg.rewardRedeemed": "Reward redeemed successfully!",
    
    // Loyalty
    "loyalty.bronze": "Bronze",
    "loyalty.silver": "Silver",
    "loyalty.gold": "Gold",
    "loyalty.platinum": "Platinum",
    "loyalty.earnPoints": "Earn Points",
    "loyalty.redeemRewards": "Redeem Rewards",
    "loyalty.availableRewards": "Available Rewards",
    "loyalty.pointsHistory": "Points History",
    "loyalty.tierBenefits": "Tier Benefits",
    
    // Footer
    "footer.aboutUs": "About Us",
    "footer.contactUs": "Contact Us",
    "footer.help": "Help Center",
    "footer.terms": "Terms & Conditions",
    "footer.privacy": "Privacy Policy"
  },
  tl: {
    // Navigation
    "nav.home": "Tahanan",
    "nav.restaurants": "Mga Kainan",
    "nav.orders": "Mga Order",
    "nav.cart": "Cart",
    "nav.profile": "Profile",
    "nav.admin": "Admin",
    "nav.notifications": "Mga Abiso",
    "nav.rewards": "Mga Gantimpala",
    
    // Services
    "service.food": "Paghahatid ng Pagkain",
    "service.pabili": "Pabili Service",
    "service.pabayad": "Pabayad Service",
    "service.parcel": "Padala ng Pakete",
    
    // Common Actions
    "action.order": "Umorder Ngayon",
    "action.addToCart": "Idagdag sa Cart",
    "action.checkout": "Checkout",
    "action.search": "Maghanap",
    "action.filter": "I-filter",
    "action.viewMore": "Tingnan Pa",
    "action.close": "Isara",
    "action.confirm": "Kumpirmahin",
    "action.cancel": "Kanselahin",
    "action.save": "I-save",
    "action.edit": "I-edit",
    "action.delete": "Tanggalin",
    
    // Status
    "status.pending": "Naghihintay",
    "status.confirmed": "Nakumpirma",
    "status.preparing": "Inihahanda",
    "status.ready": "Handa na para Kunin",
    "status.inTransit": "Nasa Daan",
    "status.delivered": "Naihatid na",
    "status.cancelled": "Kinansela",
    
    // User Interface
    "ui.welcome": "Maligayang Pagdating",
    "ui.loading": "Naghihintay...",
    "ui.noResults": "Walang nahanap",
    "ui.error": "May mali",
    "ui.success": "Tagumpay!",
    "ui.points": "Puntos",
    "ui.tier": "Antas",
    "ui.deliveryFee": "Bayad sa Delivery",
    "ui.subtotal": "Subtotal",
    "ui.total": "Kabuuan",
    "ui.estimatedTime": "Tinatayang Oras",
    "ui.minutes": "minuto",
    
    // Messages
    "msg.orderPlaced": "Matagumpay na nailagay ang iyong order!",
    "msg.itemAdded": "Naidagdag sa cart",
    "msg.loginRequired": "Mag-login para magpatuloy",
    "msg.pointsEarned": "Nakakuha ka ng puntos!",
    "msg.rewardRedeemed": "Matagumpay na na-redeem ang gantimpala!",
    
    // Loyalty
    "loyalty.bronze": "Tanso",
    "loyalty.silver": "Pilak",
    "loyalty.gold": "Ginto",
    "loyalty.platinum": "Platino",
    "loyalty.earnPoints": "Kumita ng Puntos",
    "loyalty.redeemRewards": "I-redeem ang Gantimpala",
    "loyalty.availableRewards": "Mga Available na Gantimpala",
    "loyalty.pointsHistory": "Kasaysayan ng Puntos",
    "loyalty.tierBenefits": "Mga Benepisyo ng Antas",
    
    // Footer
    "footer.aboutUs": "Tungkol Sa Amin",
    "footer.contactUs": "Makipag-ugnayan",
    "footer.help": "Tulong Center",
    "footer.terms": "Mga Tuntunin",
    "footer.privacy": "Patakaran sa Privacy"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<"en" | "tl">(() => {
    const saved = localStorage.getItem("bts-language");
    return (saved as "en" | "tl") || "tl"; // Default to Tagalog
  });

  useEffect(() => {
    localStorage.setItem("bts-language", language);
    document.documentElement.lang = language === "tl" ? "tl" : "en";
  }, [language]);

  const setLanguage = (lang: "en" | "tl") => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const translation = translations[language][key as keyof typeof translations["en"]];
    if (!translation) {
      console.warn(`Missing translation for key: ${key} in language: ${language}`);
      return translations["en"][key as keyof typeof translations["en"]] || key;
    }
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}