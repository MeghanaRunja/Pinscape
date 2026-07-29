import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AnalysisResult } from '../services/api';
import { CategoryKey } from '../config/categories';

import HomeScreen          from '../screens/HomeScreen';
import UploadScreen        from '../screens/UploadScreen';
import PinsScreen          from '../screens/PinsScreen';
import BoardPinsScreen     from '../screens/BoardPinsScreen';
import PinterestAuthScreen from '../screens/PinterestAuthScreen';
import AnalyzingScreen     from '../screens/AnalyzingScreen';
import ResultsScreen       from '../screens/ResultsScreen';

export type RootStackParamList = {
  Home:          undefined;
  // CategoryKey (not bare string) so TypeScript catches navigation calls
  // with unknown category names at compile time rather than crashing at
  // runtime when CATEGORIES[key] returns undefined.
  Upload:        { categoryKey: CategoryKey };
  Pins: {
    categoryKey:   CategoryKey;
    photoKeys:     string[];
    anglesCovered: string[];
  };
  // onSelect is NOT in params — BoardPinsScreen calls back via the
  // __pinscapeOnBoardPinsSelected global ref set by PinsScreen to avoid
  // passing a function through React Navigation (non-serialisable warning).
  BoardPins: {
    boardId:   string;
    boardName: string;
  };
  PinterestAuth: undefined;
  Analyzing: {
    categoryKey:   CategoryKey;
    photoKeys:     string[];
    pinImageUrls:  string[];   // storage keys OR https:// Pinterest CDN URLs — never file://
    anglesCovered: string[];
  };
  Results: {
    categoryKey: CategoryKey;
    results:     AnalysisResult[];
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home"          component={HomeScreen} />
      <Stack.Screen name="Upload"        component={UploadScreen} />
      <Stack.Screen name="Pins"          component={PinsScreen} />
      <Stack.Screen name="BoardPins"     component={BoardPinsScreen} />
      <Stack.Screen name="PinterestAuth" component={PinterestAuthScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Analyzing"     component={AnalyzingScreen} />
      <Stack.Screen name="Results"       component={ResultsScreen} />
    </Stack.Navigator>
  );
}
