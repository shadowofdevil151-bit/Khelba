class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong.",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.success = false
        this.errors = errors
        this.severity = "error" // By default remain as error
        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
    asWarn() { this.severity = "warn"; return this; }
    asFatal() { this.severity = "fatal"; return this; }
    asInfo() { this.severity = "info"; return this; }
    asDebug() { this.severity = "debug"; return this; }
    asError() { this.severity = "error"; return this; }

}

export { ApiError }