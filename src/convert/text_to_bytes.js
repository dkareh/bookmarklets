(() => {
    const text = prompt("Enter text:");
    if (!text) return;

    const bytes = Array.from(new TextEncoder().encode(text));
    const toString = (byte) => byte.toString(16).padStart(2, "0");
    alert(bytes.map(toString).join(" ").toUpperCase());
})();
