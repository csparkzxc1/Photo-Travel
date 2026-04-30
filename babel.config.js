module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@features': './src/features',
            '@components': './src/components',
            '@design': './src/design',
            '@data': './src/data',
            '@core': './src/core',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
