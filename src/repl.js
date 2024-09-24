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

        // Handle primitives wrapped in objects.
        if (object instanceof Boolean) {
            return `Boolean { ${object.toString()} }`;
        }
        if (object instanceof Number) {
            return `Number { ${object.toString()} }`;
        }
        if (object instanceof String) {
            return `String { ${quote(object)} }`;
        }

        // Handle special objects.
        if (Array.isArray(object)) return inspectArray(object);
        if (object instanceof Date) {
            if (Number.isNaN(object.getTime())) return 'Date { "Invalid Date" }';
            return `Date { ${quote(object.toISOString())} }`;
        }
        if (object instanceof Error) {
            const name = object.name ?? "Error";
            return `${name} { message: ${quote(object.message)} }`;
        }
        if (object instanceof RegExp) {
            return object.toString();
        }

        // Handle regular objects.
        const props = Object.entries(object).map(inspectProp).join(", ");
        const tag = object[Symbol.toStringTag]?.concat(" ") ?? "";
        return tag + (props == "" ? `{ }` : `{ ${props} }`);
    }

    function inspectProp([key, value]) {
        return `${inspectKey(key)}: ${inspect(value)}`;
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
        ["\b", "\\b"],
        ["\t", "\\t"],
        ["\n", "\\n"],
        ["\v", "\\v"],
        ["\f", "\\f"],
        ["\r", "\\r"],
        ["\x7F", "\\x7F"],
    ]);

    // Add escape sequences for the remaining ASCII control characters.
    for (let code = 0; code < 32; ++code) {
        const char = String.fromCodePoint(code);
        if (!escapeSequences.has(char)) {
            const hex = code.toString(16).padStart(2, "0").toUpperCase();
            escapeSequences.set(char, "\\u{" + hex + "}");
        }
    }

    function quote(string) {
        return `"${escape(string)}"`;
    }

    function escape(string) {
        return [...string]
            .map((codePoint) => escapeSequences.get(codePoint) ?? codePoint)
            .join("");
    }

    function inspectKey(key) {
        if (typeof key == "string") {
            const identifier = /^[\p{ID_Start}$_][\p{ID_Continue}$]*$/u;
            return identifier.test(key) ? key : quote(key);
        }
        return `[${inspect(key)}]`;
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
