/**
 * Script to generate AI cover images for all restaurants
 * Run with: npx tsx scripts/generate-restaurant-covers.ts
 */

import { db } from "../server/db";
import { restaurants } from "@shared/schema";
import { generateRestaurantCoverImage } from "../server/ai-services";
import { eq } from "drizzle-orm";

async function generateAllCovers() {
  console.log("🎨 Starting restaurant cover image generation...\n");

  try {
    // Get all restaurants
    const allRestaurants = await db.select().from(restaurants);
    console.log(`Found ${allRestaurants.length} restaurants to process\n`);

    let successCount = 0;
    let failCount = 0;

    for (const restaurant of allRestaurants) {
      try {
        console.log(`\n📸 Generating cover for: ${restaurant.name}`);
        console.log(`   Category: ${restaurant.category || 'General'}`);
        console.log(`   Current image: ${restaurant.imageUrl || 'None'}`);

        // Generate the cover image
        const imageUrl = await generateRestaurantCoverImage(
          restaurant.name,
          restaurant.category || 'Filipino',
          restaurant.description || undefined,
          restaurant.id
        );

        // Update the restaurant record
        await db.update(restaurants)
          .set({
            imageUrl: imageUrl,
            updatedAt: new Date()
          })
          .where(eq(restaurants.id, restaurant.id));

        console.log(`   ✅ Generated: ${imageUrl}`);
        successCount++;

        // Delay between generations to avoid rate limiting
        console.log(`   ⏳ Waiting 3 seconds before next generation...`);
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`);
        failCount++;
      }
    }

    console.log(`\n\n========================================`);
    console.log(`🎉 Generation Complete!`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`========================================\n`);

  } catch (error: any) {
    console.error("Fatal error:", error);
  }

  process.exit(0);
}

generateAllCovers();
