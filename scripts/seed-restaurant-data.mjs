import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../shared/schema.ts';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seedRestaurantData() {
  try {
    console.log('Seeding restaurant data...');

    // Create test owner user first
    const [testOwner] = await db.insert(schema.users).values({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'owner@btsdelivery.com',
      firstName: 'Restaurant',
      lastName: 'Owner',
      role: 'vendor'
    }).onConflictDoNothing().returning();

    console.log('✅ Test owner user created/exists');

    // Check if restaurant already exists
    const existingRestaurants = await db.select().from(schema.restaurants);
    
    if (existingRestaurants.length === 0) {
      // Insert a test restaurant with proper structure
      const [restaurant] = await db.insert(schema.restaurants).values({
        ownerId: '11111111-1111-1111-1111-111111111111', // Mock owner ID
        name: 'BTS Test Restaurant',
        description: 'A test restaurant for BTS Delivery platform',
        category: 'Filipino',
        address: {
          street: '123 Test Street',
          barangay: 'Test Barangay',
          city: 'Batangas City',
          province: 'Batangas',
          zipCode: '4200'
        },
        phone: '+63 912 345 6789',
        operatingHours: {
          monday: { open: '08:00', close: '22:00' },
          tuesday: { open: '08:00', close: '22:00' },
          wednesday: { open: '08:00', close: '22:00' },
          thursday: { open: '08:00', close: '22:00' },
          friday: { open: '08:00', close: '22:00' },
          saturday: { open: '08:00', close: '22:00' },
          sunday: { open: '08:00', close: '22:00' }
        },
        deliveryFee: '25.00',
        minimumOrder: '150.00',
        estimatedDeliveryTime: 30,
        isActive: true,
        rating: '4.8',
        totalOrders: 150
      }).returning();
      console.log('✅ Test restaurant created with ID:', restaurant.id);
      
      global.testRestaurantId = restaurant.id;
      
      // Write restaurant ID to file for vendor dashboard
      await import('fs').then(fs => {
        fs.writeFileSync('./test-restaurant-id.txt', restaurant.id);
      });
    } else {
      global.testRestaurantId = existingRestaurants[0].id;
    }

    // Check if categories exist
    const existingCategories = await db.select().from(schema.menuCategories);
    
    if (existingCategories.length === 0) {
      // Insert test categories
      const categories = await db.insert(schema.menuCategories).values([
        {
          restaurantId: global.testRestaurantId,
          name: 'Main Dishes',
          displayOrder: 1
        },
        {
          restaurantId: global.testRestaurantId,
          name: 'Appetizers',
          displayOrder: 2
        },
        {
          restaurantId: global.testRestaurantId,
          name: 'Beverages',
          displayOrder: 3
        }
      ]).returning();
      console.log('✅ Test categories created');
      
      global.categoryIds = categories.map(c => c.id);
    } else {
      global.categoryIds = existingCategories.map(c => c.id);
    }

    // Check if menu items exist
    const existingMenuItems = await db.select().from(schema.menuItems);
    
    if (existingMenuItems.length === 0) {
      // Insert test menu items
      await db.insert(schema.menuItems).values([
        {
          restaurantId: global.testRestaurantId,
          categoryId: global.categoryIds[0], // Main Dishes
          name: 'Adobo Rice Bowl',
          description: 'Classic Filipino adobo served with steamed rice',
          price: '120.00',
          isAvailable: true,
          preparationTime: 20
        },
        {
          restaurantId: global.testRestaurantId,
          categoryId: global.categoryIds[0], // Main Dishes
          name: 'Lechon Kawali',
          description: 'Crispy pork belly served with rice and vegetables',
          price: '180.00',
          isAvailable: true,
          preparationTime: 25
        },
        {
          restaurantId: global.testRestaurantId,
          categoryId: global.categoryIds[1], // Appetizers
          name: 'Lumpia Shanghai',
          description: 'Filipino spring rolls (8 pieces)',
          price: '80.00',
          isAvailable: true,
          preparationTime: 15
        },
        {
          restaurantId: global.testRestaurantId,
          categoryId: global.categoryIds[2], // Beverages
          name: 'Iced Tea',
          description: 'Refreshing iced tea',
          price: '35.00',
          isAvailable: true,
          preparationTime: 5
        }
      ]);
      console.log('✅ Test menu items created');
    }

    // Check if orders exist
    const existingOrders = await db.select().from(schema.orders);
    
    // Create test user first
    const [testUser] = await db.insert(schema.users).values({
      id: '22222222-2222-2222-2222-222222222222',
      email: 'testuser@btsdelivery.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer'
    }).onConflictDoNothing().returning();

    if (existingOrders.length === 0) {
      // Insert test orders
      await db.insert(schema.orders).values([
        {
          customerId: testUser?.id || '22222222-2222-2222-2222-222222222222',
          restaurantId: global.testRestaurantId,
          orderNumber: 'BTS-001',
          status: 'pending',
          subtotal: '210.00',
          totalAmount: '235.00',
          deliveryFee: '25.00',
          paymentMethod: 'cash',
          deliveryAddress: {
            street: 'Sample Street',
            barangay: 'Sample Barangay',
            city: 'Batangas City',
            province: 'Batangas',
            zipCode: '4200'
          },
          items: [
            { id: 'item1', name: 'Adobo Rice Bowl', price: '120.00', quantity: 1 },
            { id: 'item2', name: 'Lechon Kawali', price: '180.00', quantity: 1 },
            { id: 'item3', name: 'Iced Tea', price: '35.00', quantity: 1 }
          ]
        },
        {
          customerId: testUser?.id || '22222222-2222-2222-2222-222222222222',
          restaurantId: global.testRestaurantId,
          orderNumber: 'BTS-002',
          status: 'preparing',
          subtotal: '130.00',
          totalAmount: '155.00',
          deliveryFee: '25.00',
          paymentMethod: 'gcash',
          deliveryAddress: {
            street: 'Another Street',
            barangay: 'Another Barangay',
            city: 'Batangas City',
            province: 'Batangas',
            zipCode: '4200'
          },
          items: [
            { id: 'item1', name: 'Adobo Rice Bowl', price: '120.00', quantity: 1 },
            { id: 'item3', name: 'Iced Tea', price: '35.00', quantity: 1 }
          ]
        }
      ]);
      console.log('✅ Test orders created');
    }

    console.log('🎉 Restaurant data seeding completed successfully!');
    console.log('📊 Database now contains:');
    console.log(`   - Restaurants: ${(await db.select().from(schema.restaurants)).length}`);
    console.log(`   - Categories: ${(await db.select().from(schema.menuCategories)).length}`);
    console.log(`   - Menu Items: ${(await db.select().from(schema.menuItems)).length}`);
    console.log(`   - Orders: ${(await db.select().from(schema.orders)).length}`);

  } catch (error) {
    console.error('❌ Error seeding restaurant data:', error);
  } finally {
    await pool.end();
  }
}

seedRestaurantData();