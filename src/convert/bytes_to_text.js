(() => {
    const rawInput = prompt("Enter bytes in binary or hexadecimal:");
    if (!rawInput) return;

    // Only keep characters corresponding to binary or hexadecimal digits.
    const digits = rawInput.replaceAll(/[^0-9A-F]/gi, "");

    // If all digits are '0' or '1', then assume the digits are binary.
    const radix = digits.search(/[^01]/) == -1 ? 2 : 16;

    // Determine byte count ahead of time, rounding down if necessary.
    const digitsPerByte = Math.log2(256) / Math.log2(radix);
    const byteCount = Math.floor(digits.length / digitsPerByte);

    // Convert the digits into an array of integers, assuming the most
    // significant digit comes before the least significant digit.
    const bytes = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i++) {
        const offset = i * digitsPerByte;
        const currentDigits = digits.slice(offset, offset + digitsPerByte);
        console.assert(currentDigits.length == digitsPerByte);
        bytes[i] = parseInt(currentDigits, radix);
    }

    // Decode the bytes, assuming UTF-8 encoding.
    const text = new TextDecoder("UTF-8").decode(bytes);
    if (digits.length % digitsPerByte == 0) {
        alert(text);
    } else {
        const warning = `Digit count is not a multiple of ${digitsPerByte}!\n`;
        alert("Warning: " + warning + text);
    }
})();
