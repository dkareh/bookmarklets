(() => {
    const inspectors = {
        bigint: (bigint) => bigint.toString() + "n",
        boolean: (boolean) => boolean.toString(),
        function: (func) => isolateLtr(func.toString()),
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
        if (isError(object)) {
            const name = object.name ?? "Error";
            return `${isolateLtr(name)} { message: ${quote(object.message)} }`;
        }
        if (object instanceof RegExp) {
            return isolateLtr(object.toString());
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
                return isolateLtr(name) + " " + inspectTypedArray(object);
            }
        }

        // Handle regular objects.
        const properties = Object.entries(object).map(inspectProperty).join(", ");
        const tag = object[Symbol.toStringTag]?.concat(" ") ?? "";
        // Don't output two spaces in an empty object.
        return isolateLtr(tag) + (properties == "" ? `{ }` : `{ ${properties} }`);
    }

    function isError(object) {
        if (!Error.isError) return object instanceof Error;
        // In WebKit, `Error.isError` returns `false` for `DOMException` instances.
        const checkForDOMException = !Error.isError(new DOMException());
        return (
            Error.isError(object) ||
            (checkForDOMException && object instanceof DOMException)
        );
    }

    function inspectProperty([key, value]) {
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
        const entries = [...map].map(inspectProperty);
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
        // Directional formatting characters:
        ["\u061C", "\\u061C"], // Arabic letter mark
        ["\u200E", "\\u200E"], // LTR mark
        ["\u200F", "\\u200F"], // RTL mark
        ["\u202A", "\\u202A"], // LTR embedding
        ["\u202B", "\\u202B"], // RTL embedding
        ["\u202C", "\\u202C"], // Pop directional formatting
        ["\u202D", "\\u202D"], // LTR override
        ["\u202E", "\\u202E"], // RTL override
        ["\u2066", "\\u2066"], // LTR isolate
        ["\u2067", "\\u2067"], // RTL isolate
        ["\u2068", "\\u2068"], // 1st strong isolate
        ["\u2069", "\\u2069"], // Pop directional isolate
    ]);

    // Add escape sequences for the remaining ASCII control characters.
    for (let code = 0; code < 32; ++code) {
        const char = String.fromCodePoint(code);
        if (!escapeSequences.has(char)) {
            const hex = code.toString(16).padStart(2, "0").toUpperCase();
            escapeSequences.set(char, `\\x${hex}`);
        }
    }

    function quote(string) {
        // `escape` already removes directional formatting characters.
        return `"${isolateLtr(escape(string), { sanitize: false })}"`;
    }

    function escape(string) {
        return [...string]
            .map((codePoint) => escapeSequences.get(codePoint) ?? codePoint)
            .join("");
    }

    function inspectKey(key) {
        if (typeof key == "string") {
            const identifier = /^[\p{ID_Start}$_][\p{ID_Continue}$]*$/u;
            // Identifiers cannot contain directional formatting characters.
            return identifier.test(key)
                ? isolateLtr(key, { sanitize: false })
                : quote(key);
        }
        return `[${inspect(key)}]`;
    }

    function isolateLtr(string, { sanitize = true } = {}) {
        const formattingCharacters = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
        if (sanitize) string = string.replaceAll(formattingCharacters, "");
        return `\u2066${string}\u2069`;
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
                    return `✔ ${isolateLtr(inspect(result.value), { sanitize: false })}`;
                } else {
                    return `✘ ${isolateLtr(String(result.error))}`;
                }
            } catch (error) {
                // Show the user the internal REPL error instead of quitting.
                // Use Unicode VS15 (U+FE0E) to request text presentation.
                return `\u2757\uFE0E ${isolateLtr(String(error))}`;
            }
        } catch {
            return `\u2757\uFE0E\u2757\uFE0E ${isolateLtr("Internal error")}`;
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
