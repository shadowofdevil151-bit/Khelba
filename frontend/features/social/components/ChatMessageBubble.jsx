export default function ChatMessageBubble({ message, own }) {
    return <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[14.5px] leading-snug md:max-w-[85%] md:px-4 md:py-3 md:text-sm md:leading-6 ${own ? "rounded-br-sm border border-sky-400/20 bg-[#334e7b] text-white md:rounded-br-md md:border-0 md:bg-brass-400/20 md:text-paper" : "rounded-bl-sm border border-white/[0.06] bg-[#262830] text-white md:rounded-bl-md md:border-0 md:bg-white/[.06] md:text-paper/80"}`}>
            <div className="whitespace-pre-wrap break-words">{message.text}</div>
            <time className={`bangla-digits mt-1 block text-[10px] md:text-right md:text-paper/35 ${own ? "text-right text-sky-200/60" : "text-paper/40"}`}>
                {message.createdAt ? new Date(message.createdAt).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" }) : ""}
            </time>
        </div>
    </div>;
}