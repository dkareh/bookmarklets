(async () => {
    if (location.origin != "https://www.qobuz.com") return;
    if (!/^\/account\/download\//.test(location.pathname)) return;

    // POSIX.1-2001 tar (pax) block size:
    const BLOCK_SIZE = 512;

    const link = document.querySelector("#all-tracks .product-title a");
    const name = link.pathname.split("/")[3];

    // Assume that all tracks are available in the same formats.
    const selector = document.querySelector("#all-tracks select");
    const formats = [...selector.options].map((option) => option.label);
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

    // Assume that available formats are always assigned the same codes.
    const preferredFormat = selector.options[preferredIndex].value;
    const sources = await getTrackSources(preferredFormat);
    sources.push(getCoverSource(name));

    // Download the sources.
    const entries = await downloadSources(sources);

    // Download a tar archive.
    const archive = createTarArchive(name, entries);
    const anchor = document.createElement("a");
    anchor.download = archive.name;
    anchor.href = URL.createObjectURL(archive);
    anchor.type = archive.type;
    anchor.click();

    // Immediately revoking the object URL seems to work fine.
    URL.revokeObjectURL(anchor.href);

    // Scrape tracks from the webpage.
    async function getTrackSources(preferredFormat) {
        const rows = document.querySelectorAll("#all-tracks tr:has(a.tracks)");

        const sources = [];
        for (const row of rows) {
            const link = row.querySelector("a.tracks");
            const match = link.id.match(/^tracks_id(?<disc>\d+)-(?<track>\d+)$/);
            const { disc, track } = match.groups;

            let name = row.querySelector("td").textContent.replace(/^\d+ - /, "");
            name = `${disc.padStart(2, "0")}-${track.padStart(2, "0")} ${name}`;
            // Insert spaces before brackets and parentheses.
            name = name.replaceAll(/\S(?=[[(])/g, "$& ");

            // Send one request at a time.
            const uri = link.dataset.uri.replace("/xx", "/" + preferredFormat);
            const response = await fetch(uri);
            if (!response.ok) continue;

            const json = await response.json();
            if (!json || !Object.hasOwn(json, "url")) continue;
            sources.push({ url: json.url, name });
        }
        return sources;
    }

    // Get the location of the album cover.
    function getCoverSource(name) {
        const cover = document.querySelector("#all-tracks tr:has(.icon-picture) a");
        return { url: cover.href, name };
    }

    // Download each element of `sources`.
    async function downloadSources(sources) {
        const entries = [];
        // Download sources one at a time.
        for (const source of sources) {
            const response = await fetch(source.url);
            if (!response.ok) continue;
            const blob = await response.blob();
            const extension = getExtension(blob.type);
            entries.push({ blob, name: source.name + extension });
        }
        return entries;
    }

    // Get a typical extension for a MIME type.
    function getExtension(type) {
        const mapping = new Map([
            ["audio/flac", ".flac"],
            ["audio/mpeg", ".mp3"],
            ["image/jpeg", ".jpg"],
        ]);
        return mapping.get(type) ?? "";
    }

    // Create a POSIX.1-2001 tar (pax) archive.
    // Reference: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/pax.html
    function createTarArchive(name, entries) {
        // Convert milliseconds to seconds.
        const now = Math.floor(Date.now() / 1_000);
        const chunks = [];
        for (const entry of entries) {
            chunks.push(fillHeaderBlock(entry, now));
            chunks.push(entry.blob);
            const remainder = entry.blob.size % BLOCK_SIZE;
            if (remainder > 0) {
                const padding = BLOCK_SIZE - remainder;
                chunks.push(new ArrayBuffer(padding));
            }
        }
        // Emit an end-of-archive indicator: two zero-filled blocks.
        chunks.push(new ArrayBuffer(BLOCK_SIZE * 2));
        return new File(chunks, `${name}.tar`, { type: "application/x-tar" });
    }

    // Create a standard header block for a tar archive.
    // The modification time must be in seconds since the Unix epoch.
    function fillHeaderBlock(entry, modificationTime) {
        const header = new ArrayBuffer(BLOCK_SIZE);
        const encoder = new TextEncoder();
        let offset = 0;

        function put(value, offset, length) {
            if (typeof value == "number") {
                if (!Number.isInteger(value)) {
                    throw new RangeError(`Input '${value}' must be an integer`);
                }
                const max = 8 ** (length - 1) - 1;
                if (value < 0 || value > max) {
                    throw new RangeError(`Input '${value}' must be between 0 and ${max}`);
                }
                const octal = value.toString(8);
                put(octal, offset, length);
            } else {
                // FIXME: "All characters ... shall be represented in the coded
                // character set of the ISO/IEC 646:1991 standard."
                const bytes = new Uint8Array(header, offset, length);
                // NOTE: We don't need to add a null terminator because `header`
                // was zero-initialized, so it already has zeros in place.
                const { read } = encoder.encodeInto(value, bytes);
                if (read < value.length) {
                    console.warn(
                        `Input '${value}' (length ${value.length}) ` +
                            `was truncated to fit in ${length} bytes`,
                    );
                }
            }
        }

        function append(value, length) {
            put(value, offset, length);
            offset += length;
        }

        append(entry.name, 100);
        append(0o644, 8); // Mode (rw-r--r--)
        append(0, 8); // User ID
        append(0, 8); // Group ID
        append(entry.blob.size, 12);
        append(modificationTime, 12);
        append(" ".repeat(8), 8); // Checksum
        const REGULAR = "0";
        append(REGULAR, 1); // Type flag
        append("", 100); // Link name
        append("ustar", 6); // Magic number
        append("00", 2); // Version number
        append("root", 32); // User name
        append("root", 32); // Group name
        append(0, 8); // Major device number
        append(0, 8); // Minor device number
        append("", 155); // Prefix

        // Calculate the checksum.
        const bytes = new Uint8Array(header);
        const checksum = bytes.reduce((sum, byte) => sum + byte);
        put(checksum, 148, 8);

        return header;
    }
})();
