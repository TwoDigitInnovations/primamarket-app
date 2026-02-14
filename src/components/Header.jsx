import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Keyboard, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MapPin, User, Search, X } from 'react-native-feather';
import { useAuth } from '../context/AuthContext';
import { GetApi } from '../Helper/Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../config';

const Header = () => {
  const navigation = useNavigation();
  const { userToken, userInfo } = useAuth();
  const [profilePicture, setProfilePicture] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const loadProfilePicture = async () => {
      try {
        const userData = JSON.parse(await AsyncStorage.getItem('userInfo'));
        // Handle both nested (userData.data) and flat (userData) structures
        const profilePic = userData?.data?.profilePicture || userData?.profilePicture;
        if (profilePic) {
          setProfilePicture(profilePic);
        } else {
          console.log('No profile picture found in user data');
        }
      } catch (error) {
        console.error('Error loading profile picture:', error);
      }
    };

    loadProfilePicture();
  }, [userInfo]);

  const handleSearch = () => {
    const query = searchQuery.trim();
    console.log('Searching for:', query || '[empty query]');
    Keyboard.dismiss();

    // Navigate to SearchResult in the Home stack
    navigation.navigate('HomeTab', {
      screen: 'SearchResult',
      params: { query: query || '' }
    });
  };

  return (
    <View style={{ backgroundColor: COLORS.mainColor }} className=" px-4 py-3">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          {/* <MapPin width={20} height={20} color="white" /> */}
          <Text className="text-white ml-2">Hi {userInfo?.firstName}!</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (userToken) {
              navigation.navigate('MainTabs', { screen: 'Account' });
            } else {
              navigation.navigate('Login');
            }
          }}
          className="p-2"
        >
          {profilePicture ? (
            <Image
              source={{ uri: profilePicture }}
              className="w-8 h-8 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
              <User width={20} height={20} color="white" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View className="relative">
        <View className="flex-row items-center bg-white rounded-lg px-3 py-2">
          <Search width={20} height={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 text-gray-900"
            placeholder="Search for products..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} className="ml-2">
              <X width={18} height={18} color="#6b7280" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default Header;
