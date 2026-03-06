import { useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect } from "react";
import { BackHandler, StatusBar, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

export default function PlayerScreen() {

  const { url } = useLocalSearchParams();
  const embedUrl = decodeURIComponent(url as string);

  useEffect(() => {

    StatusBar.setHidden(true);

    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    );

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true
    );

    return () => {

      StatusBar.setHidden(false);
      ScreenOrientation.unlockAsync();
      backHandler.remove();

    };

  }, []);

  const injectedJS = `
  (function(){

    // BLOQUEAR POPUPS
    window.open = function(){ return null };

    // BLOQUEAR REDIRECCIONES
    document.addEventListener('click', function(e){

      const el = e.target.closest('a');

      if(el && el.href){
        e.preventDefault();
        e.stopPropagation();
      }

    }, true);

    // REMOVER ANUNCIOS
    const removeAds = () => {

      const selectors = [
        'iframe[src*="ads"]',
        'iframe[src*="pop"]',
        'iframe[src*="banner"]',
        '[class*="ads"]',
        '[id*="ads"]',
        '[class*="banner"]'
      ];

      selectors.forEach(sel => {

        document.querySelectorAll(sel).forEach(el => {
          el.remove();
        });

      });

    };

    setInterval(removeAds, 1000);

  })();
  `;

  return (

    <View style={styles.container}>

      <WebView
        source={{ uri: embedUrl }}

        javaScriptEnabled

        injectedJavaScriptBeforeContentLoaded={injectedJS}

        onShouldStartLoadWithRequest={(request) => {

          if (!request.url.startsWith(embedUrl)) {
            console.log("Bloqueado:", request.url);
            return false;
          }

          return true;

        }}

        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}

      />

    </View>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "black"
  }

});