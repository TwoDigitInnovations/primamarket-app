import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, BackHandler, Modal, StyleSheet, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { PhoneIcon, EnvelopeIcon, ChevronLeftIcon } from 'react-native-heroicons/outline';
import { useNavigation } from '@react-navigation/native';
import { Post } from '../../Helper/Service';
import { useTranslation } from 'react-i18next';

const HelpCenter = ({ navigation, onBack }) => {
  const { t } = useTranslation();
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Auto close the success popup after 3 seconds
  useEffect(() => {
    let timer;
    if (showSuccessPopup) {
      timer = setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showSuccessPopup]);
  
  // Safely handle navigation with multiple fallbacks
  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation && navigation.goBack) {
      navigation.goBack();
    } else {
      try {
        const nav = useNavigation();
        nav.goBack();
      } catch (error) {
        // Fallback to Android back handler
        BackHandler.exitApp();
      }
    }
  };
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    if (!formData.name || !formData.email || !formData.phone) {
      Alert.alert(t('error'), t('contact_fill_all_required_fields'));
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        name: formData.name,
        email: formData.email.toLowerCase(),
        phone: formData.phone,
        message: formData.message
      };

      const response = await Post('contact', data);
      
      if (response) {
        setShowSuccessPopup(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          message: ''
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert(t('error'), error?.message || t('contact_something_went_wrong'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with better spacing */}
     

       <View className="bg-[#0B051D] px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <ChevronLeftIcon size={24} color="white" />
          </TouchableOpacity>
        <Text className="text-xl font-semibold text-white">{t('help_center')}</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            className="flex-1 px-6"
            contentContainerStyle={{ paddingVertical: 24, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <View className="space-y-6">
            {/* Contact Information - Simplified */}
            <View className="space-y-4">
              {/* Call to Us - Simple */}
              <View className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 bg-[#12344D] rounded-full items-center justify-center mr-3">
                    <PhoneIcon size={20} color="white" />
                  </View>
                  <Text className="text-lg font-semibold text-gray-900">{t('contact_call_to_us')}</Text>
                </View>
                
                <Text className="text-sm text-gray-600 mb-3">
                  {t('contact_available_24_7')}
                </Text>
                
                <Text className="text-sm">
                  <Text className="font-medium">{t('contact_phone')}: </Text>
                  <Text className="text-[#12344D] font-semibold">+8801611112222</Text>
                </Text>
              </View>

              {/* Write to Us - Simple */}
              <View className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 bg-[#12344D] rounded-full items-center justify-center mr-3">
                    <EnvelopeIcon size={20} color="white" />
                  </View>
                  <Text className="text-lg font-semibold text-gray-900">{t('contact_write_to_us')}</Text>
                </View>
                
                <Text className="text-sm text-gray-600 mb-3">
                  {t('contact_fill_form_contact_within_24_hours')}
                </Text>
                
                <Text className="text-sm">
                  <Text className="font-medium">{t('contact_emails')}: </Text>
                  <Text className="text-[#12344D] font-semibold">primamarket469@gmail.com</Text>
                </Text>
              </View>
            </View>

            {/* Contact Form */}
            <View className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <TextInput
                placeholder={t('contact_your_name_placeholder')}
                placeholderTextColor="#9CA3AF"
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                className="w-full px-4 py-4 text-gray-800 border border-gray-300 rounded-xl bg-gray-50 mb-5"
                style={{ fontSize: 16 }}
                returnKeyType="next"
                blurOnSubmit={false}
              />
              
              <TextInput
                placeholder={t('contact_your_email_placeholder')}
                placeholderTextColor="#9CA3AF"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                className="w-full px-4 py-4 text-gray-800 border border-gray-300 rounded-xl bg-gray-50 mb-5"
                style={{ fontSize: 16 }}
                returnKeyType="next"
                blurOnSubmit={false}
              />
              
              <TextInput
                placeholder={t('contact_your_phone_placeholder')}
                placeholderTextColor="#9CA3AF"
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                keyboardType="phone-pad"
                className="w-full px-4 py-4 text-gray-800 border border-gray-300 rounded-xl bg-gray-50 mb-5"
                style={{ fontSize: 16 }}
                returnKeyType="next"
                blurOnSubmit={false}
              />
              
              <TextInput
                placeholder={t('contact_your_message_placeholder')}
                placeholderTextColor="#9CA3AF"
                value={formData.message}
                onChangeText={(text) => handleInputChange('message', text)}
                multiline={true}
                numberOfLines={4}
                className="w-full px-4 py-4 text-gray-800 border border-gray-300 rounded-xl bg-gray-50 mb-6"
                style={{ fontSize: 16, height: 100, textAlignVertical: 'top' }}
                returnKeyType="done"
                blurOnSubmit={true}
              />

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading}
                className="bg-[#0B051D] py-4 rounded-xl items-center justify-center shadow-sm"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-base">
                  {isLoading ? t('sending') : t('send_message')}
                </Text>
              </TouchableOpacity>
            </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      {/* Success Popup */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessPopup}
        onRequestClose={() => setShowSuccessPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>{t('success')}!</Text>
            <Text style={styles.modalText}>{t('contact_message_sent_successfully')}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkMark: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 0,
    lineHeight: 24,
  },
});

export default HelpCenter;