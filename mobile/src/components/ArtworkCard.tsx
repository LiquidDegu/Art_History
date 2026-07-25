import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { getArtistName } from '../content';
import { ERA_COLORS } from '../theme';
import type { Artwork, EraId } from '../types/content';

interface Props {
  artwork: Artwork;
  eraId: EraId;
  height?: number;
}

// No live CC0 image pipeline has run yet (see backend/README.md), so real
// artwork photos aren't available/license-verified — this renders an
// era-tinted gradient card with the artist/title as a caption instead,
// same placeholder approach the reference prototype uses.
export function ArtworkCard({ artwork, eraId, height = 160 }: Props) {
  const [from, to] = ERA_COLORS[eraId];
  return (
    <View style={[styles.frame, { height: height + 12 }]}>
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { height }]}
      >
        <View style={styles.captionBox}>
          <Text style={styles.caption} numberOfLines={2}>
            {artwork.title} · {getArtistName(artwork.artistId)}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: '#fff',
  },
  gradient: {
    width: '100%',
    justifyContent: 'flex-end',
    padding: 10,
  },
  captionBox: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  caption: { color: '#fff', fontSize: 11, fontFamily: 'monospace' },
});
