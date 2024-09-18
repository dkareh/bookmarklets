(() => {
    // Only keep characters corresponding to bits: '0' and '1'.
    const bits = prompt("Enter bytes in binary:").replaceAll(/[^01]/g, "");
    if (!bits) return;

    // Determine byte count ahead of time, rounding down if necessary.
    const byteCount = Math.floor(bits.length / 8);

    // Convert '0' and '1' characters into an array of integers, assuming the
    // most significant bit comes before the least significant bit.
    const bytes = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i++) {
        const offset = i * 8;
        const currentBits = bits.slice(offset, offset + 8);
        console.assert(currentBits.length == 8);
        bytes[i] = parseInt(currentBits, 2);
    }

    // Decode the bytes, assuming UTF-8 encoding.
    const text = new TextDecoder("UTF-8").decode(bytes);
    if (bits.length % 8 == 0) {
        alert(text);
    } else {
        alert("Warning: Bit count is not a multiple of 8!\n" + text);
    }
})();
