import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { EyeIcon, EyeSlashIcon } from 'react-native-heroicons/outline';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import COLORS from '../../constants/colors';

const SignupScreen = () => {
  const navigation = useNavigation();
  const { register } = useAuth();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('user');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!firstName || !lastName || !email || !password) {
      setError(t('all_fields_required'));
      return false;
    }

    if (password.length < 6) {
      setError(t('password_min_length'));
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setError('');
    setIsLoading(true);

    try {
      // Format the data exactly as expected by the API
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: activeTab  // Use the selected tab as the role
      };

      console.log('Sending registration data:', userData);
      const result = await register(userData);
      console.log('Registration result:', result);

      if (result.success) {
        // If seller registration, navigate to login with a special flag
        if (userData.role === 'seller') {
          Alert.alert(
            t('success'),
            t('seller_account_created'),
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.replace('Login', {
                    email: userData.email,
                    message: 'Please login to complete your seller setup.',
                    isSeller: true
                  });
                }
              }
            ]
          );
        } else {
          // For regular users, show standard success message
          Alert.alert(
            t('success'),
            result.message || t('registration_successful'),
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.replace('Login', {
                    email: userData.email,
                    message: 'Registration successful! Please login.'
                  });
                }
              }
            ]
          );
        }
      } else {
        // Show more detailed error message
        const errorMsg = result.error || 'Registration failed. Please check your details and try again.';
        setError(errorMsg);
        Alert.alert(t('registration_failed'), errorMsg);
      }
    } catch (err) {
      console.error('Signup error:', err);
      const errorMsg = err.message || 'An unexpected error occurred. Please try again.';
      setError(errorMsg);
      Alert.alert(t('error'), errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <View className="flex-1 justify-center px-6">
        {/* Logo */}
        <View className="items-center mb-8">
          <Image
            source={require('../../assets/new1.png')}
            className="w-56 h-20 "
            resizeMode="cover"
          />
        </View>

        {/* Header */}
        <View className="mb-6">
          {/* <Text className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            {t('create_account')}
          </Text> */}

          {/* Tabs */}
          <View className="flex-row justify-center mb-6">
            <TouchableOpacity
              className={`px-7 py-2.5 rounded-l-full ${activeTab === 'user' ? 'bg-[#0B051D]' : 'bg-gray-200'}`}
              onPress={() => setActiveTab('user')}
            >
              <Text className={`text-base font-medium ${activeTab === 'user' ? 'text-white' : 'text-gray-600'}`}>
                {t('user')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-7 py-2.5 rounded-r-full ${activeTab === 'seller' ? 'bg-[#0B051D]' : 'bg-gray-200'}`}
              onPress={() => setActiveTab('seller')}
            >
              <Text className={`text-base font-medium ${activeTab === 'seller' ? 'text-white' : 'text-gray-600'}`}>
                {t('seller')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-gray-600 text-sm text-center mb-2">
            {activeTab === 'user' ? t('sign_up_explore') : t('create_seller_account')}
          </Text>
        </View>

        {/* Form */}
        {error ? (
          <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        ) : null}

        <View className="space-y-4">
          {/* First Name */}
          <View>
            <TextInput
              className="w-full py-4 px-0 text-gray-900 text-base border-0 border-b border-gray-300 bg-transparent focus:border-gray-500 focus:outline-none"
              placeholder={t('first_name')}
              placeholderTextColor="#9ca3af"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>

          {/* Last Name */}
          <View>
            <TextInput
              className="w-full py-4 px-0 text-gray-900 text-base border-0 border-b border-gray-300 bg-transparent focus:border-gray-500 focus:outline-none"
              placeholder={t('last_name')}
              placeholderTextColor="#9ca3af"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>

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
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              className="absolute right-0 top-4 p-1"
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

        {/* Create Account Button */}
        {error ? (
          <Text className="text-red-500 text-sm mb-2 text-center">{error}</Text>
        ) : null}

        <Text className="text-gray-600 text-sm text-center pt-10  px-4">
          {t('by_clicking_signup')}{" "}
          <Text
            style={{ color: COLORS.lightPink }}
            className=" font-bold"
            onPress={() => Linking.openURL('https://main.d36jzzlm0f9au8.amplifyapp.com/terms')}
          >
            {t('terms_conditions')}
          </Text>{" "}
          {t('and')}{" "}
          <Text
            style={{ color: COLORS.lightPink }}   className=" font-bold"
            onPress={() => Linking.openURL('https://main.d36jzzlm0f9au8.amplifyapp.com/privacy-policy')}
          >
            {t('privacy_policy')}
          </Text>
        </Text>
        <TouchableOpacity style={{ backgroundColor: COLORS.dark }}
          className="w-full  py-4 rounded-lg items-center mt-4 shadow-sm"
          onPress={handleSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-center text-base font-medium">
              {t('create_account')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600 text-base">
            {t('already_have_account')}{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: COLORS.lightPink }} className=" text-base font-medium">
              {t('log_in')}?
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTab: {
    backgroundColor: '#E58F14',
  },
  inactiveTab: {
    backgroundColor: '#E5E7EB',
  },
  activeText: {
    color: 'white',
  },
  inactiveText: {
    color: '#4B5563',
  },
});

export default SignupScreen;