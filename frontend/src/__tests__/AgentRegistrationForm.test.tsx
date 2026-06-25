import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AgentRegistrationForm } from "@/components/AgentRegistrationForm";

describe("AgentRegistrationForm", () => {
  it("renders form fields and submit button", () => {
    render(<AgentRegistrationForm onRegister={vi.fn()} />);
    const inputs = screen.getAllByPlaceholderText("G...");
    expect(inputs).toHaveLength(2);
    expect(screen.getByText("Register Agent")).toBeInTheDocument();
  });

  it("disables submit when fields are empty", () => {
    render(<AgentRegistrationForm onRegister={vi.fn()} />);
    const btn = screen.getByText("Register Agent");
    expect(btn).toBeDisabled();
  });

  it("enables submit when required fields filled", () => {
    render(<AgentRegistrationForm onRegister={vi.fn()} />);
    const inputs = screen.getAllByPlaceholderText("G...");
    fireEvent.change(inputs[0], { target: { value: "GABCDEFG" } });
    fireEvent.change(inputs[1], { target: { value: "G1234567" } });
    expect(screen.getByText("Register Agent")).not.toBeDisabled();
  });

  it("calls onRegister with form values", async () => {
    const onRegister = vi.fn().mockResolvedValue(undefined);
    render(<AgentRegistrationForm onRegister={onRegister} />);
    const inputs = screen.getAllByPlaceholderText("G...");
    fireEvent.change(inputs[0], { target: { value: "GABCDEFG" } });
    fireEvent.change(inputs[1], { target: { value: "G1234567" } });
    fireEvent.change(screen.getByPlaceholderText("agent-name or description"), {
      target: { value: "test-agent" },
    });

    fireEvent.click(screen.getByText("Register Agent"));
    expect(onRegister).toHaveBeenCalledWith("GABCDEFG", "G1234567", "test-agent");
  });

  it("shows error state on failure", async () => {
    const onRegister = vi.fn().mockRejectedValue(new Error("Budget exceeded"));
    render(<AgentRegistrationForm onRegister={onRegister} />);
    const inputs = screen.getAllByPlaceholderText("G...");
    fireEvent.change(inputs[0], { target: { value: "GABCDEFG" } });
    fireEvent.change(inputs[1], { target: { value: "G1234567" } });

    fireEvent.click(screen.getByText("Register Agent"));
    expect(await screen.findByText(/Budget exceeded/)).toBeInTheDocument();
  });

  it("shows submitting state", () => {
    const onRegister = vi.fn().mockImplementation(() => new Promise(() => {}));
    render(<AgentRegistrationForm onRegister={onRegister} />);
    const inputs = screen.getAllByPlaceholderText("G...");
    fireEvent.change(inputs[0], { target: { value: "GABCDEFG" } });
    fireEvent.change(inputs[1], { target: { value: "G1234567" } });

    fireEvent.click(screen.getByText("Register Agent"));
    expect(screen.getByText("Registering...")).toBeInTheDocument();
  });
});
