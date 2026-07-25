import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ARTISTS, ARTWORKS, getArtworksByCategory, getCategoriesByType } from '../content';
import type { BrowseStackParamList } from '../navigation/types';
import { COLORS } from '../theme';

type Props = NativeStackScreenProps<BrowseStackParamList, 'BrowseList'>;

interface Row {
  key: string;
  label: string;
  count: number;
  artworkIds: string[];
}

export function BrowseListScreen({ route, navigation }: Props) {
  const { kind, label } = route.params;

  const rows: Row[] =
    kind === 'artist'
      ? ARTISTS.map((artist) => {
          const artworkIds = ARTWORKS.filter((a) => a.artistId === artist.id).map((a) => a.id);
          return { key: artist.id, label: artist.name, count: artworkIds.length, artworkIds };
        })
          .filter((r) => r.count > 0)
          .sort((a, b) => a.label.localeCompare(b.label))
      : getCategoriesByType(kind).map((category) => {
          const artworkIds = getArtworksByCategory(category.id).map((a) => a.id);
          return { key: category.id, label: category.name, count: artworkIds.length, artworkIds };
        });

  return (
    <View style={styles.screen}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate('BrowseArtworks', { artworkIds: item.artworkIds, label: item.label })
            }
            activeOpacity={0.8}
          >
            <View>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowCount}>
                {item.count} artwork{item.count === 1 ? '' : 's'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9AA39C" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nothing tagged as {label.toLowerCase()} yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.fade,
  },
  rowLabel: { fontWeight: '600', fontSize: 15, color: COLORS.ink },
  rowCount: { fontSize: 12, color: '#8A948C', marginTop: 2 },
  empty: { textAlign: 'center', color: '#8A948C', marginTop: 40 },
});
