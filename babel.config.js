module.exports = function (api) {
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
            '@components': './app/components',
            '@screens': './app/screens',
            '@services': './app/services',
            '@store': './app/store',
            '@hooks': './app/hooks',
            '@types': './app/types',
            '@theme': './app/theme',
            '@utils': './app/utils',
            '@config': './app/config',
            '@i18n': './app/i18n',
            '@navigation': './app/navigation',
          },
        },
      ],
    ],
  };
};
