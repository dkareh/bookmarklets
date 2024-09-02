(() => {
    // The HTML standard only says timer IDs must be positive, but in practice,
    // timer IDs are assigned sequentially in increasing order.
    const highestTimerId = setTimeout(() => {});
    for (let id = 1; id <= highestTimerId; ++id) {
        // Timeouts and intervals share the same pool of IDs, so we can use
        // `clearTimeout` to clear both types of timers.
        clearTimeout(id);
    }
})();
