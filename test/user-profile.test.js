import test from "node:test";
import assert from "node:assert/strict";
import { User } from "../src/models/user.model.js";

test("HSC profiles default to the science stream", () => {
    const user = new User({
        username: "notes-stream-test",
        email: "notes-stream-test@example.test",
        profile: { education_level: "HSC" }
    });

    assert.equal(user.profile.education_stream, "SCIENCE");
});

test("education stream accepts only supported values", async () => {
    const user = new User({
        username: "notes-stream-invalid",
        email: "notes-stream-invalid@example.test",
        profile: { education_stream: "ENGINEERING" }
    });

    await assert.rejects(user.validate(), (error) => Boolean(error.errors["profile.education_stream"]));
});
