const { withAndroidManifest } = require('@expo/config-plugins');

const REMOVE_PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

module.exports = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const permissions = manifest.manifest['uses-permission'] || [];
    manifest.manifest['uses-permission'] = permissions.filter(
      (p) => !REMOVE_PERMISSIONS.includes(p.$?.['android:name'])
    );
    return mod;
  });
