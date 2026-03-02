/**
 * Shared utilities (e.g. URI / label helpers).
 */

function getShortName(uri) {
    if (!uri) return '';
    if (uri.startsWith('"') || uri.startsWith("'")) {
        return uri.replace(/^["']|["']$/g, '').substring(0, 30);
    }
    const hashIndex = uri.lastIndexOf('#');
    const slashIndex = uri.lastIndexOf('/');
    const index = Math.max(hashIndex, slashIndex);
    if (index !== -1 && index < uri.length - 1) {
        return uri.substring(index + 1);
    }
    return uri.length > 30 ? '...' + uri.substring(uri.length - 27) : uri;
}
