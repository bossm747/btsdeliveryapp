/**
 * Script to generate AI images for all menu items
 *
 * Usage:
 *   npx tsx scripts/generate-menu-images.ts          # Only items without images
 *   npx tsx scripts/generate-menu-images.ts --force  # Regenerate ALL images
 *   npx tsx scripts/generate-menu-images.ts --limit 5 # Process only first 5 items
 *
 * This script:
 * 1. Fetches all menu items with their full details (category, restaurant, tags, etc.)
 * 2. Generates detailed prompts using all available menu item metadata
 * 3. Uses AI (Replicate z-image-turbo / Gemini / Unsplash fallback) to generate images
 * 4. Saves images locally and updates the database
 */

// Parse command line arguments
const args = process.argv.slice(2);
const forceRegenerate = args.includes('--force');
const limitArg = args.find(arg => arg.startsWith('--limit'));
const itemLimit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1]) : undefined;

import { db } from "../server/db";
import { menuItems, menuCategories, restaurants } from "@shared/schema";
import { generateMenuItemImage } from "../server/ai-services";
import { eq } from "drizzle-orm";

// ============================================================================
// PROMPT GENERATION - Uses all available metadata for rich prompts
// ============================================================================

interface MenuItemWithDetails {
  id: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  price: string;
  imageUrl: string | null;
  tags: any;
  allergens: any;
  nutritionalInfo: any;
  totalOrders: number | null;
  rating: string | null;
  preparationTime: number | null;
  categoryName: string | null;
  categoryDescription: string | null;
  restaurantName: string | null;
  restaurantCategory: string | null;
}

/**
 * Generate a detailed, optimized prompt for menu item image generation
 * Uses all available metadata to create a rich, descriptive prompt
 */
