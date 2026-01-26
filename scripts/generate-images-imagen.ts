/**
 * Batch AI Image Generator using Imagen 4.0
 */

import { db } from '../server/db';
import { menuItems, restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import { LocalObjectStorageService } from '../server/services/local-object-storage';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const DELAY_BETWEEN_IMAGES = 5000; // 5 seconds

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateImageWithImagen(itemName: string, description: string): Promise<string> {
  const prompt = `Professional food photography of ${itemName}. ${description}. Appetizing presentation, restaurant quality, natural lighting, Filipino cuisine.`;

  try {
    // Try Imagen 4.0
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/jpeg',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const imageData = response.generatedImages[0];
      if (imageData.image?.imageBytes) {
        const buffer = Buffer.from(imageData.image.imageBytes, 'base64');
        const filename = `${itemName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.jpg`;
        
        const result = await LocalObjectStorageService.saveFile(
          buffer,
          filename,
          'ai-generated'
        );

        if (result.success && result.url) {
          return result.url;
        }
      }
    }
  } catch (error: any) {
    console.error(`   [Imagen] Error: ${error.message}`);
  }

  return `https://placehold.co/400x400/ff6b35/ffffff?text=${encodeURIComponent(itemName)}`;
}

async function main() {
  console.log('🖼️  Starting AI Image Generation with Imagen 4.0...\n');

  const allRestaurants = await db.select().from(restaurants);
  console.log(`Found ${allRestaurants.length} restaurants\n`);

  let generated = 0, failed = 0, skipped = 0;

  for (const restaurant of allRestaurants) {
    console.log(`\n📍 ${restaurant.name}`);
    console.log('─'.repeat(40));

    const items = await db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurant.id));

    for (const item of items) {
      if (item.imageUrl?.startsWith('/uploads/') && !item.imageUrl.includes('placehold')) {
        console.log(`   ⏭️  "${item.name}" - has image`);
        skipped++;
        continue;
      }

      console.log(`   🎨 Generating "${item.name}"...`);

      try {
        const imageUrl = await generateImageWithImagen(item.name, item.description || item.name);

        if (imageUrl && !imageUrl.includes('placehold')) {
          await db.update(menuItems).set({ imageUrl, updatedAt: new Date() }).where(eq(menuItems.id, item.id));
          console.log(`   ✅ ${imageUrl}`);
          generated++;
        } else {
          console.log(`   ⚠️  Placeholder`);
          failed++;
        }

        await sleep(DELAY_BETWEEN_IMAGES);
      } catch (error: any) {
        console.error(`   ❌ ${error.message}`);
        failed++;
      }
    }
  }

  console.log('\n' + '═'.repeat(40));
  console.log(`✅ Generated: ${generated}`);
  console.log(`⏭️  Skipped:   ${skipped}`);
  console.log(`❌ Failed:    ${failed}`);
  process.exit(0);
}

main();
