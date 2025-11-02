(() => {
    const base64 = prompt("Enter Base64-encoded bytes:");
    if (!base64) return;

    // Convert URL-safe Base64 to standard Base64.
    const standardized = base64.replaceAll("-", "+").replaceAll("_", "/");
    const bytes = Array.from(Uint8Array.fromBase64(standardized));
    const toString = (byte) => byte.toString(16).padStart(2, "0");
    alert(bytes.map(toString).join(" ").toUpperCase());
})();
