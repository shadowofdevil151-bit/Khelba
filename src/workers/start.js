process.env.PROCESS_TYPE = "job_worker";

await import("./worker.js");
