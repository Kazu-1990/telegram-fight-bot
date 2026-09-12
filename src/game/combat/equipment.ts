import { ARMOR_ITEMS, WEAPON_ITEMS } from "../../config/constants";

// این فایل قبلاً خالی بود چون آرمور/سلاح تعریف نشده بودن؛ الان به کاتالوگ واقعی وصله.
// موتور نبرد (engine.ts) به این دو تابع نیازی به تغییر نداره - فقط همینجا مقدار واقعی برمیگرده.

// درصد کاهش دمیجی که به شخص وارد میشه (0 تا 1) بر اساس زره‌اش
export function getArmorDamageReduction(armorKey: string | null): number {
  if (!armorKey) return 0;
  return ARMOR_ITEMS.find((a) => a.key === armorKey)?.value ?? 0;
}

// دمیج اضافه‌ای که سلاح به حمله‌های شخص اضافه میکنه
export function getWeaponDamageBonus(weaponKey: string | null): number {
  if (!weaponKey) return 0;
  return WEAPON_ITEMS.find((w) => w.key === weaponKey)?.value ?? 0;
}
