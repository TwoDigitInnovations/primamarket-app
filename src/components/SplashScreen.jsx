import React from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image 
        source={require('../assets/start.png')} 
        style={styles.image} 
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default SplashScreen;
