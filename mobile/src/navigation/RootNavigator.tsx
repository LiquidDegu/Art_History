import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ArtworkDetailScreen } from '../screens/ArtworkDetailScreen';
import { BrowseArtworksScreen } from '../screens/BrowseArtworksScreen';
import { BrowseHomeScreen } from '../screens/BrowseHomeScreen';
import { BrowseListScreen } from '../screens/BrowseListScreen';
import { PathScreen } from '../screens/PathScreen';
import { QuizScreen } from '../screens/QuizScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { COLORS } from '../theme';
import type { BrowseStackParamList, PathStackParamList, RootTabParamList } from './types';

const PathStack = createNativeStackNavigator<PathStackParamList>();
const BrowseStack = createNativeStackNavigator<BrowseStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function PathStackNavigator() {
  return (
    <PathStack.Navigator screenOptions={{ headerShown: false }}>
      <PathStack.Screen name="Path" component={PathScreen} />
      <PathStack.Screen name="Quiz" component={QuizScreen} options={{ gestureEnabled: false }} />
      <PathStack.Screen name="Results" component={ResultsScreen} options={{ gestureEnabled: false }} />
    </PathStack.Navigator>
  );
}

function BrowseStackNavigator() {
  return (
    <BrowseStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.cream },
        headerTintColor: COLORS.ink,
        headerShadowVisible: false,
      }}
    >
      <BrowseStack.Screen name="BrowseHome" component={BrowseHomeScreen} options={{ title: 'Browse' }} />
      <BrowseStack.Screen
        name="BrowseList"
        component={BrowseListScreen}
        options={({ route }) => ({ title: route.params.label })}
      />
      <BrowseStack.Screen
        name="BrowseArtworks"
        component={BrowseArtworksScreen}
        options={({ route }) => ({ title: route.params.label })}
      />
      <BrowseStack.Screen
        name="ArtworkDetail"
        component={ArtworkDetailScreen}
        options={{ title: 'Artwork' }}
      />
    </BrowseStack.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.gold,
          tabBarInactiveTintColor: '#9AA39C',
        }}
      >
        <Tab.Screen
          name="PathTab"
          component={PathStackNavigator}
          options={{
            title: 'Path',
            tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="BrowseTab"
          component={BrowseStackNavigator}
          options={{
            title: 'Browse',
            tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
