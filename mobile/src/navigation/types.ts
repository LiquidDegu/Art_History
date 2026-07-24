import type { NavigatorScreenParams } from '@react-navigation/native';
import type { CategoryType, EraId } from '../types/content';

export type PathStackParamList = {
  Path: undefined;
  Quiz: { eraId: EraId };
  Results: { eraId: EraId; correct: number; total: number; xpGained: number };
};

export type BrowseKind = 'artist' | CategoryType;

export type BrowseStackParamList = {
  BrowseHome: undefined;
  BrowseList: { kind: BrowseKind; label: string };
  BrowseArtworks: { artworkIds: string[]; label: string };
  ArtworkDetail: { artworkId: string };
};

export type RootTabParamList = {
  PathTab: NavigatorScreenParams<PathStackParamList>;
  BrowseTab: NavigatorScreenParams<BrowseStackParamList>;
};
