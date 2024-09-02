(() => {
    // Source: https://discord.com/developers/docs/reference#snowflakes
    const snowflake = BigInt(prompt("Enter snowflake:"));
    const discordEpoch = 1_420_070_400_000n;
    // This conversion is safe because timestamps are unsigned 42-bit integers,
    // and JavaScript numbers can represent all integers between ±2⁵³.
    const timestamp = new Date(Number((snowflake >> 22n) + discordEpoch));
    const internalWorkerId = (snowflake & 0x3e0000n) >> 17n;
    const internalProcessId = (snowflake & 0x1f000n) >> 12n;
    const increment = snowflake & 0xfffn;
    alert(
        [
            `Timestamp: ${timestamp.toLocaleString()}`,
            `Internal Worker ID: ${internalWorkerId}`,
            `Internal Process ID: ${internalProcessId}`,
            `Increment: ${increment}`,
        ].join("\n"),
    );
})();
