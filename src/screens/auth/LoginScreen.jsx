import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { EyeIcon, EyeSlashIcon, ChevronDownIcon } from 'react-native-heroicons/outline';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config';
import LanguageModal from '../../components/LanguageModal';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import COLORS from '../../constants/colors';

const LoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { login, logout } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState(route.params?.email || '');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState(route.params?.message || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // Load saved language on component mount
  React.useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('@app_language');
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
        i18n.changeLanguage(savedLanguage);
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

  // Show success message if it exists in route params
  React.useEffect(() => {
    if (route.params?.message) {
      setSuccessMessage(route.params.message);
      // Clear the message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [route.params]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('please_enter_email_password'));
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      console.log('Attempting to login with:', { email });
      const result = await login(email, password, navigation);

      if (result.success) {
        const user = result.user || {};
        console.log('Login successful, user data:', JSON.stringify(user, null, 2));

        // Check if user is a seller
        if (user.role === 'seller') {
          console.log('Seller login detected, verification status:', user.status);
          
          // Normalize status to lowercase for comparison
          const normalizedStatus = (user.status || '').toLowerCase();
          
          // Check seller status
          if (normalizedStatus === 'pending' || normalizedStatus === 'active') {
            // Pending or Active seller can only access CreateStoreScreen
            console.log(`${user.status} seller, navigating to CreateStoreScreen`);
            navigation.reset({
              index: 0,
              routes: [{ name: 'CreateStore' }],
            });
          } else if (normalizedStatus === 'verified') {
            // Verified seller cannot login to mobile app
            await logout();
            Alert.alert(
              'Access Denied',
              'Sellers cannot login to the mobile app. Please visit the dashboard website to manage your products and inventory.',
              [{ text: 'OK' }]
            );
          } else {
            // Other statuses (Rejected, etc.)
            await logout();
            Alert.alert(
              'Account Not Active',
              'Your seller account is not active. Please contact support.',
              [{ text: 'OK' }]
            );
          }
          setIsLoading(false);
          return;
        }
        // For regular users
        else {
          console.log('Regular user login, navigating to MainTabs');
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = t('login_failed');

      // Handle specific error cases
      if (error.message.includes('Network Error')) {
        errorMessage = t('network_error');
      } else if (error.message.includes('401')) {
        errorMessage = t('invalid_credentials');
      } else if (error.message) {
        // Use the error message from the server if available
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content"  />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Language Selector */}
        <View className="items-end px-4 pt-2">
          <TouchableOpacity
            className="flex-row items-center border border-gray-200 rounded-full px-3 py-1.5"
            onPress={() => setLanguageModalVisible(true)}
          >
            <Text className="text-gray-700 mr-1">
              {currentLanguage === 'en' ? t('english') : t('swedish')}
            </Text>
            <ChevronDownIcon size={16} color="#4B5563" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 justify-center px-6">
          {/* Logo */}
          <View className="items-center mb-8">
            <Image
              source={require('../../assets/primalogo.png')}
              className="w-72 h-32"
              resizeMode="contain"
            />
          </View>

          {/* Header */}
          <View className="mb-8">
            {/* <Text className="text-2xl font-semibold text-gray-900 mb-2 text-center">
              {t('welcome_back')}
            </Text> */}
            <Text className="text-gray-600 text-base text-center">
              {t('sign_in_to_account')}
            </Text>
          </View>

          {/* Messages */}
          <View className="mb-6">
            {successMessage ? (
              <View className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded">
                <Text className="text-green-700">{successMessage}</Text>
              </View>
            ) : null}

            {error ? (
              <View className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded">
                <Text className="text-red-700">{error}</Text>
              </View>
            ) : null}
          </View>

          {/* Form */}
          <View className="space-y-4 mb-6">
            {/* Email */}
            <View>
              <TextInput
                className="w-full py-4 px-0 text-gray-900 text-base border-0 border-b border-gray-300 bg-transparent focus:border-gray-500 focus:outline-none"
                placeholder={t('email')}
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View className="relative">
              <TextInput
                className="w-full py-4 px-0 pr-10 text-gray-900 text-base border-0 border-b border-gray-300 bg-transparent focus:border-gray-500 focus:outline-none"
                placeholder={t('password')}
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                className="absolute right-0 top-4"
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon size={20} color="#6b7280" />
                ) : (
                  <EyeIcon size={20} color="#6b7280" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password Link */}
          <View className="mb-8">
            <TouchableOpacity
              className="self-end"
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={{ color: COLORS.lightPink }} className="text-sm font-medium">{t('forgot_password')}</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            style={{ backgroundColor: COLORS.dark }}
            className="w-full py-4 rounded-lg items-center shadow-sm"
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white text-base font-medium">
                {t('sign_in')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Sign up link */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-600 text-base">
              {t('dont_have_account')}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={{ color: COLORS.lightPink }} className="text-base font-medium">
                {t('sign_up')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <LanguageModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        onSelectLanguage={handleLanguageSelect}
        currentLanguage={currentLanguage}
      />
    </View>
  );
};

export default LoginScreen