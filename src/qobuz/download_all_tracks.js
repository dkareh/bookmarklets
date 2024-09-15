(() => {
    const delay = 1_000;
    const tracks = document.querySelectorAll("#all-tracks a.tracks");
    for (const [index, track] of tracks.entries()) {
        setTimeout(() => track.click(), index * delay);
    }
})();
