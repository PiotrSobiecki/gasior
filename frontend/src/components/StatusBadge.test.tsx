import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("describes a validated recipe as zweryfikowana", () => {
    render(<StatusBadge status="validated" />);

    expect(screen.getByText("zweryfikowana")).toBeInTheDocument();
  });

  it("describes a draft recipe as szkic", () => {
    render(<StatusBadge status="draft" />);

    expect(screen.getByText("szkic")).toBeInTheDocument();
  });

  it("visually distinguishes validated from draft", () => {
    const { container: validated } = render(<StatusBadge status="validated" />);
    const validatedClass = validated.firstElementChild?.className ?? "";

    const { container: draft } = render(<StatusBadge status="draft" />);
    const draftClass = draft.firstElementChild?.className ?? "";

    expect(validatedClass).not.toBe(draftClass);
  });
});
