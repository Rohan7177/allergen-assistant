// next.config.js
const withTM = require('next-transpile-modules')([
  'react-native-web',
  'expo-modules-core', // Keep this if you use any other Expo modules
]);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The 'webpack5: true' option is no longer needed in newer Next.js versions
  // as Webpack 5 is the default. This line has been removed.

  // This is the core configuration to make React Native Web work with Next.js
  webpack: (config) => {
    // Alias react-native to react-native-web for web builds
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native$': 'react-native-web',
    };

    // Add web-specific extensions for resolution
    // This tells Webpack to look for .web.js, .web.ts, etc., files first
    config.resolve.extensions = [
      '.web.js',
      '.web.ts',
      '.web.tsx',
      '.js',
      '.ts',
      '.tsx',
    ].concat(config.resolve.extensions); // Ensure .js, .ts, .tsx are still included

    // Return the modified config
    return config;
  },
  // We recommend not using the `src` directory with `create-next-app`
  // when using `next-transpile-modules` as it can cause issues.
  // If you chose to use `src/`, you might need additional configuration.
  // For this setup, it's simpler without it.
  // experimental: {
  //   appDir: true, // If you're using Next.js App Router
  // },
};

// Export the configuration, applying next-transpile-modules
module.exports = withTM(nextConfig);
