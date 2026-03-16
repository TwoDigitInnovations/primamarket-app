import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import { ChevronLeftIcon, UserIcon, XMarkIcon, CameraIcon } from 'react-native-heroicons/outline';
import { useNavigation } from '@react-navigation/native';
import { GetApi, Put, UploadFile } from '../../Helper/Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';


const ProfileScreen = () => {
  const navigation = useNavigation();
  const { userToken, userInfo, updateUserInfo } = useAuth();
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    // Debug: Check what's in AsyncStorage
    const debugStorage = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        if (isMounted) {
          console.log('=== Profile Screen Debug ===');
          console.log('Token in storage:', token ? 'EXISTS' : 'MISSING');
          console.log('UserInfo in storage:', userInfoStr ? 'EXISTS' : 'MISSING');
          console.log('UserInfo from context:', userInfo ? 'EXISTS' : 'MISSING');
          console.log('===========================');
        }
      } catch (error) {
        console.error('Debug storage error:', error);
      }
    };
    
    debugStorage();
    if (isMounted) {
      fetchProfile();
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchProfile = async () => {
    try {
      console.log('1. Starting to fetch profile...');
      setIsLoading(true);

      // Use userInfo from AuthContext first
      if (userInfo) {
        console.log('2. Using userInfo from AuthContext');
        setFirstName(userInfo.firstName || '');
        setLastName(userInfo.lastName || '');
        setEmail(userInfo.email || '');
        if (userInfo.profilePicture) {
          setProfileImage(userInfo.profilePicture);
        }
      } else {
        // Fallback to AsyncStorage
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        console.log('3. UserInfo from storage:', userInfoStr ? 'Found' : 'Not found');

        if (!userInfoStr) {
          console.log('4. No user info found');
          Alert.alert(t('error'), 'Please login again');
          return;
        }

        const userData = JSON.parse(userInfoStr);
        console.log('5. User data parsed:', userData);
        
        setFirstName(userData.firstName || '');
        setLastName(userData.lastName || '');
        setEmail(userData.email || '');
        if (userData.profilePicture) {
          setProfileImage(userData.profilePicture);
        }
      }

      // Skip API call if we already have data from context
      // API call is optional and only for refreshing data
      console.log('6. Profile loaded from context/cache successfully');
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      Alert.alert(t('error'), error.message || t('failed_load_profile'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async () => {
    try {
      const options = {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
      };

      const result = await ImagePicker.launchImageLibrary(options);

      if (result.didCancel) {
        console.log('User cancelled image picker');
      } else if (result.error) {
        console.log('ImagePicker Error: ', result.error);
        Alert.alert('Error', 'Failed to pick image. Please try again.');
      } else {
        const source = { uri: result.assets[0].uri };
        setProfileImage(source.uri);

        // Upload the image to the server
        await uploadProfileImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadProfileImage = async (imageData) => {
    try {
      setIsUpdating(true);

      // Check if token exists
      const authToken = await AsyncStorage.getItem('userToken');
      if (!authToken) {
        Alert.alert('Error', 'Please login again to update profile picture');
        return;
      }

      // Create form data
      const formData = new FormData();

      // Get file extension from URI or default to jpg
      const fileExt = imageData.uri.split('.').pop();
      const fileName = `profile-${Date.now()}.${fileExt || 'jpg'}`;

      // Create file object with the correct format for React Native
      const file = {
        uri: imageData.uri,
        type: imageData.type || `image/${fileExt || 'jpeg'}`,
        name: fileName,
      };

      // Append the file to form data
      formData.append('profileImage', file);

      // Make sure to use the correct endpoint
      const response = await fetch(`${API_BASE_URL}auth/uploadProfileImage`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload profile image');
      }

      // Update the profile picture in the UI
      setProfileImage(data.profilePicture);

      // Update the user info in context and AsyncStorage
      const storedUserInfo = JSON.parse(await AsyncStorage.getItem('userInfo'));
      if (storedUserInfo) {
        storedUserInfo.profilePicture = data.profilePicture;
        await AsyncStorage.setItem('userInfo', JSON.stringify(storedUserInfo));
        updateUserInfo(storedUserInfo); // Update context to reflect in Account.jsx and Header
      }

      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      Alert.alert('Error', error.message || 'Failed to update profile picture');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditProfile = async () => {
    if (isEditing) {
      try {
        setIsUpdating(true);

        const updateData = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim()
        };

        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}auth/updateProfile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to update profile');
        }

        // Update context with new data
        const updatedUserInfo = {
          ...userInfo,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim()
        };
        updateUserInfo(updatedUserInfo);
        
        Alert.alert(t('success'), t('profile_updated_successfully'));
        setIsEditing(false);
      } catch (error) {
        console.error('Error updating profile:', error);
        Alert.alert(t('error'), error.message || t('failed_update_profile'));
      } finally {
        setIsUpdating(false);
      }
    }
    setIsEditing(!isEditing);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('error'), t('please_fill_all_fields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('error'), t('passwords_not_match'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('error'), 'Password must be at least 6 characters long');
      return;
    }

    try {
      setIsUpdating(true);

      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      console.log('Token for password change:', token ? 'Found' : 'Not found');

      if (!token) {
        Alert.alert(t('error'), 'Please login again to change password');
        navigation.navigate('Login');
        return;
      }

      const response = await Put('auth/updatePassword', {
        currentPassword,
        newPassword,
      });

      if (response && response.status) {
        Alert.alert(t('success'), t('password_updated_successfully'));
        setChangePasswordModalVisible(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        throw new Error(response?.message || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      const errorMsg = error.response?.data?.message || error.message || t('failed_update_password');
      Alert.alert(t('error'), errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />

      {/* Header */}
      <View className="bg-[#ff66c4] px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleBack} className="mr-4">
            <ChevronLeftIcon size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-black text-xl font-semibold">{t('profile')}</Text>
          <View className="flex-1" />
          <TouchableOpacity onPress={handleEditProfile} disabled={isUpdating}>
            {isUpdating ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-black font-medium">
                {isEditing ? t('save') : t('edit')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        {/* Profile Section */}
        <View className="items-center mt-6 mb-8">
          <TouchableOpacity
            className="relative"
            onPress={handleImageUpload}
            disabled={!isEditing}
          >
            <View className="w-32 h-32 bg-gray-200 rounded-full items-center justify-center overflow-hidden">
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <UserIcon size={60} color="#6b7280" />
              )}
            </View>
            {isEditing && (
              <View className="absolute bottom-0 right-0 bg-[#0B051D] p-2 rounded-full">
                <CameraIcon size={20} color="white" />
              </View>
            )}
          </TouchableOpacity>
          <View className="items-center mt-3">
            <Text className="text-gray-900 text-xl font-semibold text-center">
              {`${firstName} ${lastName}`.trim() || 'User'}
            </Text>
            <Text className="text-gray-600 text-base text-center mt-1">{email}</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#3B82F6" className="my-8" />
        ) : (
          <View className="space-y-4">
            {/* First Name Field */}
            <View className="mb-4">
              <Text className="text-gray-700 text-base font-medium mb-2">{t('first_name')}</Text>
              <View className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  className="text-gray-900 text-base"
                  placeholder={t('enter_first_name')}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  editable={isEditing}
                />
              </View>
            </View>

            {/* Last Name Field */}
            <View className="mb-4">
              <Text className="text-gray-700 text-base font-medium mb-2">{t('last_name')}</Text>
              <View className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  className="text-gray-900 text-base"
                  placeholder={t('enter_last_name')}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  editable={isEditing}
                />
              </View>
            </View>

            {/* Email Field */}
            <View className="mb-4">
              <Text className="text-gray-700 text-base font-medium mb-2">{t('email')}</Text>
              <View className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  className="text-gray-900 text-base"
                  placeholder={t('enter_email')}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={isEditing}
                />
              </View>
            </View>

            {/* Change Password Button */}
            <TouchableOpacity
              onPress={() => setChangePasswordModalVisible(true)}
              className="mt-8 bg-[#E58F14] py-3 rounded-lg items-center"
              activeOpacity={0.8}
            >
              <Text className="text-white font-medium">{t('change_password')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={isChangePasswordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isUpdating && setChangePasswordModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900">{t('change_password')}</Text>
              <TouchableOpacity
                onPress={() => !isUpdating && setChangePasswordModalVisible(false)}
                disabled={isUpdating}
              >
                <XMarkIcon size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-gray-600 text-sm font-medium mb-1">{t('current_password')}</Text>
                <TextInput
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
                  className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 text-gray-900"
                  secureTextEntry
                  placeholder={t('enter_current_password')}
                  placeholderTextColor="#9CA3AF"
                  editable={!isUpdating}
                />
              </View>

              <View>
                <Text className="text-gray-600 text-sm font-medium mb-1">{t('new_password')}</Text>
                <TextInput
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                  className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 text-gray-900"
                  secureTextEntry
                  placeholder={t('enter_new_password')}
                  placeholderTextColor="#9CA3AF"
                  editable={!isUpdating}
                />
              </View>

              <View>
                <Text className="text-gray-600 text-sm font-medium mb-1">{t('confirm_new_password')}</Text>
                <TextInput
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                  className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 text-gray-900"
                  secureTextEntry
                  placeholder={t('confirm_new_password')}
                  placeholderTextColor="#9CA3AF"
                  editable={!isUpdating}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={isUpdating}
              className="bg-[#E58F14] py-3 rounded-lg items-center justify-center"
              activeOpacity={0.8}
            >
              {isUpdating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-medium">{t('update_password')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ProfileScreen;