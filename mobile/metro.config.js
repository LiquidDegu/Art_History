// expo-sqlite's web backend (wa-sqlite, compiled to WASM and run in a Web
// Worker) needs two things the default Expo/Metro config doesn't provide:
// `.wasm` registered as a resolvable asset extension, and COOP/COEP
// response headers so the browser allows the SharedArrayBuffer wa-sqlite
// uses. Native (iOS/Android) doesn't need any of this — it uses expo-sqlite's
// native module directly — so this file only matters for `expo start --web`.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return middleware(req, res, next);
  },
};

module.exports = config;
