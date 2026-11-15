const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:3000";
const API_BASE = `${API_ORIGIN}/api/v1`;
const REQUEST_TIMEOUT_MS = 12000;

let accessToken = null;
export const tokenStore = {
    get: () => accessToken,
    set: (token) => { accessToken = token; },
    clear: () => { accessToken = null; }
};

const parse = async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(body?.data?.message || body?.message || "Request could not be completed.");
        error.status = response.status;
        error.body = body;
        throw error;
    }
    return body;
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const transientStatuses = new Set([502, 503, 504]);

async function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const externalSignal = options.signal;
    let timedOut = false;
    const abortFromCaller = () => controller.abort();

    if (externalSignal?.aborted) controller.abort();
    else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });

    const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (timedOut) {
            const timeoutError = new Error("Request timed out. Please try again.");
            timeoutError.name = "TimeoutError";
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeout);
        externalSignal?.removeEventListener("abort", abortFromCaller);
    }
}

async function fetchWithRetry(url, options) {
    const method = (options.method || "GET").toUpperCase();
    const maxAttempts = method === "GET" ? 3 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        let response;
        try {
            response = await fetchWithTimeout(url, options);
        } catch (error) {
            if (options.signal?.aborted || error.name === "AbortError" || attempt === maxAttempts - 1) throw error;
            await wait(250 * (attempt + 1) + Math.random() * 150);
            continue;
        }

        if (!transientStatuses.has(response.status) || attempt === maxAttempts - 1) return response;
        await wait(250 * (attempt + 1) + Math.random() * 150);
    }

    throw new Error("Request could not be completed.");
}

let refreshing = null;
const refresh = async () => {
    if (!refreshing) {
        refreshing = (async () => {
            const maxAttempts = 3;
            for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                try {
                    const response = await fetchWithTimeout(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
                    if ((transientStatuses.has(response.status) || response.status === 409) && attempt < maxAttempts - 1) {
                        await wait(300 * (attempt + 1));
                        continue;
                    }
                    const body = await parse(response);
                    tokenStore.set(body.data?.accessToken);
                    return body.data;
                } catch (error) {
                    if (error.status || attempt === maxAttempts - 1) throw error;
                    await wait(300 * (attempt + 1));
                }
            }
            throw new Error("Session could not be restored.");
        })().finally(() => { refreshing = null; });
    }
    return refreshing;
};

export async function api(path, options = {}, retry = true) {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (tokenStore.get()) headers.set("Authorization", `Bearer ${tokenStore.get()}`);
    const response = await fetchWithRetry(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
    if (response.status === 401 && retry && !path.startsWith("/auth/")) {
        try { await refresh(); return api(path, options, false); } catch { tokenStore.clear(); }
    }

    return parse(response);
}

export const authApi = { login: (data) => api("/auth/login", { method: "POST", body: JSON.stringify(data) }), refresh };
export { API_ORIGIN, API_BASE };
