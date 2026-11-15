import { formatBanglaNumber } from "@/lib/formatBanglaNumber";

export function formatTimeAgo(date) {
    const timestamp = new Date(date).getTime();
    if (!Number.isFinite(timestamp)) return "";
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return "এখনই";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${formatBanglaNumber(minutes)} মিনিট আগে`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${formatBanglaNumber(hours)} ঘণ্টা আগে`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${formatBanglaNumber(days)} দিন আগে`;
    const value = new Date(timestamp);
    return `${formatBanglaNumber(value.getDate())}/${formatBanglaNumber(value.getMonth() + 1)}`;
}
