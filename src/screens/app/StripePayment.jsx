import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post } from '../../Helper/Service';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { useCurrency } from '../../context/CurrencyContext';

const StripePayment = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderData, cartItems, total, paymentMethod } = route.params;
  const { updateCartCount } = useAuth();
  const { t } = useTranslation();
  const { convertPrice, currencySymbol } = useCurrency();
  
  const [loading, setLoading] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  
  // Card details state
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    cardholderName: ''
  });

  useEffect(() => {
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      
      const response = await Post('stripe/create-payment-intent', {
        amount: total,
        currency: 'usd',
        orderData: orderData
      });

      if (response.status) {
        setPaymentIntentId(response.paymentIntentId);
        console.log('Payment Intent created:', response.paymentIntentId);
      } else {
        Alert.alert(t('error'), response.message || 'Failed to initialize payment');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Payment Intent Error:', error);
      Alert.alert(t('error'), 'Failed to initialize payment');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!paymentIntentId) {
      Alert.alert(t('error'), 'Payment not initialized');
      return;
    }

    try {
      setLoading(true);

     
      await new Promise(resolve => setTimeout(resolve, 2000));

    
      const response = await Post('stripe/confirm-payment', {
        paymentIntentId: paymentIntentId,
        orderData: orderData
      });

      if (response.status) {
        // Clear cart
        await AsyncStorage.removeItem('cartData');
        
        // Update cart count
        if (updateCartCount) {
          await updateCartCount();
        }

        // Navigate to success
        navigation.replace('OrderConfirmation', {
          orderId: response.orderId || 'N/A',
          orderNumber: response.orderNumber || 'N/A',
          total: total
        });
      } else {
        Alert.alert(t('error'), response.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment Error:', error);
      Alert.alert(t('error'), 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-[#ff66c4] px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <ChevronLeftIcon size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-black text-xl font-semibold">Stripe Payment</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Payment Summary */}
        <View className="bg-gray-50 rounded-lg p-4 mb-6">
          <Text className="text-lg font-semibold mb-2">Payment Summary</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Total Amount:</Text>
            <Text className="font-semibold">{currencySymbol} {convertPrice(total).toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Payment Method:</Text>
            <Text className="font-semibold">Stripe</Text>
          </View>
        </View>

        {/* Payment Form */}
        <View className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <Text className="text-lg font-semibold mb-4">Card Details</Text>
          
          {/* Cardholder Name */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-2">Cardholder Name</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              value={cardDetails.cardholderName}
              onChangeText={(text) => setCardDetails(prev => ({...prev, cardholderName: text}))}
              placeholder="John Doe"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          {/* Card Number */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-2">Card Number</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              value={cardDetails.cardNumber}
              onChangeText={(text) => {
                // Format card number with spaces
                const formatted = text.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
                if (formatted.length <= 19) { // 16 digits + 3 spaces
                  setCardDetails(prev => ({...prev, cardNumber: formatted}));
                }
              }}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={19}
            />
          </View>

          {/* Expiry and CVC */}
          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-gray-700 mb-2">Expiry Date</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white"
                value={cardDetails.expiryDate}
                onChangeText={(text) => {
                  // Format MM/YY
                  const formatted = text.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
                  if (formatted.length <= 5) {
                    setCardDetails(prev => ({...prev, expiryDate: formatted}));
                  }
                }}
                placeholder="MM/YY"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-gray-700 mb-2">CVC</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white"
                value={cardDetails.cvc}
                onChangeText={(text) => {
                  if (text.length <= 4) {
                    setCardDetails(prev => ({...prev, cvc: text}));
                  }
                }}
                placeholder="123"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry={true}
              />
            </View>
          </View>

          <Text className="text-xs text-gray-500 text-center">
            This is a demo. In production, use Stripe Elements for secure card input.
          </Text>
        </View>

        {/* Security Info */}
        <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <Text className="text-blue-800 font-semibold mb-2">🔒 Secure Payment</Text>
          <Text className="text-blue-700 text-sm">
            Your payment is secured by Stripe's industry-leading encryption and fraud protection.
          </Text>
        </View>
      </ScrollView>

      {/* Pay Button */}
<View className="px-4 py-4 pb-24 bg-white border-t border-gray-200">
        <TouchableOpacity
          onPress={processPayment}
          disabled={loading || !paymentIntentId}
          className={`py-4 rounded-lg items-center justify-center ${
            loading || !paymentIntentId ? 'bg-gray-400' : 'bg-[#0B051D]'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              Pay {currencySymbol} {convertPrice(total).toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default StripePayment;