// نرمال‌سازی متن فارسی - چون کیبورد عربی حروف «ك»/«ي» رو متفاوت از فارسی «ک»/«ی» می‌فرسته
// و باعث میشه match دقیق رشته («جدول امتیازات») گاهی جواب نده
export function normalizePersianText(text: string): string {
  return text
    .trim()
    .replace(/\u200c/g, " ") // نیم‌فاصله رو به فاصله‌ی عادی تبدیل کن
    .replace(/ك/g, "ک")
    .replace(/ي/g, "ی")
    .replace(/\s+/g, " ");
}
