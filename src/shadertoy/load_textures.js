// Based on a comment by @johnao under https://www.shadertoy.com/view/lsGGDd
(async () => {
    if (location.hostname != "www.shadertoy.com") return;

    // Fetch Shadertoy's default textures.
    const response = await fetch("https://www.shadertoy.com/shadertoy", {
        method: "POST",
        body: "mga=1&type=texture",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    // Borrow sampler properties from the 1st texture.
    const textures = await response.json();
    const defaultSampler = textures.sampler[0];

    // Place a file input under each input selector.
    const SLOT_COUNT = 4;
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
        const inputSelector = document.getElementById(`texture${slot}`);
        if (!inputSelector) continue;

        // Don't add the file input twice.
        if (inputSelector.querySelector(`input[type="file"]`)) continue;

        // Create the file input.
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.style.background = "#b0b0b0";
        input.style.borderRadius = "0 0 4px 4px";
        input.style.height = "min-content";
        input.style.maxWidth = "100%";
        input.style.minWidth = "100%";
        input.style.width = "100%";
        input.style.padding = "4px";
        inputSelector.append(input);
        inputSelector.style.background = "none";

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

        // Preserve previous sampler properties.
        const previousTexture = gShaderToy.GetTexture(slot);
        const mSampler = previousTexture?.mSampler ?? defaultSampler;
        gShaderToy.SetTexture(slot, {
            mType: "texture",
            mID: -1,
            mSrc: url,
            mPreviewSrc: url,
            mSampler,
        });
    }
})();
