import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AnalysisResult } from '../services/api';

import HomeScreen          from '../screens/HomeScreen';
import UploadScreen        from '../screens/UploadScreen';
import PinsScreen          from '../screens/PinsScreen';
import BoardPinsScreen     from '../screens/BoardPinsScreen';
import PinterestAuthScreen from '../screens/PinterestAuthScreen';
import AnalyzingScreen     from '../screens/AnalyzingScreen';
import ResultsScreen       from '../screens/ResultsScreen';

export type RootStackParamList = {
  Home: undefined;
  Upload: { categoryKey: string };
  Pins: { categoryKey: string; photoKeys: string[]; anglesCovered: string[] };
  BoardPins: { boardId: string; boardName: string; onSelect: (urls: string[]) => void };
  PinterestAuth: undefined;
  Analyzing: { categoryKey: string; photoKeys: string[]; pinImageUrls: string[]; anglesCovered: string[] };
  Results: { categoryKey: string; results: AnalysisResult[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home"          component={HomeScreen} />
      <Stack.Screen name="Upload"        component={UploadScreen} />
      <Stack.Screen name="Pins"          component={PinsScreen} />
      <Stack.Screen name="BoardPins"     component={BoardPinsScreen} />
      <Stack.Screen name="PinterestAuth" component={PinterestAuthScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Analyzing"     component={AnalyzingScreen} />
      <Stack.Screen name="Results"       component={ResultsScreen} />
    </Stack.Navigator>
  );
}
