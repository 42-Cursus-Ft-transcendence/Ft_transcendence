// src/controllers/errorController.ts
import { error404Template } from "../templates/error404Template.js";
import { navigate } from "../index.js"; // navigate 함수 경로 맞춰주세요

/**
 * Renders the 404 error screen into `root` and wires up the restart button.
 */
export function renderErrors(root: HTMLElement, errorType: string = "404") {
  if (errorType == "404") {
    document.title = "404 – Game Over";
    root.innerHTML = error404Template;
  }
}
