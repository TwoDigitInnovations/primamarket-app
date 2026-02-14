import React, { useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { ArrowLeftIcon, ArrowUpTrayIcon, BuildingOfficeIcon, DocumentIcon, EnvelopeIcon, GlobeAltIcon, MapPinIcon, PhoneIcon, PhotoIcon, UserIcon } from 'react-native-heroicons/outline';
import { Api, ApiFormData } from '../../Helper/Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../context/AuthContext';
import COLORS from '../../constants/colors';

// Static list of countries with emojis
const countryList = [
  { code: 'US', name: 'United States', emoji: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', emoji: '🇬🇧' },
  { code: 'CA', name: 'Canada', emoji: '🇨🇦' },
  { code: 'AU', name: 'Australia', emoji: '🇦🇺' },
  { code: 'IN', name: 'India', emoji: '🇮🇳' },
  { code: 'FR', name: 'France', emoji: '🇫🇷' },
  { code: 'DE', name: 'Germany', emoji: '🇩🇪' },
  { code: 'JP', name: 'Japan', emoji: '🇯🇵' },
  { code: 'CN', name: 'China', emoji: '🇨🇳' },
  { code: 'BR', name: 'Brazil', emoji: '🇧🇷' },
  { code: 'MX', name: 'Mexico', emoji: '🇲🇽' },
  { code: 'ES', name: 'Spain', emoji: '🇪🇸' },
  { code: 'IT', name: 'Italy', emoji: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', emoji: '🇳🇱' },
  { code: 'SE', name: 'Sweden', emoji: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', emoji: '🇨🇭' },
  { code: 'AT', name: 'Austria', emoji: '🇦🇹' },
  { code: 'BE', name: 'Belgium', emoji: '🇧🇪' },
  { code: 'PT', name: 'Portugal', emoji: '🇵🇹' },
  { code: 'IE', name: 'Ireland', emoji: '🇮🇪' },
  { code: 'NO', name: 'Norway', emoji: '🇳🇴' },
  { code: 'DK', name: 'Denmark', emoji: '🇩🇰' },
  { code: 'FI', name: 'Finland', emoji: '🇫🇮' },
  { code: 'PL', name: 'Poland', emoji: '🇵🇱' },
  { code: 'RU', name: 'Russia', emoji: '🇷🇺' },
  { code: 'TR', name: 'Turkey', emoji: '🇹🇷' },
  { code: 'SA', name: 'Saudi Arabia', emoji: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', emoji: '🇦🇪' },
  { code: 'ZA', name: 'South Africa', emoji: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', emoji: '🇳🇬' },
  { code: 'EG', name: 'Egypt', emoji: '🇪🇬' },
  { code: 'KE', name: 'Kenya', emoji: '🇰🇪' },
  { code: 'AR', name: 'Argentina', emoji: '🇦🇷' },
  { code: 'CL', name: 'Chile', emoji: '🇨🇱' },
  { code: 'CO', name: 'Colombia', emoji: '🇨🇴' },
  { code: 'PE', name: 'Peru', emoji: '🇵🇪' },
  { code: 'VE', name: 'Venezuela', emoji: '🇻🇪' },
  { code: 'NZ', name: 'New Zealand', emoji: '🇳🇿' },
  { code: 'SG', name: 'Singapore', emoji: '🇸🇬' }
].sort((a, b) => a.name.localeCompare(b.name));

export default function CreateStoreScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();

  // Get the logout function from AuthContext
  const { logout } = useContext(AuthContext);

  // Handle back button press
  const handleBackPress = async () => {
    try {
      // Call the logout function to clear user data
      await logout();

      // Navigate to the Login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  const { user, userToken } = useContext(AuthContext);
  const [logo, setLogo] = useState(null);
  const [kbisDoc, setKbisDoc] = useState(null);
  const [identityDoc, setIdentityDoc] = useState(null);

  // Form data state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    address: '',
    city: '',
    phone: '',
    email: user?.email || '',
    kbis: null,
    identity: null
  });

  const [errors, setErrors] = useState({});
  const [country, setCountry] = useState('');
  const [countryName, setCountryName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const kbisInputRef = useRef();
  const identityInputRef = useRef();

  const pickImage = (type) => {
    const options = {
      mediaType: 'photo',
      quality: 1,
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to pick image. Please try again.');
      } else if (response.assets && response.assets[0].uri) {
        const uri = response.assets[0].uri;
        const fileName = response.assets[0].fileName || `${type}.jpg`;
        const fileType = response.assets[0].type || 'image/jpeg';

        if (type === 'logo') {
          setLogo(uri);
        } else if (type === 'kbis') {
          setKbisDoc(uri);
          setFormData(prev => ({
            ...prev,
            kbis: {
              uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
              type: fileType,
              name: fileName
            }
          }));
        } else if (type === 'identity') {
          setIdentityDoc(uri);
          setFormData(prev => ({
            ...prev,
            identity: {
              uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
              type: fileType,
              name: fileName
            }
          }));
        }
      }
    });
  };

  const handleInputChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.kbis) newErrors.kbis = 'KBIS document is required';
    if (!formData.identity) newErrors.identity = 'Identity document is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      // Get user token
      const userToken = await AsyncStorage.getItem('userToken');

      if (!userToken) {
        console.error('No user token found in AsyncStorage');
        throw new Error('Authentication required. Please login again.');
      }

      // Decode JWT token to get user ID
      let userId;
      try {
        console.log('Raw token:', userToken);
        const tokenParts = userToken.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid token format: Expected 3 parts');
        }

        const base64Url = tokenParts[1];
        if (!base64Url) {
          throw new Error('Invalid token format: Missing payload');
        }

        // Add proper base64 padding if needed
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        if (pad) {
          if (pad === 1) {
            throw new Error('Invalid base64 string');
          }
          base64 += '==='.slice(0, 4 - pad);
        }

        console.log('Base64 payload:', base64);

        // Decode base64 to string
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );

        console.log('Decoded token payload:', jsonPayload);

        const tokenData = JSON.parse(jsonPayload);
        console.log('Token data:', tokenData);

        // Try different possible user ID fields
        userId = tokenData?.id || tokenData?._id || tokenData?.sub || tokenData?.userId;

        if (!userId) {
          console.error('Token data missing user ID. Available fields:', Object.keys(tokenData));
          throw new Error('Could not determine user ID from token');
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        throw new Error('Failed to process authentication token');
      }

      // Prepare form data
      const formDataToSend = new FormData();

      // First, log the user ID to verify it's correct
      console.log('User ID being sent:', userId);

      // Create a plain object with all the form data
      // Note: Backend might be expecting 'userId' instead of 'userid'
      const storeData = {
        userId: userId,  // Changed from userid to userId
        userid: userId,  // Keep both for backward compatibility
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName || '',
        address: formData.address,
        city: formData.city,
        country: countryName,
        phone: formData.phone,
        email: formData.email,
      };

      // Log the data being sent
      console.log('Store data being sent:', JSON.stringify(storeData, null, 2));

      // Append all fields to FormData
      Object.entries(storeData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formDataToSend.append(key, value);
        }
      });

      // Append files if they exist
      if (formData.kbis) {
        formDataToSend.append('kbis', {
          uri: formData.kbis.uri,
          type: formData.kbis.type || 'image/jpeg',
          name: formData.kbis.fileName || `kbis_${Date.now()}.jpg`
        });
      }

      if (formData.identity) {
        formDataToSend.append('identity', {
          uri: formData.identity.uri,
          type: formData.identity.type || 'image/jpeg',
          name: formData.identity.fileName || `identity_${Date.now()}.jpg`
        });
      }

      // Import axios
      const axios = require('axios');

      // Log the complete request data
      const apiUrl = 'https://api.merkapp.net/api/createStore';
      console.log('Sending request to:', apiUrl);
      console.log('Request headers:', {
        'Authorization': `Bearer ${userToken.substring(0, 20)}...`,
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
        'X-User-ID': userId  // Add user ID in header as well
      });

      // Log FormData content
      console.log('FormData content:');
      for (let [key, value] of formDataToSend._parts) {
        console.log(`${key}:`, value);
      }

      // Make API call with axios
      // Try sending as JSON first, fallback to FormData if needed
      let response;
      try {
        console.log('Trying JSON request...');
        // First try with JSON content type
        response = await axios({
          method: 'post',
          url: 'https://api.merkapp.net/api/createStore',
          data: storeData,  // Send as JSON instead of FormData
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-User-ID': userId
          }
        });
      } catch (jsonError) {
        console.log('JSON request failed, trying with FormData:', jsonError);
        // Fall back to FormData if JSON fails
        try {
          console.log('Trying FormData request...');
          response = await axios({
            method: 'post',
            url: 'https://api.merkapp.net/api/createStore',
            data: formDataToSend,
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Accept': 'application/json',
              'Content-Type': 'multipart/form-data',
              'X-Requested-With': 'XMLHttpRequest',
              'X-User-ID': userId
            },
            transformRequest: (data, headers) => {
              // Don't modify the FormData headers
              if (data instanceof FormData) {
                return data;
              }
              return JSON.stringify(data);
            }
          });
        } catch (formDataError) {
          console.error('FormData request also failed:', formDataError);
          throw formDataError;
        }
      }

      console.log('Store creation response:', response.data);

      if (response.data?.status) {
        // Store the response and show thank you modal
        setApiResponse(response.data);
        setShowThankYouModal(true);

        // Only reset form if status is verified
        if (response.data?.storeStatus === 'verified') {
          setFormData({
            firstName: '',
            lastName: '',
            companyName: '',
            address: '',
            city: '',
            phone: '',
            email: '',
            kbis: null,
            identity: null
          });
          setCountry('');
          setCountryName('');
          setKbisDoc(null);
          setIdentityDoc(null);
        }
      } else {
        throw new Error(response.data?.message || 'Failed to create store');
      }
    } catch (error) {
      console.error('Error creating store:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message ||
        error.message ||
        'Something went wrong. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle document picking
  const pickDocument = async (type) => {
    try {
      const options = {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
      };

      const result = await launchImageLibrary(options);

      if (result.didCancel) {
        console.log('User cancelled image picker');
      } else if (result.error) {
        console.log('ImagePicker Error: ', result.error);
        Alert.alert('Error', 'Failed to pick image. Please try again.');
      } else {
        const source = { uri: result.assets[0].uri };

        if (type === 'kbis') {
          setKbisDoc(source);
          setFormData(prev => ({ ...prev, kbis: result.assets[0] }));
        } else if (type === 'identity') {
          setIdentityDoc(source);
          setFormData(prev => ({ ...prev, identity: result.assets[0] }));
        }
      }
    } catch (error) {
      console.log('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  // Country list is already defined at the top

  // Thank You Modal Component
  const ThankYouModal = ({ visible, onClose, isVerified = false }) => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.checkmarkContainer}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.modalTitle}>Thank You!</Text>
          <Text style={styles.modalText}>
            Thanks for submitting your details. We will verify them within 3 to 5 business days.
          </Text>
          <Text style={styles.modalText}>
            Kindly wait until the verification process is complete. Thank you for your patience.
          </Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => {
              onClose();
              // Only navigate to SellerDashboard if verified
              if (isVerified) {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'SellerTabs' }],
                });
              }
            }}
          >
            <Text style={styles.modalButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Close suggestions when clicking outside
  // Remove the handleOutsideClick function

  return (
    <View style={{ flex: 1 }}>
      <ThankYouModal
        visible={showThankYouModal}
        onClose={() => setShowThankYouModal(false)}
        isVerified={apiResponse?.storeStatus === 'verified'}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View style={styles.container}>
              <StatusBar barStyle="dark-content" backgroundColor="#fff" />

              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackPress}
                >
                  <ArrowLeftIcon size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('create_store')}</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Store Illustration */}
                {/* <View style={styles.illustrationContainer}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80' }}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View> */}

                {/* Personal Information Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <UserIcon size={24} color="#12344D" style={{ marginRight: 8 }} />
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                  </View>
                  <View style={styles.divider} />

                  {/* First Name & Last Name */}
                  <View style={styles.row}>
                    <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
                      <Text style={styles.label}>First Name *</Text>
                      <View style={[styles.inputWrapper, errors.firstName && styles.inputError]}>
                        <UserIcon size={20} color="#6B7280" style={[styles.inputIcon, { marginRight: 10 }]} />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your first name"
                          value={formData.firstName}
                          onChangeText={(text) => handleInputChange('firstName', text)}
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                    </View>

                    <View style={[styles.inputContainer, { flex: 1 }]}>
                      <Text style={styles.label}>Last Name *</Text>
                      <View style={[styles.inputWrapper, errors.lastName && styles.inputError]}>
                        <UserIcon size={20} color="#6B7280" style={[styles.inputIcon, { marginRight: 10 }]} />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your last name"
                          value={formData.lastName}
                          onChangeText={(text) => handleInputChange('lastName', text)}
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                    </View>
                  </View>

                  {/* Company Name */}
                  <View style={styles.countryInputContainer}>
                    <Text style={styles.label}>Company Name (Optional)</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputIcon}>
                        <BuildingOfficeIcon size={20} color="#6B7280" />
                      </View>
                      <TextInput
                        style={[styles.input, { paddingLeft: 40 }]}
                        placeholder="Company Name (Optional)"
                        value={formData.companyName}
                        onChangeText={(text) => handleInputChange('companyName', text)}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                </View>

                {/* Address Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <MapPinIcon size={24} color="#12344D" style={{ marginRight: 8 }} />
                    <Text style={styles.sectionTitle}>Address Details</Text>
                  </View>
                  <View style={styles.divider} />

                  {/* Country */}
                  <View style={styles.countryInputContainer}>
                    <Text style={styles.label}>Country/Region *</Text>
                    <View style={[styles.inputWrapper, errors.country && styles.inputError]}>
                      <View style={styles.inputIcon}>
                        <GlobeAltIcon size={20} color="#6B7280" />
                      </View>
                      <TextInput
                        style={[styles.input, { paddingLeft: 40 }]}
                        placeholder="Enter country name"
                        value={selectedCountry || countryName}
                        onChangeText={(text) => {
                          setCountryName(text);
                          // Find matching country
                          const matchedCountry = countryList.find(c =>
                            c.name.toLowerCase().includes(text.toLowerCase())
                          );
                          setCountry(matchedCountry?.code || '');
                        }}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    {countryName && (
                      <View style={styles.suggestionsContainer}>
                        {countryList
                          .filter(country =>
                            country.name.toLowerCase().includes(countryName.toLowerCase())
                          )
                          .slice(0, 5) // Show max 5 suggestions
                          .map(country => (
                            <TouchableOpacity
                              key={country.code}
                              style={styles.suggestionItem}
                              onPress={() => {
                                setCountry(country.code);
                                setSelectedCountry(country.name);
                                setCountryName('');
                              }}
                            >
                              <Text>{country.emoji} {country.name}</Text>
                            </TouchableOpacity>
                          ))
                        }
                      </View>
                    )}
                  </View>

                  {/* Street Address */}
                  <View style={styles.countryInputContainer}>
                    <Text style={styles.label}>Street Address *</Text>
                    <View style={[styles.inputWrapper, errors.address && styles.inputError]}>
                      <View style={styles.inputIcon}>
                        <MapPinIcon size={20} color="#6B7280" />
                      </View>
                      <TextInput
                        style={[styles.input, { paddingLeft: 40 }]}
                        placeholder="Address"
                        value={formData.address}
                        onChangeText={(text) => handleInputChange('address', text)}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                  </View>

                  {/* City */}
                  <View style={styles.countryInputContainer}>
                    <Text style={styles.label}>Town/City *</Text>
                    <View style={[styles.inputWrapper, errors.city && styles.inputError]}>
                      <View style={styles.inputIcon}>
                        <UserIcon size={20} color="#6B7280" />
                      </View>
                      <TextInput
                        style={[styles.input, { paddingLeft: 40 }]}
                        placeholder="City"
                        value={formData.city}
                        onChangeText={(text) => handleInputChange('city', text)}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
                  </View>
                </View>

                {/* Contact Information Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <PhoneIcon size={24} color="#12344D" style={{ marginRight: 8 }} />
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                  </View>
                  <View style={styles.divider} />

                  {/* Phone */}
                  <View style={styles.countryInputContainer}>
                    <Text style={styles.label}>Phone Number *</Text>
                    <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                      <View style={styles.inputIcon}>
                        <PhoneIcon size={20} color="#6B7280" />
                      </View>
                      <TextInput
                        style={[styles.input, { paddingLeft: 40 }]}
                        placeholder="Phone"
                        value={formData.phone}
                        onChangeText={(text) => handleInputChange('phone', text)}
                        keyboardType="phone-pad"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                  </View>

                  {/* Email */}
                  <View style={styles.countryInputContainer}>
                    <Text style={styles.label}>Email Address *</Text>
                    <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                      <View style={styles.inputIcon}>
                        <EnvelopeIcon size={20} color="#6B7280" />
                      </View>
                      <TextInput
                        style={[styles.input, { paddingLeft: 40 }]}
                        placeholder="Email"
                        value={formData.email}
                        onChangeText={(text) => handleInputChange('email', text)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                  </View>
                </View>

                {/* Documents Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <DocumentIcon size={24} color="#12344D" style={{ marginRight: 8 }} />
                    <Text style={styles.sectionTitle}>Required Documents</Text>
                  </View>
                  <View style={styles.divider} />

                  {/* KBIS Document */}
                  <View style={styles.countryInputContainer}>
                    <Text style={styles.label}>KBIS Document *</Text>
                    <TouchableOpacity
                      style={[styles.uploadButton, errors.kbis && styles.uploadButtonError]}
                      onPress={() => pickDocument('kbis')}
                    >
                      <DocumentIcon size={24} color="#6B7280" />
                      <Text style={styles.uploadButtonText}>
                        {kbisDoc ? 'KBIS Document Selected' : 'Upload KBIS Document'}
                      </Text>
                      <ArrowUpTrayIcon size={20} color="#6B7280" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                    {errors.kbis && <Text style={styles.errorText}>{errors.kbis}</Text>}
                    <Text style={styles.helperText}>
                      Please upload a clear photo of your KBIS document
                    </Text>
                  </View>

                  {/* Identity Document */}
                  <View style={styles.countryInputContainer}>
                    <Text style={styles.label}>Identity Document *</Text>
                    <TouchableOpacity
                      style={[styles.uploadButton, errors.identity && styles.uploadButtonError]}
                      onPress={() => pickDocument('identity')}
                    >
                      <DocumentIcon size={24} color="#6B7280" />
                      <Text style={styles.uploadButtonText}>
                        {identityDoc ? 'Identity Document Selected' : 'Upload Identity Document'}
                      </Text>
                      <ArrowUpTrayIcon size={20} color="#6B7280" style={{ marginLeft: 8 }} />
                      {formData.identity && (
                        <TouchableOpacity
                          style={styles.viewButton}
                          onPress={() => {
                            // Navigate to document preview
                            navigation.navigate('DocumentViewer', { uri: formData.identity });
                          }}
                        >
                          <Text style={styles.viewButtonText}>View</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                    {errors.identity && <Text style={styles.errorText}>{errors.identity}</Text>}
                    <Text style={styles.helperText}>
                      Please upload a clear photo of your ID or passport
                    </Text>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Store</Text>
                  )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: width * 0.85,
    maxWidth: 400,
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
  checkmarkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmark: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 60,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#12344D',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 40,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  illustration: {
    width: '100%',
    height: 200,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  countryInputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    height: 50,
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    paddingVertical: 12,
    paddingLeft: 40,
    paddingRight: 16,
  },
  suggestionsContainer: {
    marginTop: 5,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  picker: {
    flex: 1,
    height: 50,
    color: '#111827',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
  },
  uploadButtonError: {
    borderColor: '#EF4444',
  },
  uploadIcon: {
    marginRight: 10,
  },
  uploadButtonText: {
    flex: 1,
    color: '#4B5563',
    fontSize: 15,
  },
  viewButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#3B82F6',
    fontWeight: '500',
    fontSize: 14,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: COLORS.dark,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});

