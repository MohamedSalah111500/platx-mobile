const { withAndroidManifest } = require('@expo/config-plugins');

const OPTIONAL_FEATURES = ['android.hardware.screen.portrait', 'android.hardware.screen.landscape'];

module.exports = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const features = (manifest['uses-feature'] || []).filter(
      (f) => !OPTIONAL_FEATURES.includes(f.$?.['android:name'])
    );
    manifest['uses-feature'] = [
      ...features,
      ...OPTIONAL_FEATURES.map((name) => ({ $: { 'android:name': name, 'android:required': 'false' } })),
    ];
    return mod;
  });
