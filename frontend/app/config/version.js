// Application Version Configuration
// Updated automatically with deployment releases

export const APP_VERSION = 'v2.4.5';
export const BUILD_NUMBER = 374;
export const GIT_COMMIT_HASH = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA 
    ? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.substring(0, 7) 
    : 'd467f63';
export const RELEASE_NAME = 'Production Release (Stable)';
export const LAST_UPDATED = '08 Aug 2026';
