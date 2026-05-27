import { describe, it, expect } from "vitest";
import { createInMemoryEmailTransport } from "./email.in-memory";

describe("InMemoryEmailTransport", () => {
  it("queues sent messages in order", async () => {
    const t = createInMemoryEmailTransport();
    await t.send({ to: "a@example.com", subject: "1", text: "hi" });
    await t.send({ to: "b@example.com", subject: "2", text: "yo" });
    expect(t.sent.map((m) => m.to)).toEqual(["a@example.com", "b@example.com"]);
    expect(t.sent[1].subject).toBe("2");
  });

  it("reset() clears the queue", async () => {
    const t = createInMemoryEmailTransport();
    await t.send({ to: "a@example.com", subject: "x", text: "x" });
    expect(t.sent).toHaveLength(1);
    t.reset();
    expect(t.sent).toHaveLength(0);
  });

  it("preserves html when provided", async () => {
    const t = createInMemoryEmailTransport();
    await t.send({
      to: "a@example.com",
      subject: "x",
      text: "plain",
      html: "<b>rich</b>",
    });
    expect(t.sent[0].html).toBe("<b>rich</b>");
  });
});
