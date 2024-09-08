// Based on a comment by @johnao under https://www.shadertoy.com/view/lsGGDd
(async () => {
    if (location.hostname != "www.shadertoy.com") return;
    const DARK = gThemeName == "dark";

    // Place a file input under each input selector.
    const SLOT_COUNT = 4;
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
        const inputSelector = document.getElementById(`texture${slot}`);
        if (!inputSelector) continue;

        // Don't add the file input twice.
        if (inputSelector.querySelector(`input[type="file"]`)) continue;

        inputSelector.style.background = "none";
        inputSelector.style.height = "min-content";

        // Create the file input.
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*,video/*,audio/*";
        input.style.background = DARK ? "#404040" : "#b0b0b0";
        input.style.borderRadius = "0 0 4px 4px";
        input.style.color = DARK ? "#b0b0b0" : "#000";
        input.style.height = "min-content";
        input.style.maxWidth = "100%";
        input.style.minWidth = "100%";
        input.style.width = "100%";
        input.style.padding = "4px";
        inputSelector.append(input);

        const updateCurrentTexture = updateTexture.bind(null, slot);
        input.addEventListener("change", updateCurrentTexture);
    }

    // We need to store object URLs to revoke them later on.
    const objectUrls = [];

    function updateTexture(slot, event) {
        const { files } = event.currentTarget;
        if (!files || files.length < 1) return;

        URL.revokeObjectURL(objectUrls[slot]);
        const url = URL.createObjectURL(files[0]);
        objectUrls[slot] = url;

        // Determine the texture type, defaulting to "texture" for images and
        // unknown MIME types. ("texture" is kind of a misnomer; all of these
        // resource types are converted to textures on the GPU in some way).
        const mimeType = files[0].type.toLowerCase();
        let mType = "texture";
        if (mimeType.startsWith("video/")) mType = "video";
        if (mimeType.startsWith("audio/")) mType = "music";

        // Preserve previous sampler properties.
        const previousTexture = gShaderToy.GetTexture(slot);
        const mSampler = previousTexture?.mSampler ?? { vflip: "true" };
        gShaderToy.SetTexture(slot, {
            mType,
            mID: -1,
            mSrc: url,
            mPreviewSrc: url,
            mSampler,
        });
    }
})();
