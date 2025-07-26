// src/controllers/errorController.ts
import { error404Template } from "../templates/error404Template.js";
/**
 * Renders the 404 error screen into `root` and wires up the restart button.
 */
export function renderErrors(root, errorType = "404") {
    if (errorType == "404") {
        document.title = "404 – Game Over";
        root.innerHTML = error404Template;
    }
}
//# sourceMappingURL=errorController.js.map