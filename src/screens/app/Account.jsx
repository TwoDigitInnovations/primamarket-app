import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { ChevronLeftIcon, ChevronRightIcon, UserIcon } from 'react-native-heroicons/outline';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Api } from '../../Helper/Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LanguageModal from '../../components/LanguageModal';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { SafeAreaView } from 'react-native-safe-area-context';


const AccountScreen = () => {
  const navigation = useNavigation();
  const { logout, userInfo } = useAuth();
  const { t } = useTranslation();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuItems = [
    { id: 1, title: t('my_orders'), hasArrow: true },
    {
      id: 2,
      title: t('change_language'),
      subtitle: currentLanguage === 'en' ? t('english') : t('spanish'),
      hasArrow: true,
      onPress: () => setLanguageModalVisible(true)
    },
    {
      id: 3,
      title: t('help_center'),
      hasArrow: true,
      onPress: () => navigation.navigate('HelpCenter')
    },
    { id: 4, title: t('delete_account'), hasArrow: true },
    { id: 5, title: t('log_out'), hasArrow: true },
  ];

  // Load saved language on component mount
  React.useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('@app_language');
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const handleLanguageSelect = async (language) => {
    try {
      await AsyncStorage.setItem('@app_language', language.code);
      setCurrentLanguage(language.code);
      i18n.changeLanguage(language.code);
      setLanguageModalVisible(false);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true);
  };

  const handleFirstConfirm = () => {
    setShowDeleteConfirm(false);
    setShowFinalConfirm(true);
  };

  const handleFinalConfirm = async () => {
    setShowFinalConfirm(false);
    try {
      // Call your delete account API here
      // await Api.delete('/delete-account');
      await logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      // You might want to show an error toast or message here
    }
  };

  const handleMenuPress = async (item) => {
    if (item.onPress) {
      item.onPress();
      return;
    }

    if (item.title === t('log_out')) {
      setShowLogoutConfirm(true);
    } else if (item.title === t('my_orders')) {
      navigation.navigate('Orders');
    } else if (item.title === t('delete_account')) {
      handleDeleteAccount();
    } else {
      console.log(`Pressed: ${item.title}`);
    }
  };

  // Debug log to check userInfo
  console.log('User Info in Account:', userInfo);
  const userData = userInfo?.data || userInfo; // Handle both nested and flat structures

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />

      {/* Header */}
      <View className="bg-[#0B051D] px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <ChevronLeftIcon size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">{t('my_account')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        {/* Profile Section */}
        <View className="flex-row items-center mb-5">
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            className="w-16 h-16 rounded-full items-center justify-center mr-4 overflow-hidden border-2 border-slate-200"
          >
            {userData?.profilePicture ? (
              <Image
                source={{
                  uri: userData.profilePicture.startsWith('http')
                    ? userData.profilePicture
                    : `data:image/jpeg;base64,${userData.profilePicture}`
                }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
              />
            ) : (
              <View className="w-full h-full bg-[#0B051D] items-center justify-center">
                <UserIcon size={28} color="white" />
              </View>
            )}
          </TouchableOpacity>
          <View>
            <Text className="text-gray-900 text-xl font-semibold">
              {userData?.firstName} {userData?.lastName}
            </Text>
            <Text className="text-gray-600 text-base">{userData?.email}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="space-y-6">
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleMenuPress(item)}
              className="bg-white rounded-lg p-5 my-2 flex-row items-center justify-between shadow-sm border border-gray-100"
              activeOpacity={0.7}
            >
              <View className="flex-1">
                <Text className="text-slate-800 text-base font-medium">
                  {item.title}
                </Text>
                {item.subtitle && (
                  <Text className="text-gray-500 text-sm mt-1">
                    {item.subtitle}
                  </Text>
                )}
              </View>
              {item.hasArrow && (
                <ChevronRightIcon size={20} color="black" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <LanguageModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        onSelectLanguage={handleLanguageSelect}
        currentLanguage={currentLanguage}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutConfirm}
        title={t('log_out')}
        message={t('confirm_logout')}
        confirmText={t('log_out')}
        cancelText={t('cancel')}
        onConfirm={logout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Delete Account Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteConfirm}
        title={t('delete_account')}
        message={t('confirm_delete_account')}
        confirmText={t('proceed')}
        cancelText={t('cancel')}
        onConfirm={handleFirstConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        type="default"
      />

      {/* Final Confirmation Modal */}
      <ConfirmationModal
        visible={showFinalConfirm}
        title={t('are_you_sure')}
        message={t('delete_account_warning')}
        confirmText={t('yes_delete')}
        cancelText={t('no')}
        onConfirm={handleFinalConfirm}
        onCancel={() => setShowFinalConfirm(false)}
        type="danger"
      />
    </View>
  );

};

export default AccountScreen;