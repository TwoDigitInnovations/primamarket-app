import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GetApi, Post } from '../../Helper/Service';
import { useAuth } from '../../context/AuthContext';
import { Country, State, City } from 'country-state-city';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { useCurrency } from '../../context/CurrencyContext';

const BillingDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userInfo: user, updateCartCount } = useAuth();
  const { t } = useTranslation();
  const { convertPrice, currencySymbol, userCurrency, exchangeRate } = useCurrency();
  
  // State for fresh cart data
  const [freshCartItems, setFreshCartItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [taxRate, setTaxRate] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);  // Trigger for UI refresh
  
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('cod'); // Default to COD
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    country: 'United States',
    pinCode: '',
    companyName: '',
    notes: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Country State City Selector
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Fetch fresh cart data (for initial load and screen focus)
  const fetchFreshCartData = async () => {
    try {
      setCartLoading(true);
      
      // Get cart data from AsyncStorage
      const cartData = await AsyncStorage.getItem('cartData');
      if (!cartData) {
        Alert.alert(t('error'), t('cart_empty'));
        navigation.goBack();
        return;
      }

      const parsedCart = JSON.parse(cartData);
      if (!Array.isArray(parsedCart) || parsedCart.length === 0) {
        Alert.alert(t('error'), t('cart_empty'));
        navigation.goBack();
        return;
      }

      // Prepare cart items for API call
      const cartItemsForAPI = parsedCart.map(item => ({
        productId: item.product_id,
        quantity: item.qty,
        selectedVariant: item.selectedColor ? {
          color: item.selectedColor,
          selected: item.selectedSize ? [item.selectedSize] : []
        } : null,
        selectedSize: item.selectedSize
      }));

      // Fetch fresh cart data from backend
      const response = await Post('getCartItems', { items: cartItemsForAPI });
      
      console.log('BillingDetails - Fresh cart data:', response);

      // Handle response format
      let cartDataArray = [];
      if (response?.data && Array.isArray(response.data)) {
        cartDataArray = response.data;
      } else if (Array.isArray(response)) {
        cartDataArray = response;
      }

      if (cartDataArray.length === 0) {
        Alert.alert(t('error'), t('cart_empty'));
        navigation.goBack();
        return;
      }

      setFreshCartItems(cartDataArray);

      // Fetch tax rate and delivery charges
      const taxResponse = await GetApi('getTax');
      if (taxResponse?.taxRate !== undefined) {
        setTaxRate(taxResponse.taxRate);
      }

      const deliveryResponse = await GetApi('getDeliveryCharge');
      if (deliveryResponse?.data?.deliveryCharge !== undefined) {
        setDeliveryCharge(deliveryResponse.data.deliveryCharge);
      }

    } catch (error) {
      console.error('Error fetching fresh cart data:', error);
      Alert.alert(t('error'), t('failed_load_cart'));
      navigation.goBack();
    } finally {
      setCartLoading(false);
    }
  };

  // Refresh cart data silently (for pre-order validation)
  const refreshCartDataSilently = async () => {
    try {
      // Get cart data from AsyncStorage
      const cartData = await AsyncStorage.getItem('cartData');
      if (!cartData) {
        throw new Error('Cart is empty');
      }

      const parsedCart = JSON.parse(cartData);
      if (!Array.isArray(parsedCart) || parsedCart.length === 0) {
        throw new Error('Cart is empty');
      }

      // Prepare cart items for API call
      const cartItemsForAPI = parsedCart.map(item => ({
        productId: item.product_id,
        quantity: item.qty,
        selectedVariant: item.selectedColor ? {
          color: item.selectedColor,
          selected: item.selectedSize ? [item.selectedSize] : []
        } : null,
        selectedSize: item.selectedSize
      }));

      // Fetch fresh cart data from backend
      const response = await Post('getCartItems', { items: cartItemsForAPI });
      
      // Handle response format
      let cartDataArray = [];
      if (response?.data && Array.isArray(response.data)) {
        cartDataArray = response.data;
      } else if (Array.isArray(response)) {
        cartDataArray = response;
      }

      if (cartDataArray.length === 0) {
        throw new Error('No valid items in cart');
      }

      // Update state with fresh data
      console.log('📦 Updating cart items with fresh data:', cartDataArray.length, 'items');
      setFreshCartItems([...cartDataArray]);  // Force new array reference for re-render

      // Fetch tax rate and delivery charges
      const taxResponse = await GetApi('getTax');
      if (taxResponse?.taxRate !== undefined) {
        console.log('💰 Updated tax rate:', taxResponse.taxRate);
        setTaxRate(taxResponse.taxRate);
      }

      const deliveryResponse = await GetApi('getDeliveryCharge');
      if (deliveryResponse?.data?.deliveryCharge !== undefined) {
        console.log('🚚 Updated delivery charge:', deliveryResponse.data.deliveryCharge);
        setDeliveryCharge(deliveryResponse.data.deliveryCharge);
      }

      // Log updated totals
      const newSubtotal = cartDataArray.reduce((total, item) => {
        const itemTotal = parseFloat(item.total) || 0;
        return total + itemTotal;
      }, 0);
      console.log('💵 New subtotal:', newSubtotal);

      // Trigger UI refresh
      setRefreshTrigger(prev => prev + 1);
      console.log('🔄 UI refresh triggered');

      return true;
    } catch (error) {
      console.error('Error refreshing cart data:', error);
      throw error;
    }
  };

  // Load fresh cart data on mount
  useEffect(() => {
    fetchFreshCartData();
  }, []);

  // Refresh cart data when screen comes into focus (e.g., returning from payment screen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('BillingDetails screen focused - refreshing cart data');
      fetchFreshCartData();
    });

    return unsubscribe;
  }, [navigation]);

  // Load countries on component mount
  useEffect(() => {
    const allCountries = Country.getAllCountries().map(country => ({
      code: country.isoCode,
      name: country.name,
      phonecode: country.phonecode,
    }));
    setCountries(allCountries);
    
    // Set default country (United States)
    const usCountry = allCountries.find(c => c.name === 'United States');
    if (usCountry) {
      const usStates = State.getStatesOfCountry(usCountry.code);
      setStates(usStates);
    }
  }, []);
  
  // Calculate totals from fresh cart data
  const calculateSubtotal = () => {
    const subtotal = freshCartItems.reduce((total, item) => {
      const itemTotal = parseFloat(item.total) || 0;
      return total + itemTotal;
    }, 0);
    return subtotal;
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * taxRate) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    return subtotal + tax + deliveryCharge;
  };

  // Log when cart data or prices change
  useEffect(() => {
    if (freshCartItems.length > 0) {
      const subtotal = calculateSubtotal();
      const tax = calculateTax();
      const total = calculateTotal();
      console.log('📊 Cart totals updated:');
      console.log('   Items:', freshCartItems.length);
      console.log('   Subtotal: $' + subtotal.toFixed(2));
      console.log('   Tax: $' + tax.toFixed(2));
      console.log('   Delivery: $' + deliveryCharge.toFixed(2));
      console.log('   Total: $' + total.toFixed(2));
    }
  }, [freshCartItems, taxRate, deliveryCharge, refreshTrigger]);

  // Load states when country changes
  useEffect(() => {
    if (formData.country) {
      const selectedCountry = countries.find(c => c.name === formData.country);
      if (selectedCountry) {
        const countryStates = State.getStatesOfCountry(selectedCountry.code);
        setStates(countryStates);
        // Reset state and city when country changes
        setFormData(prev => ({
          ...prev,
          state: '',
          city: ''
        }));
      }
    }
  }, [formData.country]);
  
  // Load cities when state changes
  useEffect(() => {
    if (formData.state && formData.country) {
      const selectedCountry = countries.find(c => c.name === formData.country);
      if (selectedCountry) {
        const selectedState = states.find(s => s.name === formData.state);
        if (selectedState) {
          const stateCities = City.getCitiesOfState(selectedCountry.code, selectedState.isoCode);
          setCities(stateCities);
        }
      }
      // Reset city when state changes
      setFormData(prev => ({
        ...prev,
        city: ''
      }));
    }
  }, [formData.state]);


  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert(
          t('authentication_required'),
          t('please_login_continue'),
          [
            {
              text: t('login'),
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      }
    };
    
    checkAuth();
  }, []);

  // Log fresh cart items when loaded
  useEffect(() => {
    if (freshCartItems.length > 0) {
      console.log('Fresh cart items loaded:', freshCartItems.length);
      freshCartItems.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, {
          name: item?.name,
          price: item?.Offerprice || item?.price,
          qty: item?.qty,
          total: item?.total
        });
      });
    }
  }, [freshCartItems]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = t('first_name_required');
    if (!formData.lastName.trim()) newErrors.lastName = t('last_name_required');
    if (!formData.email.trim()) newErrors.email = t('email_required');
    if (!formData.phone.trim()) newErrors.phone = t('phone_required');
    if (!formData.address.trim()) newErrors.address = t('address_required');
    if (!formData.city.trim()) newErrors.city = t('city_required');
    if (!formData.pinCode.trim()) newErrors.pinCode = t('postal_code_required');
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };
  
  // Render dropdown item
  const renderDropdownItem = (item, onSelect, field) => (
    <TouchableOpacity
      key={item.name || item}
      style={styles.dropdownItem}
      onPress={() => {
        handleChange(field, item.name || item);
        if (field === 'country') {
          setShowCountryDropdown(false);
          setShowStateDropdown(false);
          setShowCityDropdown(false);
        } else if (field === 'state') {
          setShowStateDropdown(false);
          setShowCityDropdown(false);
        } else {
          setShowCityDropdown(false);
        }
        onSelect(item.name || item);
      }}
    >
      <Text style={styles.dropdownItemText}>{item.name || item}</Text>
    </TouchableOpacity>
  );
  
  // Render dropdown
  const renderDropdown = (visible, setVisible, data, value, field, placeholder) => (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={[
          styles.input, 
          errors[field] && styles.inputError,
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
        ]}
        onPress={() => setVisible(!visible)}
      >
        <Text 
          style={[
            styles.dropdownText, 
            !value && styles.placeholderText,
            { flex: 1, marginRight: 8 }
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>
      
      <Modal
        transparent={true}
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        
        <View style={styles.dropdownList}>
          <FlatList
            data={data}
            keyExtractor={(item, index) => (item.name || item.toString()) + index}
            renderItem={({ item }) => renderDropdownItem(item, (value) => {
              handleChange(field, value);
            }, field)}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        </View>
      </Modal>
    </View>
  );

  // Place order
  const placeOrder = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setIsProcessing(true);
    
    try {
      // IMPORTANT: Fetch fresh cart data before placing order
      // This ensures we have the latest prices even if user stayed on screen for hours
      console.log('🔄 Refreshing cart data before placing order...');
      try {
        await refreshCartDataSilently();
        console.log('✅ Fresh cart data loaded - proceeding with order');
        
        // Log current totals after refresh
        const currentSubtotal = calculateSubtotal();
        const currentTax = calculateTax();
        const currentTotal = calculateTotal();
        console.log('💰 Current order totals after refresh:');
        console.log('   Subtotal:', currentSubtotal.toFixed(2));
        console.log('   Tax:', currentTax.toFixed(2));
        console.log('   Delivery:', deliveryCharge.toFixed(2));
        console.log('   Total:', currentTotal.toFixed(2));
      } catch (refreshError) {
        console.error('❌ Failed to refresh cart data:', refreshError);
        Alert.alert(
          t('error'), 
          t('failed_load_latest_prices'),
          [
            { text: t('retry'), onPress: () => placeOrder() },
            { text: t('cancel'), style: 'cancel' }
          ]
        );
        setLoading(false);
        setIsProcessing(false);
        return;
      }
    
      const token = await AsyncStorage.getItem('userToken');
      console.log('Token check before order:', token ? 'Found' : 'Not found');
      
      if (!token) {
        Alert.alert(t('authentication_required'), t('please_login_place_order'));
        navigation.navigate('Login');
        return;
      }
      
     
      // Use fresh cart data for order
      const productDetail = freshCartItems.map(item => {
        
        if (!item || !item._id) {
          console.error('Invalid cart item:', item);
          throw new Error('Invalid product in cart');
        }
        
        return {
          product: item._id,
          qty: item.qty || 1,
          price: item.Offerprice || item.price || 0,
          color: item.selectedColor?.color || null,
          size: item.selectedSize || null,
          name: item.name || 'Unknown Product',
          image: item.image || null,
          seller_id: item.userid || item.seller_id || 'FETCH_FROM_PRODUCT',
        };
      });
      
      console.log('Formatted productDetail:', productDetail);
      
     
      const orderData = {
        productDetail,
        shipping_address: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          address: formData.address.trim(),
          apartment: formData.apartment.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          country: formData.country.trim(),
          pinCode: formData.pinCode.trim(),
          phoneNumber: formData.phone.trim(),
        },
        paymentmode: paymentMethod === 'cod' ? 'cod' : 'pay',
        subtotal: calculateSubtotal(),
        shipping: 0,
        tax: calculateTax(),
        total: calculateTotal(),
        deliveryCharge: deliveryCharge,
        deliveryTip: 0,
        timeslot: null, // Add if needed
      };
      
      console.log('Final order data:', orderData);
      
      // PayPal and Card payment temporarily disabled
      // If payment method is PayPal or Card, navigate to PayPal payment screen
      // if (paymentMethod === 'paypal' || paymentMethod === 'card') {
      //   setLoading(false);
      //   setIsProcessing(false);
      //   navigation.push('PayPalPayment', {
      //     orderData,
      //     cartItems: freshCartItems,  // Use fresh cart items
      //     total: calculateTotal(),
      //     paymentMethod, // Pass payment method
      //   });
      //   return;
      // }
      
      // For COD, create order directly
      const response = await Post('createProductRequest', orderData);
      
      if (response.success || response.status) {
        // Clear cart on successful order
        await AsyncStorage.removeItem('cartData');
        
        // Update cart count in tab bar
        if (updateCartCount) {
          await updateCartCount();
        }
        
        const orderTotal = calculateTotal();
        navigation.replace('OrderConfirmation', {
          orderId: response.data?.orders?.[0]?._id || 'N/A',
          orderNumber: response.data?.orders?.[0]?._id || 'N/A',
          total: orderTotal
        });
      } else {
        Alert.alert(t('error'), response.message || t('failed_place_order'));
      }
    } catch (error) {
      console.error('Order error:', error);
      
    
      if (error.message && error.message.includes('authentication')) {
        Alert.alert(
          t('authentication_required'), 
          t('session_expired'),
          [
            {
              text: t('login'),
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        Alert.alert(t('error'), error.message || t('failed_place_order_try_again'));
      }
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

 
  const renderField = (label, field, placeholder, keyboardType = 'default', required = true) => (
    <View className="mb-4">
      <Text className="text-gray-700 mb-1">
        {label} {required && <Text className="text-red-500">*</Text>}
      </Text>
      <TextInput
        className={`border rounded-lg px-4 py-3 ${errors[field] ? 'border-red-500' : 'border-gray-300'}`}
        value={formData[field]}
        onChangeText={(text) => handleChange(field, text)}
        placeholder={placeholder}
        keyboardType={keyboardType}
        editable={!loading}
      />
      {errors[field] && (
        <Text className="text-red-500 text-xs mt-1">{errors[field]}</Text>
      )}
    </View>
  );

  // Show loading while fetching fresh cart data
  if (cartLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e293b" />
          <Text className="text-gray-400 mt-4">{t('loading_cart')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
       <View className="bg-[#0B051D] px-4 py-3">
            <View className="flex-row items-center">
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                className="mr-4"
              >
                <ChevronLeftIcon size={24} color="white" />
              </TouchableOpacity>
            <Text className="text-white text-xl font-semibold">{t('billing_details')}</Text>
            </View>
          </View>
   
      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
          
          {/* Contact Information */}
          <View className="bg-white rounded-lg p-4 mb-4">
            <Text className="font-bold text-lg mb-3">{t('contact_information')}</Text>
            <View className="flex-row">
              <View className="flex-1 pr-2">
                {renderField(t('first_name'), 'firstName', 'John', 'default')}
              </View>
              <View className="flex-1 pl-2">
                {renderField(t('last_name'), 'lastName', 'Doe', 'default')}
              </View>
            </View>
            {renderField(t('email'), 'email', 'your@email.com', 'email-address')}
            {renderField(t('phone'), 'phone', '+1 (___) ___-____', 'phone-pad')}
          </View>
          
          {/* Shipping Address */}
          <View className="bg-white rounded-lg p-4 mb-4">
            <Text className="font-bold text-lg mb-3">{t('shipping_address')}</Text>
            {renderField(t('address'), 'address', '123 Main St', 'default')}
            {renderField(t('apartment_optional'), 'apartment', 'Apt 4B', 'default', false)}
            
            {/* Country Dropdown */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-1">
                {t('country')} <Text className="text-red-500">*</Text>
              </Text>
              {renderDropdown(
                showCountryDropdown,
                setShowCountryDropdown,
                countries,
                formData.country,
                'country',
                t('select_country')
              )}
              {errors.country && <Text className="text-red-500 text-xs mt-1">{errors.country}</Text>}
            </View>
            
            {/* State Dropdown */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-1">
                {t('state_province')} <Text className="text-red-500">*</Text>
              </Text>
              {formData.country ? (
                <>
                  {renderDropdown(
                    showStateDropdown,
                    setShowStateDropdown,
                    states,
                    formData.state,
                    'state',
                    t('select_state_province')
                  )}
                  {errors.state && <Text className="text-red-500 text-xs mt-1">{errors.state}</Text>}
                </>
              ) : (
                <Text className="text-gray-500 text-sm">{t('select_country_first')}</Text>
              )}
            </View>
            
            {/* City Dropdown */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-1">
                {t('city')} <Text className="text-red-500">*</Text>
              </Text>
              {formData.state ? (
                <>
                  {renderDropdown(
                    showCityDropdown,
                    setShowCityDropdown,
                    cities.length > 0 ? cities : [formData.city || t('no_cities_found')],
                    formData.city,
                    'city',
                    t('select_city')
                  )}
                  {errors.city && <Text className="text-red-500 text-xs mt-1">{errors.city}</Text>}
                </>
              ) : (
                <Text className="text-gray-500 text-sm">{t('select_state_first')}</Text>
              )}
            </View>
            
            {/* ZIP/Postal Code */}
            <View className="mb-4">
              {renderField(t('zip_postal_code'), 'pinCode', '10001', 'number-pad')}
            </View>
            
            {renderField(t('company_optional'), 'companyName', t('company_name'), 'default', false)}
          </View>
          
          {/* Order Summary */}
          <View className="bg-white rounded-lg p-4 mb-4">
            <Text className="font-bold text-lg mb-3">{t('order_summary')}</Text>
            
            {freshCartItems.map((item, index) => (
              <View key={index} className="flex-row items-center mb-3">
                <View className="w-16 h-16 bg-gray-200 rounded-lg mr-3 overflow-hidden">
                  {item.image ? (
                    <Image 
                      source={{ uri: item.image }} 
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-gray-100">
                      <Text className="text-gray-400 text-xs text-center">{t('no_image')}</Text>
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="font-medium" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-gray-500 text-sm">{t('qty')}: {item.qty}</Text>
                  {item.selectedColor?.color && (
                    <View className="flex-row items-center mt-1">
                      <Text className="text-gray-500 text-xs mr-1">{t('color')}:</Text>
                      <View 
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: item.selectedColor.color }}
                      />
                    </View>
                  )}
                  {item.selectedSize && (
                    <Text className="text-gray-500 text-xs">{t('size')}: {item.selectedSize}</Text>
                  )}
                </View>
                <Text className="font-bold">{currencySymbol} {convertPrice(parseFloat(item.total)).toLocaleString()}</Text>
              </View>
            ))}
            
            <View className="border-t border-gray-200 my-3" />
            
            <View className="mb-2">
              <View className="flex-row justify-between mb-1">
                <Text>{t('subtotal')}</Text>
                <Text>{currencySymbol} {convertPrice(calculateSubtotal()).toLocaleString()}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text>Tax ({taxRate}%)</Text>
                <Text>{currencySymbol} {convertPrice(calculateTax()).toLocaleString()}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text>Delivery Charge</Text>
                <Text>{currencySymbol} {convertPrice(deliveryCharge).toLocaleString()}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text>{t('shipping')}</Text>
                <Text className="text-green-600">
                  {t('free')}
                </Text>
              </View>
              <View className="border-t border-gray-200 my-2" />
              <View className="flex-row justify-between">
                <Text className="font-bold">{t('total')}</Text>
                <Text className="font-bold">{currencySymbol} {convertPrice(calculateTotal()).toLocaleString()}</Text>
              </View>
            </View>
          </View>
          
          {/* Payment Method */}
          <View className="bg-white rounded-lg p-4 mb-4">
            <Text className="font-bold text-lg mb-3">{t('payment_method')}</Text>
            <View className="flex-row items-center p-3 border border-slate-700 rounded-lg">
              <View className="w-5 h-5 rounded-full bg-[#0B051D] mr-3 items-center justify-center">
                <View className="w-2 h-2 rounded-full bg-white" />
              </View>
              <Text className="font-medium">
                {paymentMethod === 'cod' ? t('cash_on_delivery') : t('credit_debit_card')}
              </Text>
            </View>
          </View>
          
          {/* Extra padding at bottom */}
          {/* Payment Method Selection - Temporarily Disabled */}
          {/* <View className="px-4 mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              {t('select_payment_method')}
            </Text>
            
            PayPal Option
            <TouchableOpacity
              onPress={() => setPaymentMethod('paypal')}
              className="flex-row items-center p-4 border-2 rounded-xl mb-3"
              style={{
                borderColor: paymentMethod === 'paypal' ? '#0070BA' : '#E5E7EB',
                backgroundColor: paymentMethod === 'paypal' ? '#F0F8FF' : '#FFFFFF',
              }}
            >
              <View 
                className="w-6 h-6 rounded-full border-2 mr-3 items-center justify-center"
                style={{
                  borderColor: paymentMethod === 'paypal' ? '#0070BA' : '#9CA3AF',
                  backgroundColor: paymentMethod === 'paypal' ? '#0070BA' : 'transparent',
                }}
              >
                {paymentMethod === 'paypal' && (
                  <View className="w-3 h-3 rounded-full bg-white" />
                )}
              </View>
              <View className="flex-1">
                <Text 
                  className="font-bold text-base"
                  style={{ color: paymentMethod === 'paypal' ? '#0070BA' : '#111827' }}
                >
                  {t('pay_with_paypal')}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {t('redirect_to_paypal')}
                </Text>
              </View>
              <Text className="text-2xl">💳</Text>
            </TouchableOpacity>

            Credit Card Option
            <TouchableOpacity
              onPress={() => setPaymentMethod('card')}
              className="flex-row items-center p-4 border-2 rounded-xl"
              style={{
                borderColor: paymentMethod === 'card' ? '#E58F14' : '#E5E7EB',
                backgroundColor: paymentMethod === 'card' ? '#FEF3C7' : '#FFFFFF',
              }}
            >
              <View 
                className="w-6 h-6 rounded-full border-2 mr-3 items-center justify-center"
                style={{
                  borderColor: paymentMethod === 'card' ? '#E58F14' : '#9CA3AF',
                  backgroundColor: paymentMethod === 'card' ? '#E58F14' : 'transparent',
                }}
              >
                {paymentMethod === 'card' && (
                  <View className="w-3 h-3 rounded-full bg-white" />
                )}
              </View>
              <View className="flex-1">
                <Text 
                  className="font-bold text-base"
                  style={{ color: paymentMethod === 'card' ? '#E58F14' : '#111827' }}
                >
                  {t('pay_with_card')}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {t('enter_card_details')}
                </Text>
              </View>
              <Text className="text-2xl">💳</Text>
            </TouchableOpacity>
          </View> */}

          <View className="h-4" />
        </ScrollView>
      
      {/* Place Order Button - Fixed at bottom with proper spacing for tab bar */}
      <View className="bg-white border-t border-gray-200 px-4 pt-3 pb-24">
        <TouchableOpacity
          onPress={placeOrder}
          disabled={isProcessing}
          className={`py-4 rounded-lg items-center justify-center ${isProcessing ? 'bg-slate-400' : 'bg-[#0B051D]'}`}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              {t('place_order')} - {currencySymbol} {convertPrice(calculateTotal()).toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Input styles
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 50,
    justifyContent: 'center',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  
  // Dropdown styles
  dropdownContainer: {
    position: 'relative',
    zIndex: 1,
  },
  dropdownText: {
    fontSize: 15,
    color: '#1f2937',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  dropdownIcon: {
    color: '#6b7280',
    fontSize: 10,
    marginLeft: 8,
    transform: [{ scaleY: 0.8 }],
  },
  dropdownList: {
    position: 'absolute',
    top: '20%',
    left: 20,
    right: 20,
    maxHeight: 300,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#1f2937',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

export default BillingDetails;