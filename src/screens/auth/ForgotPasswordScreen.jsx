import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,

  StatusBar,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { EyeIcon, EyeSlashIcon } from 'react-native-heroicons/outline';
import { Post } from '../../Helper/Service';
import { useTranslation } from 'react-i18next';
import COLORS from '../../constants/colors';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert(t('error'), t('please_enter_email'));
      return;
    }

    try {
      setLoading(true);
      const response = await Post('auth/sendOTP', { email });
      if (response) {
        Alert.alert(t('success'), t('otp_sent'));
        setStep(2);
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert(t('error'), t('enter_valid_otp'));
      return;
    }

    try {
      setLoading(true);
      const response = await Post('auth/verifyOTP', {
        email,
        otp
      });

      if (response) {
        Alert.alert(t('success'), t('otp_verified'));
        setStep(3);
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('invalid_otp'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert(t('error'), t('passwords_not_match'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('error'), t('password_min_length'));
      return;
    }

    try {
      setLoading(true);
      const response = await Post('auth/resetPassword', {
        email,
        otp,
        newPassword
      });

      if (response) {
        Alert.alert(t('success'), t('password_reset_success'), [
          { text: t('ok'), onPress: () => navigation.navigate('Login') }
        ]);
      }
    } catch (error) {
      Alert.alert(t('error'), error.message || t('failed_reset_password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <View className="flex-1 justify-center px-6">

        <View className="items-center mb-8">
          <Image
            source={require('../../assets/new1.png')}
            className="w-56 h-20"
            resizeMode="cover"
          />
        </View>


        <View className="mb-8">
          {/* <Text className="text-2xl font-semibold text-gray-900 mb-2 text-center">
            {step === 1 ? t('forgot_password') : step === 2 ? t('enter_otp') : t('reset_password')}
          </Text> */}
          <Text className="text-gray-600 text-base text-center">
            {step === 1
              ? t('enter_email_otp')
              : step === 2
                ? t('enter_6digit_otp')
                : t('enter_new_password')}
          </Text>
        </View>

        {step === 1 && (
          <>

            <View className="mb-6">
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


            <TouchableOpacity
             style={{ backgroundColor: COLORS.dark }}  className=" rounded-lg py-4 mt-4 shadow-sm"
              activeOpacity={0.9}
              onPress={handleSendOtp}
            >
              <Text className="text-white text-center text-base font-medium">
                {t('send_otp')}
              </Text>
            </TouchableOpacity>
          </>
        )} 

        {step === 2 && (
          <>

            <View className="mb-6">
              <TextInput
                className="w-full py-4 px-0 text-gray-900 text-base border-0 border-b border-gray-300 bg-transparent focus:border-gray-500 focus:outline-none text-center text-xl"
                placeholder={t('enter_otp')}
                placeholderTextColor="#9ca3af"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>


            <TouchableOpacity
           
              className=" rounded-lg py-4 mt-4 shadow-sm"
              activeOpacity={0.9}
              onPress={handleVerifyOtp}
              disabled={otp.length !== 6}
              style={{ opacity: otp.length === 6 ? 1 : 0.5, backgroundColor: COLORS.dark  }}
            >
              <Text className="text-white text-center text-base font-medium">
                {t('verify_otp')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-4"
              onPress={() => setStep(1)}
            >
              <Text style={{ color: COLORS.lightPink }} className=" text-center text-sm">
                {t('back_to_email')}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>

            <View className="mb-6">
              <View className="relative">
                <TextInput
                  className="w-full py-4 px-0 pr-10 text-gray-900 text-base border-0 border-b border-gray-300 bg-transparent focus:border-gray-500 focus:outline-none"
                  placeholder={t('new_password')}
                  placeholderTextColor="#9ca3af"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
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

              <View className="relative mt-6">
                <TextInput
                  className="w-full py-4 px-0 pr-10 text-gray-900 text-base border-0 border-b border-gray-300 bg-transparent focus:border-gray-500 focus:outline-none"
                  placeholder={t('confirm_new_password')}
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  className="absolute right-0 top-4 p-1"
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon size={20} color="#6b7280" />
                  ) : (
                    <EyeIcon size={20} color="#6b7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: COLORS.dark }} className=" rounded-lg py-4 mt-4 shadow-sm"
              activeOpacity={0.9}
              onPress={handleResetPassword}
            >
              <Text className="text-white text-center text-base font-medium">
                {t('reset_password')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-4"
              onPress={() => setStep(2)}
            >
              <Text style={{ color: COLORS.lightPink }} className=" text-center text-sm">
                {t('back_to_otp')}
              </Text>
            </TouchableOpacity>
          </>
        )}


        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600 text-base">
            {t('remember_password')}{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: COLORS.lightPink }} className=" text-base font-medium">
              {t('log_in')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ForgotPasswordScreen;