(() => {
    // Normalize subreddit and user names.
    const name = prompt("Enter subreddit name or 'u/<username>':")
        .replaceAll("\\", "/")
        .replace(/^[ /]+/, "")
        .toLowerCase();
    // Don't add a prefix if the name already includes one.
    const prefix = /^(?:[ru]|user)\//.test(name) ? "" : "r/";
    location.assign("https://old.reddit.com/" + prefix + name);
})();
