module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './app',
          },
        },
      ],
      ['module:react-native-dotenv'],
      'react-native-reanimated/plugin', // Add if you use Reanimated
    ],
  };
};