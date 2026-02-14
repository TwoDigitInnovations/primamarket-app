const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require("nativewind/metro");
const { withSentryConfig } = require("@sentry/react-native/metro");

const config = mergeConfig(getDefaultConfig(__dirname), {
  resetCache: true,
  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Disable caching
        res.setHeader('Cache-Control', 'no-store');
        return middleware(req, res, next);
      };
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  // Disable metro cache
  cacheStores: [],
});

module.exports = withSentryConfig(withNativeWind(config, { input: "./global.css" }));