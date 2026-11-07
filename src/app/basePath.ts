/**
 * The app's base path: `/` at the domain root, `/<repo>` when hosted under a
 * GitHub Pages project path. Trailing slashes are stripped so the Solid router
 * resolves child routes without producing a doubled slash (`/<repo>//templates`).
 */
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

/**
 * Strip a leading router base from a location pathname so route comparisons are
 * independent of where the app is hosted. `useLocation().pathname` already
 * includes the base, so `App` must remove it before matching `/`.
 */
function pathWithinBase(pathname: string, base: string | undefined): string {
    if (!base || base === '/') {
        return pathname;
    }
    const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    if (pathname === trimmedBase) {
        return '/';
    }
    if (pathname.startsWith(`${trimmedBase}/`)) {
        return pathname.slice(trimmedBase.length) || '/';
    }
    return pathname;
}

export { basePath, pathWithinBase };
