import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classify, matches, resolveCwd } from "./classify.js";
import type { Envelope } from "./himalaya.js";
import type { Rule } from "../config.js";

const env = (partial: Partial<Envelope>): Envelope => ({
  id: "1",
  flags: ["Unread"],
  subject: "",
  from: "",
  date: "",
  ...partial,
});

describe("matches", () => {
  it("matches from + subject any", () => {
    assert.equal(
      matches(
        env({
          from: "notifications@github.com",
          subject: "CI workflow failed on main",
        }),
        {
          fromIncludes: ["notifications@github.com"],
          subjectIncludesAny: ["failed", "CI"],
        },
      ),
      true,
    );
  });

  it("rejects when subject misses", () => {
    assert.equal(
      matches(
        env({ from: "notifications@github.com", subject: "Welcome" }),
        {
          fromIncludes: ["notifications@github.com"],
          subjectIncludesAny: ["failed"],
        },
      ),
      false,
    );
  });
});

describe("classify", () => {
  const rules: Rule[] = [
    {
      name: "ci",
      action: "investigate-ci",
      match: {
        fromIncludes: ["notifications@github.com"],
        subjectIncludesAny: ["failed"],
      },
    },
  ];

  it("returns first matching rule", () => {
    const out = classify(
      [
        env({
          id: "a",
          from: "notifications@github.com",
          subject: "Build failed",
        }),
      ],
      rules,
    );
    assert.equal(out.length, 1);
    assert.equal(out[0]!.rule.name, "ci");
  });
});

describe("resolveCwd", () => {
  it("maps owner/* roots", () => {
    assert.equal(
      resolveCwd(
        "dev-centr/agentic-email-integration",
        { "dev-centr/*": "C:/code/github.com/dev-centr" },
        "C:/fallback",
      ),
      "C:/code/github.com/dev-centr/agentic-email-integration",
    );
  });
});
