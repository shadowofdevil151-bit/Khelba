import { register } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const cwd = process.cwd();
const parentUrl = pathToFileURL(cwd.endsWith(path.sep) ? cwd : `${cwd}${path.sep}`);

register("@opentelemetry/instrumentation/hook.mjs", parentUrl);
await import("./observability.js");
