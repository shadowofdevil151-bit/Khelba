export function messageKey(message) {
    return String(message?._id || `${message?.sender}:${message?.createdAt}:${message?.text}`);
}

export function mergeMessages(current, incoming) {
    const unique = new Map();
    for (const message of [...current, ...(Array.isArray(incoming) ? incoming : [])]) {
        unique.set(messageKey(message), message);
    }
    return [...unique.values()].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}