function generateDetailedPrompt(item: MenuItemWithDetails): string {
  const parts: string[] = [];

  // Add description context
  if (item.description) {
    parts.push(item.description);
  } else if (item.shortDescription) {
    parts.push(item.shortDescription);
  }

  // Add cuisine style from restaurant category
  if (item.restaurantCategory) {
    const cuisineHints: Record<string, string> = {
      'Filipino': 'Traditional Filipino cuisine, warm homestyle presentation',
      'Fast Food': 'Quick-service style, vibrant colors, casual presentation',
      'Chinese': 'Chinese cuisine, elegant presentation with chopstick-friendly portions',
      'Japanese': 'Japanese style, minimalist elegant presentation, attention to detail',
      'Korean': 'Korean cuisine, communal dining style, colorful banchan',
      'Italian': 'Italian style, rustic Mediterranean presentation',
      'Seafood': 'Fresh seafood presentation, coastal restaurant style',
      'Cafe': 'Cafe-style plating, Instagram-worthy presentation',
      'Desserts': 'Sweet dessert presentation, artistic plating',
      'Pizza': 'Pizzeria style, melted cheese, fresh toppings visible',
      'Chicken': 'Crispy fried chicken presentation, golden brown',
      'Bakery': 'Fresh-baked goods, artisan presentation',
      'Beverages': 'Refreshing drink presentation, condensation visible',
      'Street Food': 'Street food style, authentic and appetizing',
    };
    const hint = cuisineHints[item.restaurantCategory] || `${item.restaurantCategory} cuisine style`;
    parts.push(hint);
  }

  // Add tags context (spicy, vegetarian, bestseller, etc.)
  if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
    const tagDescriptions: Record<string, string> = {
      'spicy': 'with visible red chili garnish indicating spiciness',
      'very_spicy': 'with prominent red chilies, fiery presentation',
      'mild': 'mild seasoning, family-friendly presentation',
      'vegetarian': 'fresh colorful vegetables, plant-based ingredients',
      'vegan': 'entirely plant-based, vibrant vegetables and greens',
      'bestseller': 'signature dish, premium restaurant-quality presentation',
      'popular': 'customer favorite, generous portion size',
      'new': 'fresh innovative presentation, modern plating',
      'healthy': 'fresh, light, nutritious appearance with greens',
      'comfort': 'hearty, homestyle comfort food presentation',
      'gluten-free': 'clean plating, naturally gluten-free ingredients',
      'seafood': 'fresh seafood, ocean-inspired garnish',
      'grilled': 'visible grill marks, smoky char appearance',
      'fried': 'crispy golden-brown texture, appetizing crunch',
      'steamed': 'light, healthy steamed presentation',
      'baked': 'golden baked surface, fresh from oven look',
      'sweet': 'appealing sweet presentation, dessert styling',
      'savory': 'rich savory appearance with herbs and seasoning',
      'premium': 'luxury ingredients, fine-dining presentation',
      'value': 'generous portion, satisfying serving size',
      'kids': 'fun, colorful kid-friendly presentation',
      'breakfast': 'morning meal styling, fresh and energizing',
      'lunch': 'satisfying lunch portion, balanced meal',
      'dinner': 'elegant dinner presentation, sophisticated plating',
      'snack': 'bite-sized, perfect for sharing',
    };

    const tagHints = item.tags
      .map((tag: string) => tagDescriptions[tag.toLowerCase()])
      .filter(Boolean);

    if (tagHints.length > 0) {
      parts.push(tagHints.join(', '));
    }
  }

  // Add allergen context for visual hints
  if (item.allergens && Array.isArray(item.allergens) && item.allergens.length > 0) {
    const allergenHints: Record<string, string> = {
      'nuts': 'visible nut garnish or topping',
      'peanuts': 'peanut garnish visible',
      'dairy': 'creamy cheese or dairy elements',
      'eggs': 'egg component visible',
      'shellfish': 'fresh shellfish presentation',
      'fish': 'fresh fish, properly cooked appearance',
      'soy': 'Asian-style soy-based sauce visible',
      'wheat': 'bread or wheat-based elements',
      'sesame': 'sesame seed garnish',
    };

    const hints = item.allergens
      .slice(0, 2) // Limit to 2 allergen hints
      .map((a: string) => allergenHints[a.toLowerCase()])
      .filter(Boolean);

    if (hints.length > 0) {
      parts.push(hints.join(', '));
    }
  }

  // Add popularity/quality context
  if (item.totalOrders && item.totalOrders > 100) {
    parts.push('Extremely popular signature dish, perfect presentation');
  } else if (item.totalOrders && item.totalOrders > 50) {
    parts.push('Customer favorite, appetizing premium presentation');
  }

  // Add rating context for highly-rated items
  if (item.rating) {
    const rating = parseFloat(item.rating);
    if (rating >= 4.8) {
      parts.push('Award-winning quality, exceptional presentation');
    } else if (rating >= 4.5) {
      parts.push('Highly-rated dish, professional quality');
    }
  }

  // Add price context for premium items
  const price = parseFloat(item.price);
  if (price > 500) {
    parts.push('Premium luxury presentation, fine-dining quality');
  } else if (price > 300) {
    parts.push('High-quality restaurant presentation');
  }

  // Build the final prompt with the item name
  const descriptionPart = parts.length > 0 ? parts.join('. ') + '.' : '';

  return descriptionPart;
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function generateAllMenuImages() {
  console.log("========================================");
  console.log("  BTS Delivery - Menu Image Generator  ");
  console.log("========================================\n");

  try {
    // Fetch all menu items with full details using joins
    console.log("Fetching menu items with full details...\n");

    const allMenuItems = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        shortDescription: menuItems.shortDescription,
        price: menuItems.price,
        imageUrl: menuItems.imageUrl,
        tags: menuItems.tags,
        allergens: menuItems.allergens,
        nutritionalInfo: menuItems.nutritionalInfo,
        totalOrders: menuItems.totalOrders,
        rating: menuItems.rating,
        preparationTime: menuItems.preparationTime,
        categoryId: menuItems.categoryId,
        restaurantId: menuItems.restaurantId,
        categoryName: menuCategories.name,
        categoryDescription: menuCategories.description,
        restaurantName: restaurants.name,
        restaurantCategory: restaurants.category,
      })
      .from(menuItems)
      .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .leftJoin(restaurants, eq(menuItems.restaurantId, restaurants.id));

    console.log(`Found ${allMenuItems.length} total menu items`);
    console.log(`Options: force=${forceRegenerate}, limit=${itemLimit || 'none'}\n`);

    // Filter items that need images
    let itemsNeedingImages = allMenuItems;

    if (!forceRegenerate) {
      itemsNeedingImages = allMenuItems.filter(item => {
        // Needs image if:
        if (!item.imageUrl) return true; // No image at all
        if (item.imageUrl.includes('placehold')) return true; // Placeholder
        // Has external URL but not our local storage
        if (item.imageUrl.startsWith('http') && !item.imageUrl.startsWith('/uploads')) {
          // Keep Unsplash images (they're good quality)
          if (item.imageUrl.includes('unsplash')) return false;
          return true;
        }
        return false;
      });
    }

    // Apply limit if specified
    if (itemLimit && itemLimit > 0) {
      itemsNeedingImages = itemsNeedingImages.slice(0, itemLimit);
    }

    console.log(`Items to process: ${itemsNeedingImages.length}`);
    console.log(`Items skipped: ${allMenuItems.length - itemsNeedingImages.length}\n`);

    if (itemsNeedingImages.length === 0) {
      console.log("All menu items already have images!\n");
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;

    // Process each item
    for (let i = 0; i < itemsNeedingImages.length; i++) {
      const item = itemsNeedingImages[i];

      console.log(`\n[${i + 1}/${itemsNeedingImages.length}] ${item.name}`);
      console.log(`   Restaurant: ${item.restaurantName || 'Unknown'} (${item.restaurantCategory || 'General'})`);
      console.log(`   Category: ${item.categoryName || 'Uncategorized'}`);
      console.log(`   Price: P${item.price}`);
      if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
        console.log(`   Tags: ${item.tags.join(', ')}`);
      }
      if (item.totalOrders) {
        console.log(`   Orders: ${item.totalOrders} | Rating: ${item.rating || 'N/A'}`);
      }
      console.log(`   Current image: ${item.imageUrl || 'None'}`);

      try {
        // Generate detailed prompt using all available metadata
        const detailedDescription = generateDetailedPrompt(item as MenuItemWithDetails);

        console.log(`   Generated prompt: ${detailedDescription.substring(0, 80)}...`);

        // Generate the image using the existing AI service
        const imageUrl = await generateMenuItemImage(
          item.name,
          detailedDescription || `${item.categoryName || 'Delicious'} dish from ${item.restaurantName || 'restaurant'}`,
          item.id
        );

        // Update the menu item record
        await db.update(menuItems)
          .set({
            imageUrl: imageUrl,
            updatedAt: new Date()
          })
          .where(eq(menuItems.id, item.id));

        console.log(`   SUCCESS: ${imageUrl}`);
        successCount++;

        // Delay between generations to avoid rate limiting
        if (i < itemsNeedingImages.length - 1) {
          console.log(`   Waiting 2s before next...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error: any) {
        console.error(`   FAILED: ${error.message}`);
        failCount++;
      }
    }

    console.log(`\n========================================`);
    console.log(`  Generation Complete!`);
    console.log(`  SUCCESS: ${successCount}`);
    console.log(`  FAILED: ${failCount}`);
    console.log(`  TOTAL: ${itemsNeedingImages.length}`);
    console.log(`========================================\n`);

  } catch (error: any) {
    console.error("Fatal error:", error);
  }

  process.exit(0);
}

// Run the script
generateAllMenuImages();
