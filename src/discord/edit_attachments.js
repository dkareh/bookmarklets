(() => {
    if (location.origin != "https://discord.com") return;

    const wrapperSelector = `
        div[class*="wrapper_"]:not(
            [class*="isSystemMessage_"],
            [class*="systemMessage__"]
        )
    `;

    const outlineMessagesRule = `
        li[id^="chat-messages-"] > ${wrapperSelector} {
            --thickness: 0.1rem;
            outline: var(--thickness) dotted yellow;
            outline-offset: calc(-0.5 * var(--thickness));
        }
    `;

    function outlineMessageRule({ channel, message }) {
        return `
            li[id="chat-messages-${channel}-${message}"] > ${wrapperSelector} {
                --thickness: 0.1rem;
                outline: var(--thickness) dotted cyan;
                outline-offset: calc(-0.5 * var(--thickness));
            }
        `;
    }

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(outlineMessagesRule);
    document.adoptedStyleSheets.push(sheet);

    function removeStyleSheet(sheet) {
        const index = document.adoptedStyleSheets.indexOf(sheet);
        if (index >= 0) document.adoptedStyleSheets.splice(index, 1);
    }

    document.addEventListener("click", click, { capture: true });

    function click(event) {
        const target = event.target;
        const ids = getMessageIds(target);
        if (!ids) return;
        document.removeEventListener("click", click, { capture: true });
        sheet.replaceSync(outlineMessageRule(ids));
        readFiles(ids);
    }

    function readFiles(ids, multiple = true) {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = multiple;
        input.addEventListener("change", () => {
            removeStyleSheet(sheet);
            const files = input.files;
            editAttachments(ids, [...files]);
        });
        input.addEventListener("cancel", () => {
            removeStyleSheet(sheet);
        });
        input.click();
    }

    function editAttachments({ channel, message }, files) {
        const formData = new FormData();
        for (const [index, file] of files.entries())
            formData.set(`files[${index}]`, file);
        const attachments = files.map((_, index) => ({ id: index }));
        // NOTE: "payload_json" doesn't have a MIME type because the `FormData` API
        // doesn't allow *non-file* entries to have a `Content-Type` header.
        formData.set("payload_json", JSON.stringify({ attachments }));
        request("PATCH", `/channels/${channel}/messages/${message}`, formData);
    }

    function request(method, endpoint, body) {
        const userToken = getUserToken();
        return fetch("/api/v10" + endpoint, {
            method: method,
            headers: { Authorization: userToken },
            mode: "same-origin",
            body: body,
        });
    }

    function getUserToken() {
        const modules = getWebpackModules();
        for (const module of modules) {
            if (typeof module.exports?.default?.getToken == "function")
                return module.exports.default.getToken();
            if (typeof module.exports?.getToken == "function")
                return module.exports.getToken();
        }
        throw new Error();
    }

    function getWebpackModules() {
        // NOTE: `webpackChunkdiscord_app` is the name of the chunk loading global.
        // https://github.com/webpack/webpack/blob/04e00736/lib/config/defaults.js#L1146-L1150
        const uniqueNameId = "discord_app";
        const chunkLoadingGlobal = `webpackChunk${uniqueNameId}`;

        let modules = null;

        // NOTE: `require` is `__webpack_require__`, the internal require function.
        // https://github.com/webpack/webpack/blob/04e00736/lib/RuntimeGlobals.js#L11
        const runtime = (require) => {
            // `require.c` is `__webpack_require__.c`, the module cache.
            // https://github.com/webpack/webpack/blob/04e00736/lib/RuntimeGlobals.js#L61
            modules = Object.values(require.c);
        };

        // NOTE: `push` is different from `Array.prototype.push`.
        // https://github.com/webpack/webpack/blob/04e00736/lib/web/JsonpChunkLoadingRuntimeModule.js#L419-L465
        const chunkIds = [Math.random()]; // "Load" a new chunk each time.
        window[chunkLoadingGlobal].push([chunkIds, {}, runtime]);
        if (modules == null) throw new Error();
        return modules;
    }

    function getMessageIds(element) {
        for (; element; element = element.parentElement) {
            const match = element.id.match(
                /^chat-messages-(?<channelId>\d+)-(?<messageId>\d+)$/,
            );
            if (match && element.querySelector(`:scope > ${wrapperSelector}`)) {
                return {
                    channel: match.groups.channelId,
                    message: match.groups.messageId,
                };
            }
        }
        return null;
    }
})();
