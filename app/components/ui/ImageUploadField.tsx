import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { Spinner } from './Spinner';
import { spacing } from '../../theme/spacing';
import { fontSize, buttonLineHeight } from '../../theme/typography';
import { libraryApi } from '../../services/api/library.api';
import { getFullImageUrl } from '../../utils/imageUrl';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

export function ImageUploadField({ label, value, onChange }: ImageUploadFieldProps) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const [uploading, setUploading] = useState(false);
  const preview = value ? getFullImageUrl(value) : null;

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const url = await libraryApi.uploadImage({
        uri: asset.uri,
        name: asset.fileName || `image-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      onChange(url);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('courseManage.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <TouchableOpacity
        onPress={pick}
        disabled={uploading}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.box, { backgroundColor: theme.colors.card, borderColor: theme.colors.inputBorder }]}
      >
        {uploading ? (
          <Spinner />
        ) : preview ? (
          <Image source={{ uri: preview }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={32} color={theme.colors.primary} />
            <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{t('courseManage.pickImage')}</Text>
          </View>
        )}
      </TouchableOpacity>
      {value && !uploading ? (
        <TouchableOpacity onPress={() => onChange('')} accessibilityRole="button" style={styles.remove}>
          <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
          <Text style={[styles.removeText, { color: theme.colors.danger }]}>{t('courseManage.removeImage')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', marginBottom: spacing.sm, textAlign: 'left' },
  box: { height: 160, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', gap: spacing.sm },
  hint: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', lineHeight: buttonLineHeight(fontSize.sm), includeFontPadding: false },
  remove: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, alignSelf: 'flex-start' },
  removeText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', lineHeight: buttonLineHeight(fontSize.sm), includeFontPadding: false },
});

export default ImageUploadField;
