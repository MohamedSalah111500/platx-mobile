import React, { useMemo } from 'react';
import { View } from 'react-native';
import { create } from 'qrcode/lib/core/qrcode';

const QUIET_ZONE = 2;

interface Segment {
  dark: boolean;
  length: number;
}

function toRows(value: string): Segment[][] {
  const { modules } = create(value, { errorCorrectionLevel: 'M' });
  const rows: Segment[][] = [];
  for (let row = 0; row < modules.size; row++) {
    const segments: Segment[] = [];
    for (let col = 0; col < modules.size; col++) {
      const dark = Boolean(modules.get(row, col));
      const last = segments[segments.length - 1];
      if (last && last.dark === dark) last.length++;
      else segments.push({ dark, length: 1 });
    }
    rows.push(segments);
  }
  return rows;
}

export function QrCode({ value, size }: { value: string; size: number }) {
  const rows = useMemo(() => toRows(value), [value]);
  const cell = Math.max(1, Math.floor(size / (rows.length + QUIET_ZONE * 2)));

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={value}
      style={{ direction: 'ltr', backgroundColor: '#FFFFFF', padding: cell * QUIET_ZONE, alignSelf: 'center' }}
    >
      {rows.map((segments, row) => (
        <View key={row} style={{ flexDirection: 'row', height: cell }}>
          {segments.map((segment, index) => (
            <View
              key={index}
              style={{ width: segment.length * cell, backgroundColor: segment.dark ? '#000000' : '#FFFFFF' }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
