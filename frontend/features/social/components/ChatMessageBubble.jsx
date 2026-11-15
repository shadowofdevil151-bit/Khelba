export default function ChatMessageBubble({ message, own }) {
    return <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${own ? "rounded-br-md bg-brass-400/20 text-paper" : "rounded-bl-md bg-white/[.06] text-paper/80"}`}>
            <div className="whitespace-pre-wrap break-words">{message.text}</div>
            <time className="bangla-digits mt-1 block text-right text-[10px] text-paper/35">
                {message.createdAt ? new Date(message.createdAt).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" }) : ""}
            </time>
        </div>
    </div>;
}
