const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function formatBanglaDigits(value) {
    return String(value ?? "").replace(/\d/g, (digit) => bengaliDigits[Number(digit)]);
}

export function formatBanglaNumber(value) {
    const number = Number(value);
    const formatted = new Intl.NumberFormat("en-US").format(Number.isFinite(number) ? number : 0);
    return formatBanglaDigits(formatted);
}
