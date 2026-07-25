import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArtworkCard } from '../components/ArtworkCard';
import { getArtwork, getArtistName, getCategoriesForArtwork, getEraForArtwork } from '../content';
import type { BrowseStackParamList } from '../navigation/types';
import { COLORS } from '../theme';

type Props = NativeStackScreenProps<BrowseStackParamList, 'ArtworkDetail'>;

export function ArtworkDetailScreen({ route }: Props) {
  const artwork = getArtwork(route.params.artworkId)!;
  const eraId = getEraForArtwork(artwork);
  const styleTags = getCategoriesForArtwork(artwork.id, 'style');
  const themeTags = getCategoriesForArtwork(artwork.id, 'theme');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ArtworkCard artwork={artwork} eraId={eraId} height={200} />
      <Text style={styles.title}>{artwork.title}</Text>
      <Text style={styles.artist}>{getArtistName(artwork.artistId)}</Text>
      <Text style={styles.meta}>
        {artwork.year !== null ? `${Math.abs(artwork.year)} ${artwork.year < 0 ? 'BCE' : 'CE'}` : 'Date uncertain'}
        {'  ·  '}
        {artwork.medium}
        {'  ·  '}
        {artwork.location}
      </Text>
      <View style={styles.tags}>
        {[...styleTags, ...themeTags].map((tag) => (
          <View key={tag.id} style={styles.tag}>
            <Text style={styles.tagText}>{tag.name}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.rights}>{artwork.rightsSource}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  content: { padding: 20, gap: 6 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.ink, marginTop: 12 },
  artist: { fontSize: 15, color: COLORS.burgundy, fontWeight: '600' },
  meta: { fontSize: 13, color: '#6E7A72', marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.fade },
  tagText: { fontSize: 12, color: COLORS.ink, fontWeight: '500' },
  rights: { fontSize: 11, color: '#9AA39C', marginTop: 16 },
});
