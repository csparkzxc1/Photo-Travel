import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { ComposedCollage } from '@core/collageLayouts';
import { useTheme } from '@design/ThemeProvider';
import { typography } from '@design/tokens';

interface CollageCanvasProps {
  composed: ComposedCollage;
  /** Render width in DIPs. Height is derived from template aspect ratio. */
  width: number;
  /** Optional title shown on templates whose first slot is captioned. */
  title?: string;
}

/**
 * Pure render of a composed collage. The viewRef on the parent is what
 * `react-native-view-shot` captures, so this component must be fully laid
 * out at capture time — no LayoutAnimations, no async imageOnLoad effects.
 *
 * Each slot uses absolute positioning derived from normalised template
 * coordinates so the same JSX produces the same pixel output regardless
 * of host width.
 */
export const CollageCanvas = React.forwardRef<View, CollageCanvasProps>(
  function CollageCanvas({ composed, width, title }, ref) {
    const { template, composed: slots } = composed;
    const height = width / template.aspectRatio;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={[
          styles.canvas,
          {
            width,
            height,
            backgroundColor: template.background,
          },
        ]}
      >
        {slots.map(({ slot, photo }, idx) => {
          const slotStyle = {
            position: 'absolute' as const,
            left: slot.x * width,
            top: slot.y * height,
            width: slot.w * width,
            height: slot.h * height,
            transform: slot.rotation ? [{ rotate: `${slot.rotation}deg` }] : undefined,
            borderColor: template.borderColor ?? 'transparent',
            borderWidth: template.borderWidth ?? 0,
            overflow: 'hidden' as const,
            backgroundColor: '#222',
          };

          return (
            <View key={idx} style={slotStyle}>
              {photo ? (
                <ImageBackground
                  source={{ uri: photo.localUri }}
                  resizeMode="cover"
                  style={StyleSheet.absoluteFill}
                >
                  {slot.caption === 'date' && (
                    <Caption text={formatDate(photo.takenAt)} corner="br" />
                  )}
                  {slot.caption === 'region' && photo.regionId && (
                    <Caption text={photo.regionId} corner="bl" />
                  )}
                </ImageBackground>
              ) : (
                <EmptySlot index={idx} />
              )}
            </View>
          );
        })}

        {title && template.id === 'fourcut' && (
          <View style={styles.fourcutFooter}>
            <Text style={[typography.bodyStrong, { color: '#fff' }]}>{title}</Text>
            <Text style={[typography.micro, { color: 'rgba(255,255,255,0.6)' }]}>
              Photo Travel
            </Text>
          </View>
        )}
      </View>
    );
  }
);

function Caption({ text, corner }: { text: string; corner: 'br' | 'bl' }) {
  return (
    <View
      style={[
        styles.caption,
        corner === 'br' ? { right: 6, bottom: 6 } : { left: 6, bottom: 6 },
      ]}
    >
      <Text style={styles.captionText}>{text}</Text>
    </View>
  );
}

function EmptySlot({ index }: { index: number }) {
  const { theme } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, styles.empty, { borderColor: theme.border }]}>
      <Text style={[typography.caption, { color: theme.textSubtle }]}>{index + 1}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  canvas: { overflow: 'hidden' },
  caption: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
  },
  captionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  fourcutFooter: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
