import { describe, it, expect } from "vitest";
import { userDisplayName, userInitial } from "./userDisplay";

describe("userDisplayName", () => {
  it("preferuje displayName", () => {
    expect(
      userDisplayName({ displayName: "Ala Kowalska", email: "ala@example.com" }),
    ).toBe("Ala Kowalska");
  });

  it("trimuje białe znaki w displayName", () => {
    expect(
      userDisplayName({ displayName: "  Ala  ", email: "ala@example.com" }),
    ).toBe("Ala");
  });

  it("używa lokalnej części emaila gdy brak displayName", () => {
    expect(
      userDisplayName({ displayName: null, email: "piotrek@example.com" }),
    ).toBe("piotrek");
  });

  it("używa lokalnej części emaila gdy displayName jest pustym stringiem", () => {
    expect(
      userDisplayName({ displayName: "   ", email: "kuba@example.com" }),
    ).toBe("kuba");
  });
});

describe("userInitial", () => {
  it("zwraca pierwszą literę z displayName uppercase", () => {
    expect(
      userInitial({ displayName: "ala", email: "ala@example.com" }),
    ).toBe("A");
  });

  it("respektuje polskie znaki diakrytyczne", () => {
    expect(
      userInitial({ displayName: "ćma", email: "x@example.com" }),
    ).toBe("Ć");
  });

  it("fallback do emaila gdy brak displayName", () => {
    expect(
      userInitial({ displayName: null, email: "robert@example.com" }),
    ).toBe("R");
  });
});
