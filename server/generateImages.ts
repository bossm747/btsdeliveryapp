import { generateImage } from "./gemini";
import * as fs from "fs";
import * as path from "path";

// Ensure assets directory exists
const assetsDir = path.join(process.cwd(), "client", "src", "assets", "generated");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

export async function generatePlatformImages() {
  const images = [
    // Filipino Food Items
    {
      name: "adobo",
      prompt: "Delicious Filipino chicken adobo served in a white ceramic bowl with rice on the side, garnished with green onions, studio lighting, food photography style, appetizing presentation",
      filename: "adobo.jpg"
    },
    {
      name: "lechon",
      prompt: "Crispy Filipino lechon (roasted pork) with golden brown skin, sliced and arranged on a wooden platter, garnished with herbs, professional food photography",
      filename: "lechon.jpg"
    },
    {
      name: "sinigang",
      prompt: "Hot and sour Filipino sinigang soup with pork ribs and vegetables in a clay pot, steaming, traditional Filipino comfort food, warm lighting",
      filename: "sinigang.jpg"
    },
    {
      name: "lumpia",
      prompt: "Fresh Filipino lumpia spring rolls arranged on a banana leaf, served with sweet and sour dipping sauce, colorful vegetables visible through wrapper",
      filename: "lumpia.jpg"
    },
    {
      name: "pancit",
      prompt: "Filipino pancit noodles with vegetables and meat, served on a white plate, garnished with lemon wedges and green onions, appetizing food photography",
      filename: "pancit.jpg"
    },
    {
      name: "halo-halo",
      prompt: "Colorful Filipino halo-halo dessert in a tall glass with layers of shaved ice, beans, fruits, ube ice cream, and milk, vibrant tropical dessert",
      filename: "halo-halo.jpg"
    },
    
    // Restaurant Types
    {
      name: "filipino-restaurant",
      prompt: "Cozy Filipino restaurant interior with wooden furniture, warm lighting, bamboo decorations, traditional Filipino elements, welcoming atmosphere",
      filename: "filipino-restaurant.jpg"
    },
    {
      name: "fast-food-restaurant",
      prompt: "Modern fast food restaurant interior with orange and green color scheme, clean contemporary design, comfortable seating, bright lighting",
      filename: "fast-food-restaurant.jpg"
    },
    {
      name: "chinese-restaurant",
      prompt: "Elegant Chinese restaurant interior with red and gold accents, round tables, traditional Chinese decorations, warm ambient lighting",
      filename: "chinese-restaurant.jpg"
    },
    
    // Service Category Images
    {
      name: "pabili-service",
      prompt: "Filipino grocery shopping service illustration showing fresh fruits, vegetables, and household items in shopping bags, delivery concept, bright colors",
      filename: "pabili-service.jpg"
    },
    {
      name: "pabayad-service",
      prompt: "Filipino bill payment service illustration showing various bills and payment receipts, mobile phone with payment app, financial service concept",
      filename: "pabayad-service.jpg"
    },
    {
      name: "parcel-delivery",
      prompt: "Package delivery service showing wrapped parcels and boxes ready for delivery, delivery motorcycle in background, logistics concept",
      filename: "parcel-delivery.jpg"
    },
    
    // Hero/Banner Images
    {
      name: "delivery-hero",
      prompt: "Filipino food delivery hero image showing a delivery rider on motorcycle with thermal bags, Philippine cityscape background, dynamic action shot",
      filename: "delivery-hero.jpg"
    },
    {
      name: "food-spread",
      prompt: "Abundant Filipino food spread from top view, various traditional dishes arranged beautifully, colorful and appetizing presentation, food photography",
      filename: "food-spread.jpg"
    }
  ];

  console.log("Starting image generation for BTS Delivery platform...");
  
  for (const image of images) {
    try {
      console.log(`Generating ${image.name}...`);
      const imagePath = path.join(assetsDir, image.filename);
      
      await generateImage(image.prompt, imagePath);
      console.log(`✅ Generated: ${image.filename}`);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Failed to generate ${image.name}:`, error);
    }
  }
  
  console.log("Image generation complete!");
  return true;
}

// Export for use in routes
export { generateImage };