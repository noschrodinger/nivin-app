import { Ionicons, Octicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 0,
          elevation: 0,
          height: 65,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#808080',
        tabBarLabelStyle: { fontSize: 10, fontWeight: 'bold' }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Octicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />,
        }}
      />
      {/* Señor, he desactivado temporalmente la pestaña de Perfil.
        Descomente este bloque ÚNICAMENTE cuando haya creado el archivo "profile.tsx" en la carpeta (tabs).
      */}
      {/* <Tabs.Screen
        name="profile"
        options={{
          title: 'Mi Nivin',
          tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={26} color={color} />,
        }}
      /> */}
    </Tabs>
  );
}