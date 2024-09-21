(() => {
    // Assume that all tracks are available in the same formats.
    const selectors = [...document.querySelectorAll("#all-tracks select")];
    const formats = [...selectors[0].options].map((option) => option.label);
    let preferredIndex;
    for (;;) {
        const list = formats.map((format, i) => i + 1 + ". " + format).join("\n");
        const response = prompt("Enter index of preferred format:\n" + list, "1");
        if (response == null) return;

        const index = parseInt(response, 10);
        if (!Number.isNaN(index) && 1 <= index && index <= formats.length) {
            preferredIndex = index - 1;
            break;
        }
    }

    // Assume that available formats are always indexed in the same order.
    for (const selector of selectors) {
        selector.selectedIndex = preferredIndex;
    }

    const delay = 1_000;
    const tracks = document.querySelectorAll("#all-tracks a.tracks");
    for (const [index, track] of tracks.entries()) {
        setTimeout(() => track.click(), index * delay);
    }
})();
