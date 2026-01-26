/**
 * Batch AI Image Generator for All Menu Items
 * Generates realistic food images using Gemini AI
 */

import { db } from '../server/db';
import { menuItems, restaurants } from '../shared/schema';
import { eq, isNull, or, sql } from 'drizzle-orm';
import { generateMenuItemImage } from '../server/ai-services';

const DELAY_BETWEEN_IMAGES = 3000; // 3 seconds to avoid rate limiting

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateAllMenuImages() {
  console.log('🖼️  Starting AI Image Generation for All Menu Items...\n');

  // Get all restaurants
  const allRestaurants = await db.select().from(restaurants);
  console.log(`Found ${allRestaurants.length} restaurants\n`);

  let totalGenerated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const restaurant of allRestaurants) {
    console.log(`\n📍 Restaurant: ${restaurant.name}`);
    console.log('─'.repeat(50));

    // Get menu items for this restaurant (all items, not just those without images)
    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurant.id));

    console.log(`   Found ${items.length} menu items`);

    for (const item of items) {
      // Skip if already has a valid local image (not placeholder)
      if (item.imageUrl && 
          item.imageUrl.startsWith('/uploads/') && 
          !item.imageUrl.includes('placehold')) {
        console.log(`   ⏭️  Skipping "${item.name}" - already has image`);
        totalSkipped++;
        continue;
      }

      try {
        console.log(`   🎨 Generating image for "${item.name}"...`);
        
        // Create a detailed prompt for realistic food photography
        const category = item.category || 'food';
        const description = item.description || item.name;
        
        const prompt = `${description}. Professional food photography, appetizing presentation, restaurant quality plating, natural lighting, shallow depth of field, Filipino cuisine style`;

        const imageUrl = await generateMenuItemImage(item.name, prompt);

        if (imageUrl && !imageUrl.includes('placehold')) {
          // Update the menu item with the new image
          await db
            .update(menuItems)
            .set({ imageUrl, updatedAt: new Date() })
            .where(eq(menuItems.id, item.id));

          console.log(`   ✅ Generated: ${imageUrl}`);
          totalGenerated++;
        } else {
          console.log(`   ⚠️  Got placeholder for "${item.name}"`);
          totalFailed++;
        }

        // Delay to avoid rate limiting
        await sleep(DELAY_BETWEEN_IMAGES);

      } catch (error: any) {
        console.error(`   ❌ Failed for "${item.name}": ${error.message}`);
        totalFailed++;
        // Continue with next item
        await sleep(1000);
      }
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(50));
  console.log(`✅ Generated: ${totalGenerated}`);
  console.log(`⏭️  Skipped:   ${totalSkipped}`);
  console.log(`❌ Failed:    ${totalFailed}`);
  console.log('═'.repeat(50));

  process.exit(0);
}

// Run the script
generateAllMenuImages().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
