import { vi } from "vitest";
import { configure } from "@testing-library/react";
configure({
  getElementError: (message) => new Error(message || "DOM query failed"),
});
window.scrollTo = vi.fn();
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
