import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { GetApi } from '../../Helper/Service';
import { useTranslation } from 'react-i18next';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useCurrency } from '../../context/CurrencyContext';
import COLORS from '../../constants/colors';

const OrderDetails = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { t } = useTranslation();
  const { convertPrice, currencySymbol } = useCurrency();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      console.log('🔍 ORDER DETAILS DEBUG:');
      console.log('Received orderId:', orderId);
      
      const response = await GetApi(`getProductRequestbyUser?orderId=${orderId}`);
      console.log('API Response data length:', response?.data?.length);
      
      if (response?.data && response.data.length > 0) {
        // Backend returns all orders, so filter by orderId
        const matchingOrder = response.data.find(order => 
          order.orderId === orderId || order._id === orderId
        );
        
        if (matchingOrder) {
          console.log('✅ Found matching order:', matchingOrder.orderId);
          setOrder(matchingOrder);
        } else {
          console.log('⚠️ No matching order found for:', orderId);
          // Fallback to first order if no match (shouldn't happen)
          setOrder(response.data[0]);
        }
      } else {
        console.log('⚠️ No order data found in response');
      }
    } catch (error) {
      console.error('❌ Error fetching order details:', error);
      Alert.alert(t('error'), t('failed_to_load_order_details'));
    } finally {
      setLoading(false);
    }
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
  
      const apiLevel = Platform.Version;
      
      if (apiLevel >= 33) {
        // Android 13+ - No permission needed for downloads
        return true;
      }
      
      // Android 12 and below - Request permission
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to your storage to download invoice',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const downloadInvoice = async () => {
    try {
      setDownloadingInvoice(true);
      
      // Request permission for Android
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert(t('error'), 'Storage permission required to download invoice');
        setDownloadingInvoice(false);
        return;
      }

      console.log('Downloading invoice for order:', orderId);
      
      
      const { API_BASE_URL } = require('../../config');
      
    
      const downloadUrl = `${API_BASE_URL}generateInvoice/${orderId}`;
      
      console.log('Download URL:', downloadUrl);
      
      const { dirs } = ReactNativeBlobUtil.fs;
      const downloads = Platform.OS === 'ios' ? dirs.DocumentDir : dirs.DownloadDir;
      
      const fileName = `invoice_${orderId}_${Date.now()}.pdf`;
      const filePath = `${downloads}/${fileName}`;

      console.log('Saving to:', filePath);

      const configOptions = Platform.select({
        ios: {
          fileCache: true,
          path: filePath,
          appendExt: 'pdf',
        },
        android: {
          fileCache: true,
          path: filePath,
          appendExt: 'pdf',
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            path: filePath,
            description: 'Downloading invoice',
            mime: 'application/pdf',
            mediaScannable: true,
          },
        },
      });

      // Get auth token from AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('userToken');
      
      console.log('Token found:', token ? 'Yes' : 'No');
      
      if (!token) {
        Alert.alert(t('error'), 'Authentication token not found. Please login again.');
        setDownloadingInvoice(false);
        return;
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
      };

      console.log('📥 Starting download with config:', configOptions);
      console.log('📥 Headers:', headers);

      // First, test if API is responding
      console.log('📥 Testing API endpoint...');
      try {
        const testResponse = await fetch(downloadUrl, {
          method: 'HEAD',
          headers: headers,
        });
        console.log('📥 API test response status:', testResponse.status);
        
        if (testResponse.status === 404) {
          throw new Error('Invoice not found on server');
        }
        if (testResponse.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        if (testResponse.status !== 200) {
          throw new Error(`Server error: ${testResponse.status}`);
        }
      } catch (testError) {
        console.error('❌ API test failed:', testError);
        throw testError;
      }

      console.log('📥 API test passed, starting download...');

      // Add timeout wrapper
      const downloadPromise = ReactNativeBlobUtil.config(configOptions)
        .fetch('GET', downloadUrl, headers);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Download timeout after 30 seconds')), 30000)
      );
      
      const res = await Promise.race([downloadPromise, timeoutPromise]);
    
      // Check if response is successful
      const statusCode = res.info()?.status;
 
      
      if (statusCode && statusCode !== 200) {
        throw new Error(`Server returned status ${statusCode}`);
      }
      
      if (Platform.OS === 'ios') {
        ReactNativeBlobUtil.ios.openDocument(res.path());
      }
      
      Alert.alert(
        t('success'),
        Platform.OS === 'android' 
          ? 'Invoice downloaded to Downloads folder' 
          : 'Invoice downloaded successfully',
        [
          {
            text: 'Open',
            onPress: () => {
              if (Platform.OS === 'android') {
                ReactNativeBlobUtil.android.actionViewIntent(res.path(), 'application/pdf');
              }
            }
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error downloading invoice:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to download invoice';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      Alert.alert(t('error'), errorMessage);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'completed') return '#10b981';
    if (statusLower === 'pending') return '#f59e0b';
    if (statusLower === 'cancelled') return '#ef4444';
    return '#6b7280';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeftIcon size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('order_details')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#12344D" />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeftIcon size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('order_details')}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('order_not_found')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeftIcon size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('order_details')}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Order Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.orderNumber}>Order #{order.orderId || order._id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{order.status || 'Pending'}</Text>
            </View>
          </View>
          <Text style={styles.orderDate}>{formatDate(order.createdAt || order.updatedAt)}</Text>
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('products')}</Text>
          {order.productDetail && order.productDetail.map((product, index) => (
            <View key={index} style={styles.productCard}>
              <Image
                source={{
                  uri: (Array.isArray(product.image) ? product.image[0] : product.image) || 
                       'https://via.placeholder.com/80'
                }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.product?.name || product.name}
                </Text>
                {product.color && (
                  <View style={styles.colorRow}>
                    <Text style={styles.colorLabel}>{t('color')}:</Text>
                    <View style={[styles.colorDot, { backgroundColor: product.color }]} />
                  </View>
                )}
                <Text style={styles.productQty}>
                  {t('quantity')}: {product.qty || product.quantity || 1}
                </Text>
                <Text style={styles.productPrice}>
                  {currencySymbol} {convertPrice((product.price || 0) * (product.qty || product.quantity || 1)).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        {(order.shipping_address || order.address) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('delivery_address')}</Text>
            <View style={styles.addressCard}>
              <Text style={styles.addressName}>
                {order.shipping_address?.firstName || order.address?.name || order.address?.fullName || 'Customer'} {order.shipping_address?.lastName || ''}
              </Text>
              {order.shipping_address?.companyName && (
                <Text style={styles.addressText}>{order.shipping_address.companyName}</Text>
              )}
              <Text style={styles.addressText}>
                {order.shipping_address?.address || order.address?.street || order.address?.address || ''}
              </Text>
              {order.shipping_address?.apartment && (
                <Text style={styles.addressText}>{order.shipping_address.apartment}</Text>
              )}
              <Text style={styles.addressText}>
                {order.shipping_address?.city || order.address?.city}, {order.shipping_address?.pinCode || order.address?.zipCode || order.address?.postalCode}
              </Text>
              <Text style={styles.addressText}>
                {order.shipping_address?.country?.name || order.address?.country || ''}
              </Text>
              {(order.shipping_address?.phoneNumber || order.address?.phone) && (
                <Text style={styles.addressPhone}>
                  {t('phone')}: {order.shipping_address?.phoneNumber || order.address?.phone}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('payment_summary')}</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('subtotal')}</Text>
              <Text style={styles.summaryValue}>
                {currencySymbol} {convertPrice((order.total || 0) - (order.tax || 0) - (order.deliveryCharge || 0)).toLocaleString()}
              </Text>
            </View>
            {order.tax > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('tax')}</Text>
                <Text style={styles.summaryValue}>{currencySymbol} {convertPrice(order.tax || 0).toLocaleString()}</Text>
              </View>
            )}
            {order.deliveryCharge > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('delivery_charge')}</Text>
                <Text style={styles.summaryValue}>{currencySymbol} {convertPrice(order.deliveryCharge || 0).toLocaleString()}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{t('total')}</Text>
              <Text style={styles.totalValue}>{currencySymbol} {convertPrice(order.total || 0).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Get Invoice Button */}
        <TouchableOpacity
          style={[styles.invoiceButton, downloadingInvoice && styles.invoiceButtonDisabled]}
          onPress={downloadInvoice}
          disabled={downloadingInvoice}
        >
          {downloadingInvoice ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.invoiceButtonText}>{t('get_invoice')}</Text>
          )}
        </TouchableOpacity>

        {/* Track Shipment Button */}
        {(order.trackingNumber || order.shipmondoShipmentId) && (
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => navigation.navigate('TrackingScreen', {
              orderId: order.orderId || order._id,
              trackingNumber: order.trackingNumber
            })}
          >
            <Text style={styles.trackButtonText}>{t('track_shipment')}</Text>
          </TouchableOpacity>
        )}

        {/* Demo Track Shipment Button */}
        <TouchableOpacity
          style={[styles.trackButton, { backgroundColor: '#10b981' }]}
          onPress={() => {
            navigation.navigate('TrackingScreen', {
              orderId: order?.orderId || order?._id,
              trackingNumber: order?.trackingNumber || 'DEMO-TRACK-' + (order?.orderId || '123')
            });
          }}
        >
          <Text style={styles.trackButtonText}>🚚 {t('track_shipment')} (Demo)</Text>
        </TouchableOpacity>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ff66c4',
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
    color: '#00000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#12344D',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  productQty: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#12344D',
  },
  addressCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: '#12344D',
    fontWeight: '500',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    color: '#12344D',
  },
  invoiceButton: {
    backgroundColor: COLORS.dark,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  invoiceButtonDisabled: {
    opacity: 0.6,
  },
  invoiceButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  trackButton: {
    backgroundColor: '#3b82f6',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  trackButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrderDetails;
