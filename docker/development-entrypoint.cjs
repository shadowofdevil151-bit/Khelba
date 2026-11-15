const { createHash } = require("node:crypto");
const { execFileSync, spawn } = require("node:child_process");
const { readFileSync, writeFileSync } = require("node:fs");

const lockHash = createHash("sha256")
    .update(readFileSync("package-lock.json"))
    .digest("hex");
const markerPath = "node_modules/.package-lock.sha256";

let installedHash = "";
try {
    installedHash = readFileSync(markerPath, "utf8").trim();
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}

if (installedHash !== lockHash) {
    execFileSync("npm", ["ci", "--omit=dev"], { stdio: "inherit" });
    writeFileSync(markerPath, lockHash);
}

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error("A development container command is required.");

const child = spawn(command, args, { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
    console.error("Failed to start development container command:", error);
    process.exitCode = 1;
});
child.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
});
