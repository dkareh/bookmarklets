(() => {
    const inspectors = {
        bigint: (bigint) => bigint.toString() + "n",
        boolean: (boolean) => boolean.toString(),
        function: (func) => func.toString(),
        number: (number) => number.toString(),
        object: inspectObject,
        string: (string) => {
            // Check if `string` has exactly one code point.
            const [initial, next] = string;
            if (initial && !next) {
                const hex = initial.codePointAt(0).toString(16).padStart(4, "0");
                return `${quote(initial)} (U+${hex.toUpperCase()})`;
            }
            return quote(string);
        },
        symbol: (symbol) => `Symbol(${quote(symbol.description)})`,
        undefined: () => "undefined",
    };

    function inspect(value) {
        return inspectors[typeof value](value);
    }

    // https://html.spec.whatwg.org/multipage/webappapis.html#creating-a-new-javascript-realm
    // For compatibility reasons, browsers remove the `SharedArrayBuffer`
    // constructor from the global object if the document is not cross-origin
    // isolated. However, the constructor is still functional, and you can even
    // access the constructor indirectly through `WebAssembly.Memory`.
    const SharedArrayBuffer = new WebAssembly.Memory({
        initial: 0,
        maximum: 0,
        shared: true,
    }).buffer.constructor;

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
        if (object instanceof Map) return inspectMap(object);
        if (object instanceof Set) return inspectSet(object);
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
        if (Object.prototype.toString.call(object) == "[object Arguments]") {
            // `object` is *probably* an arguments array-like object.
            return `Arguments ${inspectArray(object)}`;
        }
        if (object instanceof WeakRef) {
            return `WeakRef { ${inspect(object.deref())} }`;
        }
        if (object instanceof ArrayBuffer) {
            const array = new Uint8Array(object);
            return `ArrayBuffer ${inspectTypedArray(array)}`;
        }
        if (object instanceof SharedArrayBuffer) {
            const array = new Uint8Array(object);
            return `SharedArrayBuffer ${inspectTypedArray(array)}`;
        }
        if (ArrayBuffer.isView(object)) {
            if (object instanceof DataView) {
                return inspectDataView(object);
            } else {
                const name = object.constructor.name;
                return name + " " + inspectTypedArray(object);
            }
        }

        // Handle regular objects.
        const props = Object.entries(object).map(inspectProp).join(", ");
        const tag = object[Symbol.toStringTag]?.concat(" ") ?? "";
        // Don't output two spaces in an empty object.
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

    function inspectDataView({ buffer, byteOffset, byteLength }) {
        const array = new Uint8Array(buffer, byteOffset, byteLength);
        return `DataView ${inspectTypedArray(array)}`;
    }

    function inspectTypedArray(array) {
        // Don't output two spaces in an empty typed array.
        if (array.length == 0) return "[ ]";
        const elements = [...array].map((element) => {
            // NOTE: `Float16Array` is not universally supported.
            if (window.Float16Array && array instanceof window.Float16Array)
                return element.toString();
            if (array instanceof Float32Array) return element.toString();
            if (array instanceof Float64Array) return element.toString();

            // We're not displaying the two's complement representation of
            // negative integers, so we need to move the minus sign before "0x".
            const sign = element < 0 ? "-" : "";
            if (element < 0) element = -element;
            const maxDigitCount = array.BYTES_PER_ELEMENT * 2;
            const hex = element.toString(16).padStart(maxDigitCount, "0").toUpperCase();
            return sign + "0x" + hex;
        });
        return `[ ${elements.join(", ")} ]`;
    }

    function inspectMap(map) {
        // Don't output two spaces in an empty map.
        if (map.size == 0) return "Map { }";
        const entries = [...map].map(inspectProp);
        return `Map { ${entries.join(", ")} }`;
    }

    function inspectSet(set) {
        // Don't output two spaces in an empty set.
        if (set.size == 0) return "Set { }";
        const values = [...set].map(inspect);
        return `Set { ${values.join(", ")} }`;
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

    function evaluate(code) {
        try {
            // Use `?.` (optional chaining) to force indirect `eval`.
            const value = eval?.(`"use strict"; ${code}`);
            return { tag: "success", value };
        } catch (error) {
            return { tag: "error", error };
        }
    }

    function format(result) {
        try {
            try {
                if (result.tag == "success") {
                    return `✔ ${inspect(result.value)}`;
                } else {
                    return `✘ ${result.error}`;
                }
            } catch (error) {
                // Show the user the internal REPL error instead of quitting.
                // Use Unicode VS15 (U+FE0E) to request text presentation.
                return `\u2757\uFE0E ${error}`;
            }
        } catch {
            return "\u2757\uFE0E\u2757\uFE0E Internal error";
        }
    }

    for (let code = String.raw`[..."Hello! \u{1F600}"].join("·")`; ; ) {
        // Read the next block of code to evaluate.
        code = prompt("Enter code:", code);
        if (code == null) break;

        const result = evaluate(code);

        // Present the result, and allow the user to quit.
        if (!confirm(format(result))) break;
    }
})();
