import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@theme/ThemeProvider';
import { borderRadius } from '@theme/spacing';
import { fontSize } from '@theme/typography';
import { useAuthStore } from '../../store/auth.store';
import { profileApi } from '../../services/api/profile.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import i18n from '../../i18n/i18n.config';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarProps {
  source?: { uri: string } | number;
  name?: string;
  size?: AvatarSize;
  /** Exact pixel size, for screens with their own avatar dimensions. */
  dimension?: number;
  /** Corner radius, for the squircle used on the profile header. */
  radius?: number;
  style?: ViewStyle;
  /** Follows the signed-in account, so a new photo shows up here without passing it down. */
  self?: boolean;
  /** Adds the camera badge that picks, crops and uploads a new photo. Use with `self`. */
  editable?: boolean;
  onPhotoChange?: (url: string | null) => void;
}

const sizeMap: Record<AvatarSize, number> = {
  small: 32,
  medium: 48,
  large: 64,
  xlarge: 96,
};

const fontSizeMap: Record<AvatarSize, number> = {
  small: fontSize.xs,
  medium: fontSize.base,
  large: fontSize.xl,
  xlarge: fontSize['3xl'],
};

export function Avatar({
  source,
  name,
  size = 'medium',
  dimension: dimensionOverride,
  radius,
  style,
  self = false,
  editable = false,
  onPhotoChange,
}: AvatarProps) {
  const { theme } = useTheme();
  const dimension = dimensionOverride ?? sizeMap[size];
  const [busy, setBusy] = useState(false);

  const storedPhoto = useAuthStore((state) => state.user?.profileImage);
  const setProfilePhoto = useAuthStore((state) => state.setProfilePhoto);
  const selfUri = self ? getFullImageUrl(storedPhoto) : null;
  const image = self ? (selfUri ? { uri: selfUri } : undefined) : source;

  const getInitials = (value: string) => {
    const parts = value.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return value.substring(0, 2).toUpperCase();
  };

  const upload = async (asset: ImagePicker.ImagePickerAsset) => {
    setBusy(true);
    try {
      const url = await profileApi.uploadPhoto({
        uri: asset.uri,
        name: asset.fileName || `profile-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      await setProfilePhoto(url);
      onPhotoChange?.(url);
    } catch (error: any) {
      Alert.alert(
        i18n.t('common.error'),
        error?.userMessage || i18n.t('profilePhoto.failed')
      );
    } finally {
      setBusy(false);
    }
  };

  // allowsEditing gives the platform's own square crop step, so the photo is framed before upload.
  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    await upload(result.assets[0]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(i18n.t('common.error'), i18n.t('profilePhoto.cameraDenied'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    await upload(result.assets[0]);
  };

  const remove = async () => {
    setBusy(true);
    try {
      await profileApi.removePhoto();
      await setProfilePhoto(null);
      onPhotoChange?.(null);
    } catch (error: any) {
      Alert.alert(
        i18n.t('common.error'),
        error?.userMessage || i18n.t('profilePhoto.failed')
      );
    } finally {
      setBusy(false);
    }
  };

  const openOptions = () => {
    if (busy) return;

    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: i18n.t('profilePhoto.fromLibrary'), onPress: pickFromLibrary },
      { text: i18n.t('profilePhoto.fromCamera'), onPress: takePhoto },
    ];
    if (selfUri) {
      options.push({
        text: i18n.t('profilePhoto.remove'),
        onPress: remove,
        style: 'destructive',
      });
    }
    options.push({ text: i18n.t('common.cancel'), style: 'cancel' });

    Alert.alert(i18n.t('profilePhoto.title'), i18n.t('profilePhoto.hint'), options);
  };

  const styles = StyleSheet.create({
    container: {
      width: dimension,
      height: dimension,
      borderRadius: radius ?? borderRadius.full,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    initials: {
      fontSize: dimensionOverride ? dimensionOverride / 3 : fontSizeMap[size],
      fontFamily: 'Cairo_600SemiBold',
      color: theme.colors.primary,
    },
    wrapper: {
      alignSelf: 'center',
    },
    badge: {
      position: 'absolute',
      bottom: 0,
      // `end` so the badge follows the reading direction in Arabic.
      end: 0,
      width: Math.max(24, dimension / 3),
      height: Math.max(24, dimension / 3),
      borderRadius: borderRadius.full,
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
      borderRadius: radius ?? borderRadius.full,
    },
  });

  const face = (
    <View style={[styles.container, style]}>
      {image ? (
        <Image source={image} style={styles.image} resizeMode="cover" />
      ) : (
        <Text style={styles.initials}>{name ? getInitials(name) : '?'}</Text>
      )}
      {busy ? (
        <View style={styles.overlay}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
    </View>
  );

  if (!editable) return face;

  return (
    <Pressable
      onPress={openOptions}
      accessibilityRole="button"
      accessibilityLabel={i18n.t('profilePhoto.title')}
      style={styles.wrapper}
    >
      {face}
      <View style={styles.badge}>
        <Ionicons name="camera" size={Math.max(12, dimension / 6)} color="#fff" />
      </View>
    </Pressable>
  );
}

export default Avatar;
