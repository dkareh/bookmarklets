(() => {
    const inspectors = {
        bigint: (bigint) => bigint.toString() + "n",
        boolean: (boolean) => boolean.toString(),
        function: (func) => func.toString(),
        number: (number) => number.toString(),
        object: inspectObject,
        string: (string) => quote(string),
        symbol: (symbol) => `Symbol(${quote(symbol.description)})`,
        undefined: () => "undefined",
    };

    function inspect(value) {
        return inspectors[typeof value](value);
    }

    function inspectObject(object) {
        // The type of `null` is "object", so handle it here.
        if (object === null) return "null";

        // Handle special objects.
        if (Array.isArray(object)) return inspectArray(object);

        // Handle regular objects.
        const props = Object.entries(object).map(inspectProp).join(", ");
        return props == "" ? `{ }` : `{ ${props} }`;
    }

    function inspectProp([key, value]) {
        return `${quoteKeyIfNeeded(key)}: ${inspect(value)}`;
    }

    function inspectArray(array) {
        // Don't output two spaces in an empty array.
        if (array.length == 0) return "[ ]";

        // Output all slots, including empty slots.
        const slots = [];
        let emptySlotCount = 0;
        for (let i = 0; i < array.length; ++i) {
            if (!(i in array)) {
                emptySlotCount++;
                continue;
            }
            if (emptySlotCount > 0) {
                const suffix = emptySlotCount > 1 ? "s" : "";
                slots.push(`<${emptySlotCount} empty slot${suffix}>`);
                emptySlotCount = 0;
            }
            slots.push(inspect(array[i]));
        }
        // Output empty slots at the end of the array.
        if (emptySlotCount > 0) {
            const suffix = emptySlotCount > 1 ? "s" : "";
            slots.push(`<${emptySlotCount} empty slot${suffix}>`);
        }
        return `[ ${slots.join(", ")} ]`;
    }

    const escapeSequences = new Map([
        ['"', '\\"'],
        ["\\", "\\\\"],
        ["\n", "\\n"],
        ["\r", "\\r"],
    ]);

    function quote(string) {
        return `"${escape(string)}"`;
    }

    function escape(string) {
        return [...string]
            .map((codePoint) => escapeSequences.get(codePoint) ?? codePoint)
            .join("");
    }

    function quoteKeyIfNeeded(key) {
        const identifier = /^[\p{ID_Start}$_][\p{ID_Continue}$]*$/u;
        return identifier.test(key) ? key : quote(key);
    }

    for (let code = `[..."Hello! \\u{1F600}"].join("·")`; ; ) {
        // Read the next block of code to evaluate.
        code = prompt("Enter code:", code);
        if (code == null) break;

        // Evaluate the code.
        let result;
        try {
            // Use `?.` (optional chaining) to force indirect `eval`.
            result = "✔ " + inspect(eval?.(`"use strict"; ${code}`));
        } catch (error) {
            result = "✘ " + error;
        }

        // Present the result, and allow the user to quit.
        if (!confirm(result)) break;
    }
})();
