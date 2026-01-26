/**
 * Batch AI Image Generator using Pollinations.ai (FREE)
 */

import { db } from '../server/db';
import { menuItems, restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { LocalObjectStorageService } from '../server/services/local-object-storage';
import https from 'https';
import http from 'http';

const DELAY_BETWEEN_IMAGES = 2000;
const DOWNLOAD_TIMEOUT = 45000; // 45 seconds timeout

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(url: string, timeout = DOWNLOAD_TIMEOUT): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Download timeout'));
    }, timeout);

    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { timeout: timeout }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        clearTimeout(timer);
        return downloadImage(response.headers.location!, timeout).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        clearTimeout(timer);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
      response.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      clearTimeout(timer);
      reject(new Error('Request timeout'));
    });
  });
}

async function generateWithPollinations(itemName: string, description: string): Promise<string> {
  const prompt = `Professional food photography of ${itemName}. ${description}. Appetizing, restaurant quality plating, natural lighting, Filipino cuisine, delicious, 4k`;
  
  const encodedPrompt = encodeURIComponent(prompt);
  // Use a seed based on item name for consistency
  const seed = itemName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${seed}`;
  
  try {
    const imageBuffer = await downloadImage(imageUrl);
    
    if (imageBuffer.length > 5000) {
      const filename = `${itemName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.jpg`;
      
      const result = await LocalObjectStorageService.saveFile(
        imageBuffer,
        filename,
        'ai-generated'
      );

      if (result.success && result.url) {
        return result.url;
      }
    }
  } catch (error: any) {
    console.error(`   ⚠️  ${error.message}`);
  }

  return '';
}

async function main() {
  console.log('🖼️  AI Image Generation with Pollinations.ai\n');

  const allRestaurants = await db.select().from(restaurants);
  console.log(`Found ${allRestaurants.length} restaurants\n`);

  let generated = 0, failed = 0, skipped = 0;

  for (const restaurant of allRestaurants) {
    console.log(`\n📍 ${restaurant.name}`);

    const items = await db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurant.id));

    for (const item of items) {
      // Skip if already has a local image
      if (item.imageUrl?.startsWith('/uploads/') && !item.imageUrl.includes('placehold')) {
        console.log(`   ⏭️  ${item.name} - has image`);
        skipped++;
        continue;
      }

      process.stdout.write(`   🎨 ${item.name}... `);

      try {
        const imageUrl = await generateWithPollinations(item.name, item.description || item.name);

        if (imageUrl) {
          await db.update(menuItems).set({ imageUrl, updatedAt: new Date() }).where(eq(menuItems.id, item.id));
          console.log(`✅`);
          generated++;
        } else {
          console.log(`❌ no image`);
          failed++;
        }

        await sleep(DELAY_BETWEEN_IMAGES);
      } catch (error: any) {
        console.log(`❌ ${error.message}`);
        failed++;
      }
    }
  }

  console.log('\n════════════════════════════════════════');
  console.log(`✅ Generated: ${generated}`);
  console.log(`⏭️  Skipped:   ${skipped}`);
  console.log(`❌ Failed:    ${failed}`);
  process.exit(0);
}

main();
