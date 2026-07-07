import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaymentForm } from "@/components/PaymentForm";

const noop = vi.fn().mockResolvedValue(null);

describe("PaymentForm", () => {
  function props() {
    return { onCreatePayment: vi.fn(), onExecutePayment: noop, onRefundPayment: noop };
  }

  it("renders form fields and submit button", () => {
    render(<PaymentForm {...props()} />);
    expect(screen.getByText("From Agent")).toBeInTheDocument();
    expect(screen.getByText("To Agent")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Create Payment")).toBeDisabled();
  });

  it("enables submit when required fields filled", () => {
    render(<PaymentForm {...props()} />);
    const inputs = screen.getAllByPlaceholderText("G...");
    fireEvent.change(inputs[0], { target: { value: "GA7Q3B7V6QV4" } });
    fireEvent.change(inputs[1], { target: { value: "GB7Q3B7V6QV4" } });
    fireEvent.change(screen.getByPlaceholderText("100"), {
      target: { value: "500" },
    });
    expect(screen.getByText("Create Payment")).not.toBeDisabled();
  });

  it("calls onCreatePayment with correct values", async () => {
    const onCreatePayment = vi.fn().mockResolvedValue("payment-1");
    render(<PaymentForm onCreatePayment={onCreatePayment} onExecutePayment={noop} onRefundPayment={noop} />);
    const inputs = screen.getAllByPlaceholderText("G...");
    fireEvent.change(inputs[0], { target: { value: "GA7Q3B7V6QV4" } });
    fireEvent.change(inputs[1], { target: { value: "GB7Q3B7V6QV4" } });
    fireEvent.change(screen.getByPlaceholderText("100"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByPlaceholderText("task-001"), {
      target: { value: "test-task" },
    });

    fireEvent.click(screen.getByText("Create Payment"));
    expect(onCreatePayment).toHaveBeenCalledWith(
      "GA7Q3B7V6QV4",
      "GB7Q3B7V6QV4",
      "500",
      "test-task",
    );
  });

  it("shows result tx on success", async () => {
    const onCreatePayment = vi.fn().mockResolvedValue("payment-42");
    render(<PaymentForm onCreatePayment={onCreatePayment} onExecutePayment={noop} onRefundPayment={noop} />);
    const inputs = screen.getAllByPlaceholderText("G...");
    fireEvent.change(inputs[0], { target: { value: "GA7Q3B7V6QV4" } });
    fireEvent.change(inputs[1], { target: { value: "GB7Q3B7V6QV4" } });
    fireEvent.change(screen.getByPlaceholderText("100"), {
      target: { value: "500" },
    });

    fireEvent.click(screen.getByText("Create Payment"));
    expect(await screen.findByText(/payment-42/)).toBeInTheDocument();
  });

  it("shows error on failure", async () => {
    const onCreatePayment = vi.fn().mockRejectedValue(new Error("Budget exceeded"));
    render(<PaymentForm onCreatePayment={onCreatePayment} onExecutePayment={noop} onRefundPayment={noop} />);
    const inputs = screen.getAllByPlaceholderText("G...");
    fireEvent.change(inputs[0], { target: { value: "GA7Q3B7V6QV4" } });
    fireEvent.change(inputs[1], { target: { value: "GB7Q3B7V6QV4" } });
    fireEvent.change(screen.getByPlaceholderText("100"), {
      target: { value: "500" },
    });

    fireEvent.click(screen.getByText("Create Payment"));
    expect(await screen.findByText(/Budget exceeded/)).toBeInTheDocument();
  });
});
