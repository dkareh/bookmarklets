(() => {
    const base64 = prompt("Enter Base64-encoded bytes:");
    if (!base64) return;

    // https://developer.mozilla.org/en-US/docs/Glossary/Base64
    const byteString = atob(base64.replaceAll("-", "+").replaceAll("_", "/"));
    const bytes = Array.from(byteString, (point) => point.codePointAt(0));
    const toString = (byte) => byte.toString(16).padStart(2, "0");
    alert(bytes.map(toString).join(" ").toUpperCase());
})();
