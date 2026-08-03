import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AnalysisResult } from '../services/api';

import HomeScreen              from '../screens/HomeScreen';
import UploadScreen            from '../screens/UploadScreen';
import PinsScreen              from '../screens/PinsScreen';
import BoardPinsScreen         from '../screens/BoardPinsScreen';
import PinterestAuthScreen     from '../screens/PinterestAuthScreen';
import PinterestBrowserScreen  from '../screens/PinterestBrowserScreen';
import AnalyzingScreen         from '../screens/AnalyzingScreen';
import ResultsScreen           from '../screens/ResultsScreen';

export type RootStackParamList = {
  Home:              undefined;
  Upload:            { categoryKey: stringategoryKey };
  Pins:              { categoryKey: stringategoryKey; photoKeys: string[]; anglesCovered: string[] };
  // onSelect removed — BoardPinsScreen calls back via __pinscapeOnBoardPinsSelected global ref
  BoardPins:         { boardId: string; boardName: string };
  PinterestAuth:     undefined;
  // Full pinterest.com WebView — no OAuth needed, user just browses and taps pins
  PinterestBrowser:  undefined;
  Analyzing:         { categoryKey: stringategoryKey; photoKeys: string[]; pinImageUrls: string[]; anglesCovered: string[] };
  Results:           { categoryKey: stringategoryKey; results: AnalysisResult[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home"             component={HomeScreen} />
      <Stack.Screen name="Upload"           component={UploadScreen} />
      <Stack.Screen name="Pins"             component={PinsScreen} />
      <Stack.Screen name="BoardPins"        component={BoardPinsScreen} />
      <Stack.Screen name="PinterestAuth"    component={PinterestAuthScreen}    options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="PinterestBrowser" component={PinterestBrowserScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Analyzing"        component={AnalyzingScreen} />
      <Stack.Screen name="Results"          component={ResultsScreen} />
    </Stack.Navigator>
  );
}
