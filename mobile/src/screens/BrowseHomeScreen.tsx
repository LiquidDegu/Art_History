import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { BrowseKind, BrowseStackParamList } from '../navigation/types';
import { COLORS } from '../theme';

type Props = NativeStackScreenProps<BrowseStackParamList, 'BrowseHome'>;

const TILES: { kind: BrowseKind; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: 'artist', label: 'Artists', icon: 'person' },
  { kind: 'style', label: 'Styles', icon: 'color-palette' },
  { kind: 'location', label: 'Locations', icon: 'business' },
  { kind: 'theme', label: 'Themes', icon: 'pricetag' },
];

export function BrowseHomeScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Browse the Collection</Text>
      <Text style={styles.subtitle}>Every artwork you've unlocked, sliced a different way.</Text>
      <View style={styles.grid}>
        {TILES.map((tile) => (
          <TouchableOpacity
            key={tile.kind}
            style={styles.tile}
            onPress={() => navigation.navigate('BrowseList', { kind: tile.kind, label: tile.label })}
            activeOpacity={0.8}
          >
            <Ionicons name={tile.icon} size={26} color={COLORS.gold} />
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream, padding: 20 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.ink, marginTop: 10 },
  subtitle: { fontSize: 13, color: '#6E7A72', marginTop: 4, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%', aspectRatio: 1.3, backgroundColor: '#fff', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.fade,
  },
  tileLabel: { fontWeight: '600', color: COLORS.ink, fontSize: 14 },
});
