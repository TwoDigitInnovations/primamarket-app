import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { useTranslation } from 'react-i18next';
import { Post } from '../../Helper/Service';
import { useAuth } from '../../context/AuthContext';

const PayPalPayment = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { updateCartCount } = useAuth();
  const { orderData, cartItems, paymentMethod } = route.params;

  const [loading, setLoading] = useState(false);
  const [paypalUrl, setPaypalUrl] = useState(null);
  const [showWebView, setShowWebView] = useState(false);
  
  // Card payment states
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const webViewRef = useRef(null);

  // Format card number with spaces
  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19); // 16 digits + 3 spaces
  };

  // Format expiry date
  const formatExpiryDate = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  // Validate card details
  const validateCardDetails = () => {
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
      Alert.alert(t('error'), 'Please enter a valid card number');
      return false;
    }
    if (!expiryDate || expiryDate.length < 5) {
      Alert.alert(t('error'), 'Please enter a valid expiry date (MM/YY)');
      return false;
    }
    if (!cvv || cvv.length < 3) {
      Alert.alert(t('error'), 'Please enter a valid CVV');
      return false;
    }
    if (!cardName || cardName.trim().length < 3) {
      Alert.alert(t('error'), 'Please enter cardholder name');
      return false;
    }
    return true;
  };

  // Create PayPal order and get approval URL
  const createPayPalOrder = async () => {
    try {
      setLoading(true);

      // Use productDetail from orderData which has proper structure
      const items = orderData.productDetail || cartItems.map(item => ({
        name: item.product?.name || item.name,
        price: Number(item.price) || 0,
        qty: Number(item.qty || item.quantity || 1),
      }));

      const paypalOrderData = {
        items: items.map(item => ({
          name: item.name,
          price: Number(item.price) || 0,
          qty: Number(item.qty || item.quantity || 1),
        })),
        total: Number(orderData.total) || 0,
        shipping_address: orderData.shipping_address,
      };

      console.log('Creating PayPal order:', paypalOrderData);

      const response = await Post('paypal/create-order', paypalOrderData);

      console.log('PayPal order response:', response);

      if (response && response.status && response.approvalUrl) {
        setPaypalUrl(response.approvalUrl);
        setShowWebView(true);
      } else {
        throw new Error(response?.message || 'Failed to create PayPal order');
      }
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      Alert.alert(
        t('error'),
        error.message || 'Failed to initialize PayPal payment'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle PayPal WebView navigation
  const handleWebViewNavigationStateChange = async (navState) => {
    const { url } = navState;
    console.log('WebView URL:', url);

    // Check if user completed payment (success URL)
    if (url.includes('/success') || url.includes('paymentId=') || url.includes('PayerID=')) {
      setShowWebView(false);
      
      // Extract order ID from URL
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const token = urlParams.get('token');
      
      if (token) {
        await capturePayPalPayment(token);
      }
    }

    // Check if user cancelled
    if (url.includes('/cancel')) {
      setShowWebView(false);
      Alert.alert(t('cancelled'), 'Payment was cancelled');
    }
  };

  // Capture PayPal payment after approval
  const capturePayPalPayment = async (orderID) => {
    try {
      setLoading(true);

      const response = await Post('paypal/capture-order', {
        orderID,
        orderData,
      });

      console.log('Capture response:', response);

      if (response && response.status) {
        // Clear cart
        await updateCartCount(0);
        
        // Navigate to success screen
        navigation.replace('OrderConfirmation', {
          orderId: response.orderId || orderID,
          paymentMethod: 'PayPal',
        });
      } else {
        throw new Error(response?.message || 'Failed to capture payment');
      }
    } catch (error) {
      console.error('Error capturing payment:', error);
      Alert.alert(
        t('error'),
        error.message || 'Failed to complete payment'
      );
    } finally {
      setLoading(false);
    }
  };

  // Process card payment
  const processCardPayment = async () => {
    if (!validateCardDetails()) {
      return;
    }

    try {
      setLoading(true);

      // Calculate values if not present
      console.log('Cart Items:', cartItems);
      console.log('Order Data:', orderData);
      
      const subtotal = orderData.subtotal || (cartItems && cartItems.length > 0 ? cartItems.reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.qty || item.quantity || 1);
        console.log(`Item: ${item.name}, Price: ${price}, Qty: ${qty}`);
        return sum + (price * qty);
      }, 0) : 0);
      
      const shipping = Number(orderData.shipping) || 0;
      const tax = Number(orderData.tax) || 0;
      const total = Number(orderData.total) || (subtotal + shipping + tax);
      
      console.log('Calculated:', { subtotal, shipping, tax, total });

      const cardPaymentData = {
        productDetail: orderData.productDetail || cartItems.map(item => ({
          product: item.product,
          name: item.name,
          price: item.price,
          qty: item.qty || item.quantity || 1,
          image: item.image,
        })),
        shipping_address: orderData.shipping_address,
        subtotal,
        shipping,
        tax,
        total,
        paymentmode: 'card',
        card: {
          number: cardNumber.replace(/\s/g, ''),
          expiry: expiryDate,
          cvv: cvv,
          name: cardName,
        },
      };

      console.log('Processing card payment...', cardPaymentData);

      const response = await Post('paypal/process-card-payment', cardPaymentData);

      console.log('Card payment response:', response);

      if (response && response.status) {
        // Clear cart
        await updateCartCount(0);
        
        // Navigate to success screen
        navigation.replace('OrderConfirmation', {
          orderId: response.orderId,
          paymentMethod: 'Credit Card',
        });
      } else {
        throw new Error(response?.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Error processing card payment:', error);
      Alert.alert(
        t('error'),
        error.message || 'Failed to process card payment'
      );
    } finally {
      setLoading(false);
    }
  };

  // Render PayPal WebView
  if (showWebView && paypalUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setShowWebView(false);
              Alert.alert(t('cancelled'), 'Payment was cancelled');
            }}
            style={styles.backButton}
          >
            <ChevronLeftIcon size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PayPal Payment</Text>
        </View>
        <WebView
          ref={webViewRef}
          source={{ uri: paypalUrl }}
          onNavigationStateChange={handleWebViewNavigationStateChange}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0070BA" />
              <Text style={styles.loadingText}>Loading PayPal...</Text>
            </View>
          )}
        />
      </View>
    );
  }

  // Render Card Payment Form
  if (paymentMethod === 'card') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ChevronLeftIcon size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('pay_with_card')}</Text>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.cardForm}>
            <Text style={styles.formTitle}>Enter Card Details</Text>

            {/* Card Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Card Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your card number"
                keyboardType="numeric"
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                maxLength={19}
              />
            </View>

            {/* Expiry and CVV */}
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  value={expiryDate}
                  onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="CVV"
                  keyboardType="numeric"
                  value={cvv}
                  onChangeText={setCvv}
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>

            {/* Cardholder Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Cardholder Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter cardholder name"
                value={cardName}
                onChangeText={setCardName}
                autoCapitalize="words"
              />
            </View>

            {/* Order Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${orderData.subtotal?.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>${orderData.shipping?.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${orderData.total?.toFixed(2)}</Text>
              </View>
            </View>

            {/* Pay Button */}
            <TouchableOpacity
              style={[styles.payButton, loading && styles.payButtonDisabled]}
              onPress={processCardPayment}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.payButtonText}>
                  Pay ${orderData.total?.toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.secureText}>🔒 Your payment is secure and encrypted</Text>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Render PayPal Payment (Initial Screen)
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeftIcon size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PayPal Payment</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.paypalContainer}>
          <Text style={styles.paypalTitle}>Complete Payment with PayPal</Text>
          <Text style={styles.paypalSubtitle}>
            You will be redirected to PayPal to complete your payment securely
          </Text>

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${orderData.subtotal?.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>${orderData.shipping?.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${orderData.total?.toFixed(2)}</Text>
            </View>
          </View>

          {/* PayPal Button */}
          <TouchableOpacity
            style={[styles.paypalButton, loading && styles.paypalButtonDisabled]}
            onPress={createPayPalOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.paypalButtonText}>Continue with</Text>
                <Text style={styles.paypalLogo}>PayPal</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.secureText}>🔒 Secure payment powered by PayPal</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,  // Extra padding at bottom to prevent button cutoff
  },
  paypalContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  paypalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  paypalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0070BA',
  },
  paypalButton: {
    width: '100%',
    backgroundColor: '#0070BA',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 32,  // Increased bottom margin
    minHeight: 56,  // Minimum height to prevent cutoff
  },
  paypalButtonDisabled: {
    opacity: 0.6,
  },
  paypalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  paypalLogo: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  secureText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  cardForm: {
    flex: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  payButton: {
    backgroundColor: '#E58F14',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,  // Increased bottom margin
    minHeight: 56,  // Minimum height to prevent cutoff
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default PayPalPayment;
