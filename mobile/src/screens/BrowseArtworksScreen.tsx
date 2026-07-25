import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArtworkCard } from '../components/ArtworkCard';
import { getArtwork, getEraForArtwork } from '../content';
import type { BrowseStackParamList } from '../navigation/types';
import { COLORS } from '../theme';

type Props = NativeStackScreenProps<BrowseStackParamList, 'BrowseArtworks'>;

export function BrowseArtworksScreen({ route, navigation }: Props) {
  const { artworkIds, label } = route.params;
  const artworks = artworkIds.map((id) => getArtwork(id)!).filter(Boolean);

  return (
    <View style={styles.screen}>
      <FlatList
        data={artworks}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('ArtworkDetail', { artworkId: item.id })}>
            <ArtworkCard artwork={item} eraId={getEraForArtwork(item)} height={130} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No artworks tagged under {label}.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', color: '#8A948C', marginTop: 40 },
});
