(() => {
    for (let code = `[..."Hello! \\u{1F600}"].join("·")`; ; ) {
        // Read the next block of code to evaluate.
        code = prompt("Enter code:", code);
        if (code == null) break;

        // Evaluate the code.
        let result;
        try {
            // Use `?.` (optional chaining) to force indirect `eval`.
            result = "✔ " + eval?.(`"use strict"; ${code}`);
        } catch (error) {
            result = "✘ " + error;
        }

        // Present the result, and allow the user to quit.
        if (!confirm(result)) break;
    }
})();
