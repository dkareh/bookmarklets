// The Wayback Machine allows you to omit digits from the timestamp. By writing
// '2', we request the latest archive from 2000/01/01 00:00:00 to the current
// year, 12/31 23:59:59. A few Internet Archive projects depend on the behavior:
// - https://github.com/internetarchive/wayback-machine-ios/blob/1d15a454/WM/Classes/Global/WMSAPIManager.swift#L48
// - https://github.com/internetarchive/wayback-machine-webextension/blob/30b8430e/webextension/scripts/background.js#L1222
// - https://github.com/internetarchive/wayback-machine-webextension/blob/30b8430e/webextension/scripts/popup.js#L238
// NOTE: It probably won't happen, but I'm assuming the Wayback Machine will
// fall back to returning an archive from 1996 to 1999 if there's no newer one.
// Source: https://github.com/internetarchive/wayback/blob/a331f968/wayback-core/src/main/java/org/archive/wayback/archivalurl/requestparser/ReplayRequestParser.java#L60-L65
location.assign(`https://web.archive.org/web/2/${encodeURIComponent(location.href)}`);
