export const waitForRedisReady = (client, timeoutMs = 10000) => {
    if (client.status === "ready") return Promise.resolve();
    if (client.status === "end") {
        return Promise.reject(new Error("Redis connection has ended."));
    }

    return new Promise((resolve, reject) => {
        let timer;
        const cleanup = () => {
            clearTimeout(timer);
            client.removeListener("ready", onReady);
            client.removeListener("end", onEnd);
        };
        const onReady = () => {
            if (client.status !== "ready") return;
            cleanup();
            resolve();
        };
        const onEnd = () => {
            cleanup();
            reject(new Error("Redis connection ended before becoming ready."));
        };

        client.on("ready", onReady);
        client.on("end", onEnd);
        timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Redis did not become ready within ${timeoutMs}ms.`));
        }, timeoutMs);
        timer.unref?.();
        onReady();
    });
};
