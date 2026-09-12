import { CRAFT_RECIPES, type PotionKey } from "../../config/constants";

function sortedKey(items: string[]): string {
  return [...items].sort().join(",");
}

const RECIPE_LOOKUP: Map<string, PotionKey> = new Map(
  (Object.entries(CRAFT_RECIPES) as [PotionKey, [string, string, string]][]).map(([potionKey, recipe]) => [
    sortedKey(recipe),
    potionKey,
  ])
);

// اگه ترکیب سه ماده با یکی از فرمول‌ها بخونه، کلید پوشن رو برمیگردونه؛ وگرنه null
export function matchRecipe(resources: [string, string, string]): PotionKey | null {
  return RECIPE_LOOKUP.get(sortedKey(resources)) ?? null;
}
