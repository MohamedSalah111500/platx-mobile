import React from 'react';
import { Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import type { PhotoAsset } from '../../types/people.types';

const SIZE = 96;

interface PhotoFieldProps {
  currentUrl?: string | null;
  photo: PhotoAsset | null;
  onChange: (photo: PhotoAsset) => void;
  placeholderIcon?: keyof typeof Ionicons.glyphMap;
}

function toAsset(asset: ImagePicker.ImagePickerAsset): PhotoAsset {
  const name = asset.fileName || `photo-${Date.now()}.jpg`;
  return { uri: asset.uri, name, type: asset.mimeType || 'image/jpeg' };
}

export function PhotoField({ currentUrl, photo, onChange, placeholderIcon = 'person' }: PhotoFieldProps) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const uri = photo?.uri ?? currentUrl ?? null;

  const fromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) onChange(toAsset(result.assets[0]));
  };

  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('profilePhoto.cameraDenied'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets?.length) onChange(toAsset(result.assets[0]));
  };

  const choose = () =>
    Alert.alert(t('profilePhoto.title'), undefined, [
      { text: t('profilePhoto.fromLibrary'), onPress: fromLibrary },
      { text: t('profilePhoto.fromCamera'), onPress: fromCamera },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={choose}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('profilePhoto.title')}
        style={[styles.circle, { backgroundColor: theme.colors.primaryLight }]}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.image} />
        ) : (
          <Ionicons name={placeholderIcon} size={40} color={theme.colors.primary} />
        )}
        <View style={[styles.badge, { backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}>
          <Ionicons name="camera" size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 20 },
  circle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  image: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  badge: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PhotoField;
