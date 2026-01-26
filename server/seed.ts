import bcrypt from "bcryptjs";
import { db } from "./db";
import {
  users,
  restaurants,
  menuCategories,
  menuItems,
  riders,
  orders,
  orderStatusHistory,
  deliveryZones,
  platformConfig,
  userAddresses,
} from "@shared/schema";
import { sql } from "drizzle-orm";

// Helper function to hash password
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Helper function to generate random phone number
function generatePhoneNumber(): string {
  const prefixes = ["0917", "0918", "0919", "0920", "0921", "0922", "0923"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
  return `${prefix}${suffix}`;
}

async function seed() {
  console.log("🌱 Starting database seeding...");
  
  try {
    // Clean existing data using raw SQL with CASCADE
    console.log("🧹 Cleaning existing data...");
    
    // Clean all related tables first, then users last
    const tablesToClean = [
      'order_status_history',
      'orders',
      'menu_items',
      'menu_categories',
      'riders',
      'user_addresses',
      'restaurants',
      'delivery_zones',
      'platform_config',
      'users'
    ];
    
    for (const tableName of tablesToClean) {
      try {
        await db.execute(sql`DELETE FROM ${sql.raw(tableName)}`);
      } catch (e) {
        // Table might not exist or have no data, continue
      }
    }
    
    console.log("✅ Existing data cleaned");
    
    // Hash password for all users
    const hashedPassword = await hashPassword("Test@1234");
    
    // =============================================
    // SEED USERS
    // =============================================
    console.log("👤 Creating users...");
    
    // Insert users using raw SQL to avoid schema mismatch issues
    const insertedUsers = [];
    
    const usersToInsert = [
      { email: "admin@btsdelivery.ph", phone: "09171234567", firstName: "Juan", lastName: "dela Cruz", role: "admin" },
      { email: "maria.santos@gmail.com", phone: "09182345678", firstName: "Maria", lastName: "Santos", role: "customer", preferences: { defaultCity: "Batangas City", favoriteCategories: ["Filipino Food", "Fast Food"] } },
      { email: "pedro.reyes@yahoo.com", phone: "09193456789", firstName: "Pedro", lastName: "Reyes", role: "customer", preferences: { defaultCity: "Lipa City", favoriteCategories: ["Filipino Food", "Coffee Shop"] } },
      { email: "ana.garcia@gmail.com", phone: "09204567890", firstName: "Ana", lastName: "Garcia", role: "customer", preferences: { defaultCity: "Tanauan", favoriteCategories: ["Bakery", "Desserts"] } },
      { email: "jose@lomihaus.ph", phone: "09215678901", firstName: "Jose", lastName: "Mendoza", role: "vendor" },
      { email: "rosa@bulaloexpress.ph", phone: "09226789012", firstName: "Rosa", lastName: "Bautista", role: "vendor" },
      { email: "ramon@kapitanbbq.ph", phone: "09237890123", firstName: "Ramon", lastName: "Cruz", role: "vendor" },
      { email: "linda@batangasbakery.ph", phone: "09248901234", firstName: "Linda", lastName: "Villareal", role: "vendor" },
      { email: "miguel@rider.bts", phone: "09179012345", firstName: "Miguel", lastName: "Torres", role: "rider" },
      { email: "carlo@rider.bts", phone: "09180123456", firstName: "Carlo", lastName: "Ramos", role: "rider" },
      { email: "luis@rider.bts", phone: "09191234567", firstName: "Luis", lastName: "Alvarez", role: "rider" },
    ];
    
    // Insert users using raw SQL
    for (const userData of usersToInsert) {
      const result = await db.execute(sql`
        INSERT INTO users (
          email, 
          phone, 
          password_hash, 
          first_name, 
          last_name, 
          role, 
          status, 
          email_verified_at, 
          phone_verified_at, 
          preferences
        )
        VALUES (
          ${userData.email},
          ${userData.phone},
          ${hashedPassword},
          ${userData.firstName},
          ${userData.lastName},
          ${userData.role},
          'active',
          ${new Date()},
          ${new Date()},
          ${userData.preferences ? JSON.stringify(userData.preferences) : null}
        )
        RETURNING *
      `);
      insertedUsers.push(result.rows[0]);
    }
    
    console.log(`✅ Created ${insertedUsers.length} users`);
    
    // Map users by email for easy reference
    const userMap = new Map(insertedUsers.map(u => [u.email, u]));
    
    // =============================================
    // SEED USER ADDRESSES
    // =============================================
    console.log("📍 Creating user addresses...");
    
    const addressesData: any[] = [
      {
        userId: userMap.get("maria.santos@gmail.com")!.id,
        title: "Home",
        streetAddress: "123 Rizal Street",
        barangay: "Poblacion",
        city: "Batangas City",
        province: "Batangas",
        zipCode: "4200",
        landmark: "Near BDO Bank",
        coordinates: { lat: 13.7565, lng: 121.0583 },
        isDefault: true,
      },
      {
        userId: userMap.get("pedro.reyes@yahoo.com")!.id,
        title: "Home",
        streetAddress: "456 Mabini Avenue",
        barangay: "Maraouy",
        city: "Lipa City",
        province: "Batangas",
        zipCode: "4217",
        landmark: "Across from Robinson's Place",
        coordinates: { lat: 13.9417, lng: 121.1639 },
        isDefault: true,
      },
      {
        userId: userMap.get("ana.garcia@gmail.com")!.id,
        title: "Home",
        streetAddress: "789 Laurel Street",
        barangay: "Santol",
        city: "Tanauan",
        province: "Batangas",
        zipCode: "4232",
        landmark: "Near Tanauan Public Market",
        coordinates: { lat: 14.0861, lng: 121.1497 },
        isDefault: true,
      },
    ];
    
    await db.insert(userAddresses).values(addressesData);
    console.log(`✅ Created ${addressesData.length} user addresses`);
    
    // =============================================
    // SEED RESTAURANTS
    // =============================================
    console.log("🏪 Creating restaurants...");
    
    const restaurantsData: any[] = [
      {
        ownerId: userMap.get("jose@lomihaus.ph")!.id,
        name: "Lomi Haus",
        description: "Authentic Batangas Lomi and Traditional Filipino Comfort Food",
        category: "Filipino Food",
        logoUrl: "/images/lomi-haus-logo.png",
        imageUrl: "/images/lomi-haus-cover.jpg",
        address: {
          street: "P. Burgos Street",
          barangay: "Poblacion",
          city: "Batangas City",
          province: "Batangas",
          zipCode: "4200"
        },
        phone: "043-723-4567",
        email: "info@lomihaus.ph",
        operatingHours: {
          monday: { open: "06:00", close: "22:00", isClosed: false },
          tuesday: { open: "06:00", close: "22:00", isClosed: false },
          wednesday: { open: "06:00", close: "22:00", isClosed: false },
          thursday: { open: "06:00", close: "22:00", isClosed: false },
          friday: { open: "06:00", close: "23:00", isClosed: false },
          saturday: { open: "06:00", close: "23:00", isClosed: false },
          sunday: { open: "07:00", close: "21:00", isClosed: false }
        },
        services: ["food"],
        deliveryFee: "49",
        minimumOrder: "150",
        estimatedDeliveryTime: 30,
        isActive: true,
        isAcceptingOrders: true,
        rating: "4.5",
        totalOrders: 1250,
        totalReviews: 380,
      },
      {
        ownerId: userMap.get("rosa@bulaloexpress.ph")!.id,
        name: "Bulalo Express",
        description: "Home of Authentic Batangas Bulalo and Fresh Tawilis",
        category: "Filipino Food",
        logoUrl: "/images/bulalo-express-logo.png",
        imageUrl: "/images/bulalo-express-cover.jpg",
        address: {
          street: "J.P. Laurel Highway",
          barangay: "San Jose",
          city: "Lipa City",
          province: "Batangas",
          zipCode: "4217"
        },
        phone: "043-756-7890",
        email: "info@bulaloexpress.ph",
        operatingHours: {
          monday: { open: "10:00", close: "22:00", isClosed: false },
          tuesday: { open: "10:00", close: "22:00", isClosed: false },
          wednesday: { open: "10:00", close: "22:00", isClosed: false },
          thursday: { open: "10:00", close: "22:00", isClosed: false },
          friday: { open: "10:00", close: "23:00", isClosed: false },
          saturday: { open: "10:00", close: "23:00", isClosed: false },
          sunday: { open: "10:00", close: "22:00", isClosed: false }
        },
        services: ["food"],
        deliveryFee: "49",
        minimumOrder: "200",
        estimatedDeliveryTime: 35,
        isActive: true,
        isAcceptingOrders: true,
        rating: "4.7",
        totalOrders: 980,
        totalReviews: 290,
      },
      {
        ownerId: userMap.get("ramon@kapitanbbq.ph")!.id,
        name: "Kapitan BBQ",
        description: "Grilled Specialties and Authentic Filipino BBQ",
        category: "BBQ & Grill",
        logoUrl: "/images/kapitan-bbq-logo.png",
        imageUrl: "/images/kapitan-bbq-cover.jpg",
        address: {
          street: "A. Mabini Avenue",
          barangay: "Bootcamp",
          city: "Tanauan",
          province: "Batangas",
          zipCode: "4232"
        },
        phone: "043-778-3456",
        email: "info@kapitanbbq.ph",
        operatingHours: {
          monday: { open: "11:00", close: "23:00", isClosed: false },
          tuesday: { open: "11:00", close: "23:00", isClosed: false },
          wednesday: { open: "11:00", close: "23:00", isClosed: false },
          thursday: { open: "11:00", close: "23:00", isClosed: false },
          friday: { open: "11:00", close: "24:00", isClosed: false },
          saturday: { open: "11:00", close: "24:00", isClosed: false },
          sunday: { open: "11:00", close: "23:00", isClosed: false }
        },
        services: ["food"],
        deliveryFee: "49",
        minimumOrder: "180",
        estimatedDeliveryTime: 30,
        isActive: true,
        isAcceptingOrders: true,
        rating: "4.6",
        totalOrders: 850,
        totalReviews: 250,
      },
      {
        ownerId: userMap.get("linda@batangasbakery.ph")!.id,
        name: "Batangas Bakery",
        description: "Traditional Batangas Delicacies and Kapeng Barako",
        category: "Bakery & Coffee",
        logoUrl: "/images/batangas-bakery-logo.png",
        imageUrl: "/images/batangas-bakery-cover.jpg",
        address: {
          street: "Rizal Avenue",
          barangay: "Poblacion",
          city: "Batangas City",
          province: "Batangas",
          zipCode: "4200"
        },
        phone: "043-722-1234",
        email: "info@batangasbakery.ph",
        operatingHours: {
          monday: { open: "05:00", close: "20:00", isClosed: false },
          tuesday: { open: "05:00", close: "20:00", isClosed: false },
          wednesday: { open: "05:00", close: "20:00", isClosed: false },
          thursday: { open: "05:00", close: "20:00", isClosed: false },
          friday: { open: "05:00", close: "21:00", isClosed: false },
          saturday: { open: "05:00", close: "21:00", isClosed: false },
          sunday: { open: "06:00", close: "19:00", isClosed: false }
        },
        services: ["food", "mart"],
        deliveryFee: "39",
        minimumOrder: "100",
        estimatedDeliveryTime: 25,
        isActive: true,
        isAcceptingOrders: true,
        rating: "4.8",
        totalOrders: 1450,
        totalReviews: 420,
      }
    ];
    
    const insertedRestaurants = await db.insert(restaurants).values(restaurantsData).returning();
    console.log(`✅ Created ${insertedRestaurants.length} restaurants`);
    
    // Map restaurants by name for easy reference
    const restaurantMap = new Map(insertedRestaurants.map(r => [r.name, r]));
    
    // =============================================
    // SEED MENU CATEGORIES
    // =============================================
    console.log("📂 Creating menu categories...");
    
    const categoriesData: any[] = [
      // Lomi Haus Categories
      {
        restaurantId: restaurantMap.get("Lomi Haus")!.id,
        name: "Lomi Specials",
        description: "Our famous Batangas Lomi varieties",
        displayOrder: 1,
        isActive: true,
      },
      {
        restaurantId: restaurantMap.get("Lomi Haus")!.id,
        name: "Silog Meals",
        description: "Filipino breakfast favorites served all day",
        displayOrder: 2,
        isActive: true,
      },
      {
        restaurantId: restaurantMap.get("Lomi Haus")!.id,
        name: "Beverages",
        description: "Refreshing drinks",
        displayOrder: 3,
        isActive: true,
      },
      // Bulalo Express Categories
      {
        restaurantId: restaurantMap.get("Bulalo Express")!.id,
        name: "Bulalo & Soups",
        description: "Hearty beef soups and traditional favorites",
        displayOrder: 1,
        isActive: true,
      },
      {
        restaurantId: restaurantMap.get("Bulalo Express")!.id,
        name: "Seafood Specials",
        description: "Fresh from Batangas waters",
        displayOrder: 2,
        isActive: true,
      },
      {
        restaurantId: restaurantMap.get("Bulalo Express")!.id,
        name: "Beverages",
        description: "Hot and cold drinks",
        displayOrder: 3,
        isActive: true,
      },
      // Kapitan BBQ Categories
      {
        restaurantId: restaurantMap.get("Kapitan BBQ")!.id,
        name: "BBQ & Grilled",
        description: "Charcoal-grilled favorites",
        displayOrder: 1,
        isActive: true,
      },
      {
        restaurantId: restaurantMap.get("Kapitan BBQ")!.id,
        name: "Pulutan",
        description: "Perfect beer companions",
        displayOrder: 2,
        isActive: true,
      },
      {
        restaurantId: restaurantMap.get("Kapitan BBQ")!.id,
        name: "Beverages",
        description: "Drinks and refreshments",
        displayOrder: 3,
        isActive: true,
      },
      // Batangas Bakery Categories
      {
        restaurantId: restaurantMap.get("Batangas Bakery")!.id,
        name: "Breads & Pastries",
        description: "Freshly baked daily",
        displayOrder: 1,
        isActive: true,
      },
      {
        restaurantId: restaurantMap.get("Batangas Bakery")!.id,
        name: "Native Delicacies",
        description: "Traditional Batangas sweets",
        displayOrder: 2,
        isActive: true,
      },
      {
        restaurantId: restaurantMap.get("Batangas Bakery")!.id,
        name: "Coffee & Drinks",
        description: "Featuring Kapeng Barako",
        displayOrder: 3,
        isActive: true,
      },
    ];
    
    const insertedCategories = await db.insert(menuCategories).values(categoriesData).returning();
    console.log(`✅ Created ${insertedCategories.length} menu categories`);
    
    // Map categories for reference
    const categoryMap = new Map<string, string>();
    insertedCategories.forEach(cat => {
      const key = `${cat.restaurantId}-${cat.name}`;
      categoryMap.set(key, cat.id);
    });
    
    // =============================================
    // SEED MENU ITEMS
    // =============================================
    console.log("🍽️ Creating menu items...");
    
    const menuItemsData: any[] = [
      // LOMI HAUS ITEMS
      {
        restaurantId: restaurantMap.get("Lomi Haus")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Lomi Haus")!.id}-Lomi Specials`),
        name: "Special Batangas Lomi",
        description: "Thick egg noodles with pork, liver, chicharon, and egg in rich broth",
        price: "120",
        imageUrl: "/images/special-lomi.jpg",
        isAvailable: true,
        preparationTime: 15,
        nutritionalInfo: { calories: 450, protein: 25, carbs: 40, fat: 20 },
        tags: ["bestseller", "signature"],
      },
      {
        restaurantId: restaurantMap.get("Lomi Haus")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Lomi Haus")!.id}-Lomi Specials`),
        name: "Lomi Overload",
        description: "Extra toppings of lechon kawali, chicharon, egg, and kikiam",
        price: "150",
        imageUrl: "/images/lomi-overload.jpg",
        isAvailable: true,
        preparationTime: 15,
        tags: ["popular"],
      },
      {
        restaurantId: restaurantMap.get("Lomi Haus")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Lomi Haus")!.id}-Lomi Specials`),
        name: "Goto Special",
        description: "Rice porridge with beef tripe, ginger, and egg",
        price: "95",
        imageUrl: "/images/goto.jpg",
        isAvailable: true,
        preparationTime: 10,
      },
      {
        restaurantId: restaurantMap.get("Lomi Haus")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Lomi Haus")!.id}-Silog Meals`),
        name: "Tapsilog",
        description: "Sweet marinated beef with garlic fried rice and sunny-side up egg",
        price: "135",
        imageUrl: "/images/tapsilog.jpg",
        isAvailable: true,
        preparationTime: 12,
        tags: ["breakfast"],
      },
      {
        restaurantId: restaurantMap.get("Lomi Haus")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Lomi Haus")!.id}-Silog Meals`),
        name: "Longsilog",
        description: "Sweet longganisa with garlic fried rice and egg",
        price: "125",
        imageUrl: "/images/longsilog.jpg",
        isAvailable: true,
        preparationTime: 10,
        tags: ["breakfast"],
      },
      {
        restaurantId: restaurantMap.get("Lomi Haus")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Lomi Haus")!.id}-Beverages`),
        name: "Fresh Buko Juice",
        description: "Refreshing young coconut juice",
        price: "50",
        imageUrl: "/images/buko-juice.jpg",
        isAvailable: true,
        preparationTime: 5,
      },
      
      // BULALO EXPRESS ITEMS
      {
        restaurantId: restaurantMap.get("Bulalo Express")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Bulalo Express")!.id}-Bulalo & Soups`),
        name: "Special Bulalo",
        description: "Tender beef shank and bone marrow soup with vegetables",
        price: "350",
        imageUrl: "/images/bulalo.jpg",
        isAvailable: true,
        preparationTime: 20,
        tags: ["signature", "bestseller"],
        nutritionalInfo: { calories: 380, protein: 35, carbs: 15, fat: 22 },
      },
      {
        restaurantId: restaurantMap.get("Bulalo Express")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Bulalo Express")!.id}-Bulalo & Soups`),
        name: "Sinigang na Baboy",
        description: "Pork in sour tamarind soup with vegetables",
        price: "280",
        imageUrl: "/images/sinigang.jpg",
        isAvailable: true,
        preparationTime: 18,
        tags: ["popular"],
      },
      {
        restaurantId: restaurantMap.get("Bulalo Express")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Bulalo Express")!.id}-Seafood Specials`),
        name: "Crispy Tawilis",
        description: "Deep-fried freshwater sardines from Taal Lake",
        price: "180",
        imageUrl: "/images/tawilis.jpg",
        isAvailable: true,
        preparationTime: 12,
        tags: ["local-specialty"],
      },
      {
        restaurantId: restaurantMap.get("Bulalo Express")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Bulalo Express")!.id}-Seafood Specials`),
        name: "Maliputo Fish",
        description: "Grilled Taal Lake fish with special sauce",
        price: "320",
        imageUrl: "/images/maliputo.jpg",
        isAvailable: true,
        preparationTime: 20,
        tags: ["premium"],
      },
      {
        restaurantId: restaurantMap.get("Bulalo Express")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Bulalo Express")!.id}-Beverages`),
        name: "Sago't Gulaman",
        description: "Sweet drink with tapioca pearls and gelatin",
        price: "45",
        imageUrl: "/images/sago-gulaman.jpg",
        isAvailable: true,
        preparationTime: 5,
      },
      
      // KAPITAN BBQ ITEMS
      {
        restaurantId: restaurantMap.get("Kapitan BBQ")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Kapitan BBQ")!.id}-BBQ & Grilled`),
        name: "Pork BBQ (5 sticks)",
        description: "Sweet and savory grilled pork skewers",
        price: "150",
        imageUrl: "/images/pork-bbq.jpg",
        isAvailable: true,
        preparationTime: 15,
        tags: ["bestseller"],
      },
      {
        restaurantId: restaurantMap.get("Kapitan BBQ")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Kapitan BBQ")!.id}-BBQ & Grilled`),
        name: "Chicken Inasal",
        description: "Grilled chicken marinated in local spices with java rice",
        price: "180",
        imageUrl: "/images/chicken-inasal.jpg",
        isAvailable: true,
        preparationTime: 20,
        tags: ["popular"],
      },
      {
        restaurantId: restaurantMap.get("Kapitan BBQ")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Kapitan BBQ")!.id}-BBQ & Grilled`),
        name: "Liempo (Grilled Pork Belly)",
        description: "Marinated pork belly grilled to perfection",
        price: "220",
        imageUrl: "/images/liempo.jpg",
        isAvailable: true,
        preparationTime: 18,
      },
      {
        restaurantId: restaurantMap.get("Kapitan BBQ")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Kapitan BBQ")!.id}-Pulutan`),
        name: "Sisig",
        description: "Sizzling chopped pork face with chili and calamansi",
        price: "195",
        imageUrl: "/images/sisig.jpg",
        isAvailable: true,
        preparationTime: 15,
        tags: ["spicy", "bestseller"],
      },
      {
        restaurantId: restaurantMap.get("Kapitan BBQ")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Kapitan BBQ")!.id}-Pulutan`),
        name: "Crispy Pata",
        description: "Deep-fried pork knuckles with dipping sauce",
        price: "450",
        imageUrl: "/images/crispy-pata.jpg",
        isAvailable: true,
        preparationTime: 25,
        tags: ["sharing", "premium"],
      },
      {
        restaurantId: restaurantMap.get("Kapitan BBQ")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Kapitan BBQ")!.id}-Beverages`),
        name: "San Miguel Beer",
        description: "Ice-cold local beer",
        price: "65",
        imageUrl: "/images/san-miguel.jpg",
        isAvailable: true,
        preparationTime: 2,
      },
      
      // BATANGAS BAKERY ITEMS
      {
        restaurantId: restaurantMap.get("Batangas Bakery")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Batangas Bakery")!.id}-Breads & Pastries`),
        name: "Pan de Sal (6pcs)",
        description: "Classic Filipino bread rolls",
        price: "50",
        imageUrl: "/images/pandesal.jpg",
        isAvailable: true,
        preparationTime: 5,
        tags: ["breakfast"],
      },
      {
        restaurantId: restaurantMap.get("Batangas Bakery")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Batangas Bakery")!.id}-Breads & Pastries`),
        name: "Ensaymada Special",
        description: "Soft, sweet bread with butter, sugar, and cheese",
        price: "85",
        imageUrl: "/images/ensaymada.jpg",
        isAvailable: true,
        preparationTime: 5,
        tags: ["popular"],
      },
      {
        restaurantId: restaurantMap.get("Batangas Bakery")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Batangas Bakery")!.id}-Native Delicacies`),
        name: "Bibingka",
        description: "Traditional rice cake with salted egg and cheese",
        price: "75",
        imageUrl: "/images/bibingka.jpg",
        isAvailable: true,
        preparationTime: 10,
        tags: ["traditional"],
      },
      {
        restaurantId: restaurantMap.get("Batangas Bakery")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Batangas Bakery")!.id}-Native Delicacies`),
        name: "Panutsa",
        description: "Traditional peanut brittle candy",
        price: "60",
        imageUrl: "/images/panutsa.jpg",
        isAvailable: true,
        preparationTime: 5,
        tags: ["local-specialty"],
      },
      {
        restaurantId: restaurantMap.get("Batangas Bakery")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Batangas Bakery")!.id}-Native Delicacies`),
        name: "Suman sa Lihiya",
        description: "Sticky rice cake wrapped in banana leaves",
        price: "55",
        imageUrl: "/images/suman.jpg",
        isAvailable: true,
        preparationTime: 5,
      },
      {
        restaurantId: restaurantMap.get("Batangas Bakery")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Batangas Bakery")!.id}-Coffee & Drinks`),
        name: "Kapeng Barako (Hot)",
        description: "Strong Batangas coffee from Liberica beans",
        price: "65",
        imageUrl: "/images/kapeng-barako.jpg",
        isAvailable: true,
        preparationTime: 5,
        tags: ["signature", "local-specialty"],
      },
      {
        restaurantId: restaurantMap.get("Batangas Bakery")!.id,
        categoryId: categoryMap.get(`${restaurantMap.get("Batangas Bakery")!.id}-Coffee & Drinks`),
        name: "Iced Kapeng Barako",
        description: "Cold brew Batangas coffee with ice",
        price: "75",
        imageUrl: "/images/iced-barako.jpg",
        isAvailable: true,
        preparationTime: 5,
        tags: ["popular"],
      },
    ];
    
    const insertedMenuItems = await db.insert(menuItems).values(menuItemsData).returning();
    console.log(`✅ Created ${insertedMenuItems.length} menu items`);
    
    // =============================================
    // SEED RIDERS
    // =============================================
    console.log("🏍️ Creating riders...");
    
    const ridersData: any[] = [
      {
        userId: userMap.get("miguel@rider.bts")!.id,
        vehicleType: "motorcycle",
        vehiclePlateNumber: "ABC 1234",
        licenseNumber: "N01-12-345678",
        currentLat: 13.7565,
        currentLng: 121.0583,
        isOnline: true,
        isAvailable: true,
        rating: "4.8",
        completedDeliveries: 523,
        earnings: "45230.50",
        bankAccountDetails: {
          bankName: "BDO",
          accountNumber: "001234567890",
          accountName: "Miguel Torres"
        }
      },
      {
        userId: userMap.get("carlo@rider.bts")!.id,
        vehicleType: "motorcycle",
        vehiclePlateNumber: "DEF 5678",
        licenseNumber: "N02-23-456789",
        currentLat: 13.9417,
        currentLng: 121.1639,
        isOnline: true,
        isAvailable: true,
        rating: "4.7",
        completedDeliveries: 412,
        earnings: "38750.00",
        bankAccountDetails: {
          bankName: "BPI",
          accountNumber: "002345678901",
          accountName: "Carlo Ramos"
        }
      },
      {
        userId: userMap.get("luis@rider.bts")!.id,
        vehicleType: "motorcycle",
        vehiclePlateNumber: "GHI 9012",
        licenseNumber: "N03-34-567890",
        currentLat: 14.0861,
        currentLng: 121.1497,
        isOnline: true,
        isAvailable: true,
        rating: "4.9",
        completedDeliveries: 389,
        earnings: "35600.25",
        bankAccountDetails: {
          bankName: "Landbank",
          accountNumber: "003456789012",
          accountName: "Luis Alvarez"
        }
      },
    ];
    
    const insertedRiders = await db.insert(riders).values(ridersData).returning();
    console.log(`✅ Created ${insertedRiders.length} riders`);
    
    // =============================================
    // SEED SERVICE ZONES
    // =============================================
    console.log("🗺️ Creating service zones...");
    
    const zonesData: any[] = [
      {
        name: "Batangas City",
        description: "City proper and nearby barangays",
        coverage: {
          type: "Polygon",
          coordinates: [
            [121.0200, 13.7300],
            [121.0900, 13.7300],
            [121.0900, 13.7800],
            [121.0200, 13.7800],
            [121.0200, 13.7300]
          ]
        },
        baseDeliveryFee: "49",
        additionalFeePerKm: "10",
        maxDistance: 15,
        isActive: true,
      },
      {
        name: "Lipa City",
        description: "Lipa proper and surrounding areas",
        coverage: {
          type: "Polygon",
          coordinates: [
            [121.1300, 13.9200],
            [121.2000, 13.9200],
            [121.2000, 13.9700],
            [121.1300, 13.9700],
            [121.1300, 13.9200]
          ]
        },
        baseDeliveryFee: "49",
        additionalFeePerKm: "10",
        maxDistance: 12,
        isActive: true,
      },
      {
        name: "Tanauan",
        description: "Tanauan city area",
        coverage: {
          type: "Polygon",
          coordinates: [
            [121.1200, 14.0600],
            [121.1800, 14.0600],
            [121.1800, 14.1100],
            [121.1200, 14.1100],
            [121.1200, 14.0600]
          ]
        },
        baseDeliveryFee: "49",
        additionalFeePerKm: "10",
        maxDistance: 10,
        isActive: true,
      },
      {
        name: "Lemery",
        description: "Lemery municipality",
        coverage: {
          type: "Polygon",
          coordinates: [
            [120.8600, 13.8800],
            [120.9200, 13.8800],
            [120.9200, 13.9300],
            [120.8600, 13.9300],
            [120.8600, 13.8800]
          ]
        },
        baseDeliveryFee: "59",
        additionalFeePerKm: "12",
        maxDistance: 10,
        isActive: true,
      },
      {
        name: "San Juan",
        description: "San Juan municipality",
        coverage: {
          type: "Polygon",
          coordinates: [
            [121.3800, 13.8000],
            [121.4400, 13.8000],
            [121.4400, 13.8500],
            [121.3800, 13.8500],
            [121.3800, 13.8000]
          ]
        },
        baseDeliveryFee: "59",
        additionalFeePerKm: "12",
        maxDistance: 8,
        isActive: true,
      },
    ];
    
    await db.insert(deliveryZones).values(zonesData);
    console.log(`✅ Created ${zonesData.length} service zones`);
    
    // =============================================
    // SEED PLATFORM CONFIG (for Pabili & Pabayad)
    // =============================================
    console.log("⚙️ Creating platform configurations...");
    
    const platformConfigData = [
      {
        configKey: "pabili_stores",
        configValue: [
          {
            name: "SM City Batangas",
            address: "Pallocan West, Batangas City",
            categories: ["Department Store", "Groceries", "Pharmacy"],
            operatingHours: "10:00 AM - 9:00 PM"
          },
          {
            name: "Robinsons Place Lipa",
            address: "JP Laurel Highway, Lipa City",
            categories: ["Department Store", "Groceries", "Electronics"],
            operatingHours: "10:00 AM - 9:00 PM"
          },
          {
            name: "Batangas Public Market",
            address: "P. Burgos St, Batangas City",
            categories: ["Fresh Produce", "Meat", "Seafood", "Local Products"],
            operatingHours: "4:00 AM - 6:00 PM"
          },
          {
            name: "Mercury Drug",
            address: "Multiple branches",
            categories: ["Pharmacy", "Healthcare", "Personal Care"],
            operatingHours: "7:00 AM - 10:00 PM"
          },
          {
            name: "7-Eleven",
            address: "Multiple branches",
            categories: ["Convenience Store", "Snacks", "Beverages"],
            operatingHours: "24 hours"
          }
        ],
        category: "services",
        dataType: "json",
        description: "Available stores for Pabili service",
      },
      {
        configKey: "pabayad_billers",
        configValue: [
          {
            name: "Meralco",
            category: "Electricity",
            processingFee: "25",
            accountNumberFormat: "10 digits"
          },
          {
            name: "PLDT",
            category: "Internet/Phone",
            processingFee: "20",
            accountNumberFormat: "Area code + Phone number"
          },
          {
            name: "Globe",
            category: "Mobile/Internet",
            processingFee: "20",
            accountNumberFormat: "11-digit mobile number"
          },
          {
            name: "Maynilad",
            category: "Water",
            processingFee: "25",
            accountNumberFormat: "Contract Account Number"
          },
          {
            name: "Converge",
            category: "Internet",
            processingFee: "20",
            accountNumberFormat: "Account number"
          },
          {
            name: "Smart",
            category: "Mobile",
            processingFee: "20",
            accountNumberFormat: "11-digit mobile number"
          },
          {
            name: "SSS",
            category: "Government",
            processingFee: "30",
            accountNumberFormat: "SS Number"
          },
          {
            name: "PhilHealth",
            category: "Government/Health",
            processingFee: "30",
            accountNumberFormat: "PhilHealth Number"
          },
          {
            name: "Pag-IBIG",
            category: "Government/Housing",
            processingFee: "30",
            accountNumberFormat: "MID Number"
          }
        ],
        category: "services",
        dataType: "json",
        description: "Available billers for Pabayad service",
      },
      {
        configKey: "service_fees",
        configValue: {
          pabili: {
            baseFee: "50",
            percentageFee: "10",
            maxItemValue: "5000",
            maxItems: "10"
          },
          pabayad: {
            baseFee: "25",
            maxBillAmount: "20000"
          },
          parcel: {
            baseFee: "60",
            weightLimit: "5kg",
            sizeLimit: "50cm x 50cm x 50cm",
            additionalPerKg: "15"
          }
        },
        category: "pricing",
        dataType: "json",
        description: "Service fee configuration",
      }
    ];
    
    await db.insert(platformConfig).values(platformConfigData);
    console.log(`✅ Created ${platformConfigData.length} platform configurations`);
    
    // =============================================
    // SEED SAMPLE ORDERS
    // =============================================
    console.log("📦 Creating sample orders...");
    
    const ordersData: any[] = [
      // Completed Food Order
      {
        customerId: userMap.get("maria.santos@gmail.com")!.id,
        restaurantId: restaurantMap.get("Lomi Haus")!.id,
        riderId: insertedRiders[0].id,
        orderNumber: `ORD${Date.now()}001`,
        items: [
          {
            menuItemId: insertedMenuItems.find(i => i.name === "Special Batangas Lomi")!.id,
            name: "Special Batangas Lomi",
            quantity: 2,
            price: "120",
            total: "240"
          },
          {
            menuItemId: insertedMenuItems.find(i => i.name === "Fresh Buko Juice")!.id,
            name: "Fresh Buko Juice",
            quantity: 2,
            price: "50",
            total: "100"
          }
        ],
        subtotal: "340",
        deliveryFee: "49",
        serviceFee: "17",
        totalAmount: "406",
        status: "delivered",
        paymentMethod: "cash",
        paymentStatus: "paid",
        deliveryAddress: {
          street: "123 Rizal Street",
          barangay: "Poblacion",
          city: "Batangas City",
          province: "Batangas",
          landmark: "Near BDO Bank"
        },
        customerNotes: "Please include extra calamansi",
        estimatedDeliveryTime: new Date(Date.now() + 30 * 60000),
        actualDeliveryTime: new Date(Date.now() + 28 * 60000),
        orderType: "food",
      },
      // Pending Food Order
      {
        customerId: userMap.get("pedro.reyes@yahoo.com")!.id,
        restaurantId: restaurantMap.get("Bulalo Express")!.id,
        orderNumber: `ORD${Date.now()}002`,
        items: [
          {
            menuItemId: insertedMenuItems.find(i => i.name === "Special Bulalo")!.id,
            name: "Special Bulalo",
            quantity: 1,
            price: "350",
            total: "350"
          }
        ],
        subtotal: "350",
        deliveryFee: "49",
        serviceFee: "18",
        totalAmount: "417",
        status: "pending",
        paymentMethod: "gcash",
        paymentStatus: "pending",
        deliveryAddress: {
          street: "456 Mabini Avenue",
          barangay: "Maraouy",
          city: "Lipa City",
          province: "Batangas",
          landmark: "Across from Robinson's Place"
        },
        estimatedDeliveryTime: new Date(Date.now() + 45 * 60000),
        orderType: "food",
      },
      // Pabili Order (Shopping)
      {
        customerId: userMap.get("ana.garcia@gmail.com")!.id,
        orderNumber: `PBL${Date.now()}001`,
        items: [
          {
            name: "Groceries from SM",
            description: "1kg chicken, 1kg pork, vegetables, fruits",
            quantity: 1,
            estimatedCost: "800",
            store: "SM City Batangas"
          }
        ],
        subtotal: "800",
        deliveryFee: "49",
        serviceFee: "130", // 50 base + 10% of 800
        totalAmount: "979",
        status: "confirmed",
        paymentMethod: "cash",
        paymentStatus: "pending",
        deliveryAddress: {
          street: "789 Laurel Street",
          barangay: "Santol",
          city: "Tanauan",
          province: "Batangas",
          landmark: "Near Tanauan Public Market"
        },
        orderType: "pabili",
        estimatedDeliveryTime: new Date(Date.now() + 90 * 60000),
      },
      // Pabayad Order (Bill Payment)
      {
        customerId: userMap.get("maria.santos@gmail.com")!.id,
        orderNumber: `PBD${Date.now()}001`,
        items: [
          {
            name: "Meralco Bill",
            accountNumber: "1234567890",
            billAmount: "2500",
            biller: "Meralco"
          }
        ],
        subtotal: "2500",
        deliveryFee: "0",
        serviceFee: "25",
        totalAmount: "2525",
        status: "completed",
        paymentMethod: "cash",
        paymentStatus: "paid",
        deliveryAddress: {
          street: "123 Rizal Street",
          barangay: "Poblacion", 
          city: "Batangas City",
          province: "Batangas"
        },
        orderType: "pabayad",
        estimatedDeliveryTime: new Date(Date.now() + 60 * 60000),
        actualDeliveryTime: new Date(Date.now() + 55 * 60000),
      },
      // Parcel Delivery Order
      {
        customerId: userMap.get("pedro.reyes@yahoo.com")!.id,
        orderNumber: `PCL${Date.now()}001`,
        items: [
          {
            name: "Documents",
            description: "Important documents to be delivered",
            pickupAddress: "Lipa City Hall",
            dropoffAddress: "BDO Batangas Branch",
            weight: "0.5kg",
            size: "30cm x 20cm x 5cm"
          }
        ],
        subtotal: "60",
        deliveryFee: "49",
        serviceFee: "0",
        totalAmount: "109",
        status: "in_transit",
        paymentMethod: "gcash",
        paymentStatus: "paid",
        deliveryAddress: {
          street: "BDO Building, P. Burgos St",
          barangay: "Poblacion",
          city: "Batangas City",
          province: "Batangas"
        },
        orderType: "parcel",
        riderId: insertedRiders[1].id,
        estimatedDeliveryTime: new Date(Date.now() + 120 * 60000),
      },
    ];
    
    const insertedOrders = await db.insert(orders).values(ordersData).returning();
    console.log(`✅ Created ${insertedOrders.length} sample orders`);
    
    // =============================================
    // SEED ORDER STATUS HISTORY
    // =============================================
    console.log("📝 Creating order status history...");
    
    const statusHistoryData: any[] = [];
    
    // Add status history for completed orders
    const completedOrder = insertedOrders.find(o => o.status === "delivered");
    if (completedOrder) {
      statusHistoryData.push(
        {
          orderId: completedOrder.id,
          status: "pending",
          changedBy: completedOrder.customerId,
          timestamp: new Date(Date.now() - 60 * 60000),
        },
        {
          orderId: completedOrder.id,
          status: "confirmed",
          changedBy: completedOrder.restaurantId!,
          timestamp: new Date(Date.now() - 50 * 60000),
          notes: "Order confirmed by restaurant"
        },
        {
          orderId: completedOrder.id,
          status: "preparing",
          changedBy: completedOrder.restaurantId!,
          timestamp: new Date(Date.now() - 40 * 60000),
        },
        {
          orderId: completedOrder.id,
          status: "ready",
          changedBy: completedOrder.restaurantId!,
          timestamp: new Date(Date.now() - 30 * 60000),
        },
        {
          orderId: completedOrder.id,
          status: "picked_up",
          changedBy: completedOrder.riderId!,
          timestamp: new Date(Date.now() - 20 * 60000),
          notes: "Picked up by rider"
        },
        {
          orderId: completedOrder.id,
          status: "delivered",
          changedBy: completedOrder.riderId!,
          timestamp: new Date(Date.now() - 5 * 60000),
          notes: "Delivered successfully"
        }
      );
    }
    
    if (statusHistoryData.length > 0) {
      await db.insert(orderStatusHistory).values(statusHistoryData);
      console.log(`✅ Created ${statusHistoryData.length} order status history records`);
    }
    
    // =============================================
    // SUMMARY
    // =============================================
    console.log("\n✨ Database seeding completed successfully!");
    console.log("📊 Summary:");
    console.log(`   - Users: ${insertedUsers.length}`);
    console.log(`   - Restaurants: ${insertedRestaurants.length}`);
    console.log(`   - Menu Categories: ${insertedCategories.length}`);
    console.log(`   - Menu Items: ${insertedMenuItems.length}`);
    console.log(`   - Riders: ${insertedRiders.length}`);
    console.log(`   - Service Zones: ${zonesData.length}`);
    console.log(`   - Orders: ${insertedOrders.length}`);
    console.log(`   - Platform Configs: ${platformConfigData.length}`);
    
    console.log("\n🔑 Test Credentials:");
    console.log("   Password for all users: Test@1234");
    console.log("   Admin: admin@btsdelivery.ph");
    console.log("   Customer: maria.santos@gmail.com");
    console.log("   Vendor: jose@lomihaus.ph");
    console.log("   Rider: miguel@rider.bts");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seed().catch((error) => {
  console.error("Failed to seed database:", error);
  process.exit(1);
});