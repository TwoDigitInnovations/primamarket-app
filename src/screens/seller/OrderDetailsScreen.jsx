import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeftIcon, ChevronLeftIcon } from 'react-native-heroicons/outline';
import { Api, GetApi } from '../../Helper/Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Image } from 'react-native-svg';

const OrderDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { orderId } = route.params;
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await GetApi(`getProductRequest/${orderId}`);
      
      if (response && response.data) {
        const orderData = response.data;
        const transformedOrder = {
          ...orderData,
          id: orderData._id,
          orderId: orderData.orderId,
          total: orderData.total,
          finalAmount: orderData.finalAmount,
          status: orderData.status,
          paymentmode: orderData.paymentmode,
          createdAt: orderData.createdAt,
          updatedAt: orderData.updatedAt,
          user: orderData.user,
          shipping_address: orderData.shipping_address,
          productDetail: orderData.productDetail || [],
          deliveryCharge: orderData.deliveryCharge || 0,
          tax: orderData.tax || 0,
          adminFee: orderData.adminFee || 0,
          sellerEarnings: orderData.sellerEarnings || 0
        };
        
        setOrder(transformedOrder);
      } else {
        setError(t('order_not_found'));
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError(t('failed_to_load_order_details'));
      console.log('Error response:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46F5" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            fetchOrderDetails();
          }}
        >
          <Text style={styles.retryButtonText}>{t('retry')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found</Text>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, hh:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <View style={styles.container}>
      <View className="bg-[#0B051D] px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <ChevronLeftIcon size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">{t('order_details')}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('order_information')}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('order_id')}:</Text>
            <Text style={styles.value}>{order.orderId || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('order_date')}:</Text>
            <Text style={styles.value}>
              {order.date || formatDate(order.createdAt || new Date().toISOString())}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('status')}:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{order.status || t('pending')}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('payment_method')}:</Text>
            <Text style={styles.value}>{order.paymentmode?.toUpperCase() || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('customer_information')}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('name')}:</Text>
            <Text style={styles.value}>
              {order.user?.firstName} {order.user?.lastName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('email')}:</Text>
            <Text style={styles.value}>{order.user?.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('phone')}:</Text>
            <Text style={styles.value}>{order.shipping_address?.phone || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('shipping_address')}</Text>
          <Text style={styles.addressText}>
            {order.shipping_address?.address || 'N/A'}{'\n'}
            {order.shipping_address?.city}{order.shipping_address?.state ? `, ${order.shipping_address.state}` : ''}{'\n'}
            {order.shipping_address?.country ? (
              typeof order.shipping_address.country === 'string' 
                ? order.shipping_address.country 
                : order.shipping_address.country.name || order.shipping_address.country.label || 'N/A'
            ) : 'N/A'}
            {order.shipping_address?.postalCode ? ` - ${order.shipping_address.postalCode}` : ''}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('order_items')}</Text>
          {order.productDetail?.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <Image
                source={{ 
                  uri: Array.isArray(item.image) && item.image.length > 0 
                    ? item.image[0] 
                    : 'https://via.placeholder.com/150?text=No+Image' 
                }}
                style={styles.productImage}
                resizeMode="contain"
              />
              <View style={styles.itemDetails}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.product?.name || 'Product Name'}
                </Text>
                <Text style={styles.productPrice}>
                  {currencySign}{item.price.toFixed(2)} x {item.qty || 1}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {currencySign}{(item.price * (item.qty || 1)).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('order_summary')}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('subtotal')}</Text>
            <Text style={styles.summaryValue}>{currencySign}{order.total?.toFixed(2) || '0.00'}</Text>
          </View>
          
          {/* Delivery Charge - Always show */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('delivery_charge')}</Text>
            <Text style={styles.summaryValue}>
              {order.deliveryCharge > 0 
                ? `${currencySign}${order.deliveryCharge.toFixed(2)}` 
                : t('free')}
            </Text>
          </View>
          
          {/* Tax - Always show */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {t('tax')} ({order.taxRate || 0}%)
            </Text>
            <Text style={styles.summaryValue}>
              {order.tax > 0 
                ? `${currencySign}${order.tax.toFixed(2)}` 
                : `${currencySign}0.00`}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t('total')}</Text>
            <Text style={styles.totalAmount}>{currencySign}{order.finalAmount?.toFixed(2) || order.total?.toFixed(2) || '0.00'}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.earningsRow]}>
            <Text style={styles.earningsLabel}>{t('your_earnings')}:</Text>
            <Text style={styles.earningsValue}>{currencySign}{order.sellerEarnings?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return '#F59E0B';
    case 'processing':
      return '#3B82F6';
    case 'shipped':
      return '#8B5CF6';
    case 'delivered':
      return '#10B981';
    case 'cancelled':
      return '#EF4444';
    default:
      return '#9CA3AF';
  }
};

const currencySign = '$';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  orderItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#F9FAFB',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemTotal: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    alignSelf: 'center',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  earningsRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderTopStyle: 'dashed',
  },
  earningsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4F46F5',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
});

export default OrderDetailsScreen;
