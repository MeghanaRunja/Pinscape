import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Spacing, Radius } from '../theme';
import { getBoardPins, Pin } from '../services/api';

type Route = RouteProp<RootStackParamList, 'BoardPins'>;

export default function BoardPinsScreen() {
  const nav = useNavigation();
  const { params } = useRoute<Route>();
  const [pins, setPins]       = useState<Pin[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBoardPins(params.boardId).then(r => { setPins(r.data.pins); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const toggle = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const confirm = () => {
    const urls = pins.filter(p => selected.has(p.id)).map(p => p.image_url);
    params.onSelect(urls);
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.back}><MaterialCommunityIcons name="arrow-left" size={22} color={Colors.gray600} /></TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{params.boardName}</Text>
        {selected.size > 0
          ? <TouchableOpacity onPress={confirm} style={s.doneBtn}><Text style={s.doneTxt}>Add {selected.size}</Text></TouchableOpacity>
          : <View style={{ width: 60 }} />}
      </View>
      {loading
        ? <View style={s.center}><ActivityIndicator size="large" color={Colors.pink400} /></View>
        : <FlatList
            data={pins}
            keyExtractor={p => p.id}
            numColumns={3}
            contentContainerStyle={{ padding: 2 }}
            columnWrapperStyle={{ gap: 2 }}
            ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
            renderItem={({ item }) => {
              const sel = selected.has(item.id);
              return (
                <TouchableOpacity style={[s.pin, sel && s.pinSel]} onPress={() => toggle(item.id)} activeOpacity={0.8}>
                  <Image source={{ uri: item.image_url }} style={s.pinImg} />
                  {sel && <View style={s.pinChk}><MaterialCommunityIcons name="check" size={12} color={Colors.white} /></View>}
                </TouchableOpacity>
              );
            }}
          />
      }
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.white },
  hdr:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderColor: Colors.gray200, gap: 10 },
  back:    { padding: 4 },
  title:   { flex: 1, fontSize: 15, fontWeight: '600' },
  doneBtn: { backgroundColor: Colors.pink400, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full },
  doneTxt: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pin:     { flex: 1/3, aspectRatio: 3/4, borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  pinSel:  { borderColor: Colors.pink400 },
  pinImg:  { width: '100%', height: '100%' },
  pinChk:  { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.pink400, alignItems: 'center', justifyContent: 'center' },
});
