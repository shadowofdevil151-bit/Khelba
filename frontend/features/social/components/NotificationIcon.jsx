import { Bell, MessageCircle, Swords, UserPlus } from "lucide-react";

export default function NotificationIcon({ type, unseen = false }) {
    const Icon = type?.includes("battle")
        ? Swords
        : type === "friend_chat"
            ? MessageCircle
            : type?.includes("friend_request")
                ? UserPlus
                : Bell;
    return <span className="relative"><Icon size={18}/>{unseen && <span aria-label="অপঠিত বিজ্ঞপ্তি" className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-rose-400"/>}</span>;
}
