import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { GetApi } from '../../Helper/Service';
import { useTranslation } from 'react-i18next';
import COLORS from '../../constants/colors';

const TrackingScreen = ({ route, navigation }) => {
  const { orderId, trackingNumber } = route.params;
  const { t } = useTranslation();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTrackingData();
  }, []);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      let response;
      
      if (trackingNumber) {
        response = await GetApi(`shipmondo/track/${trackingNumber}`);

        console.log(response)
      } else if (orderId) {
        response = await GetApi(`shipmondo/order/${orderId}/shipping`);
        console.log(response)
      }

      if (response?.status && response.data) {
        setTrackingData(response.data);
      } else {
        Alert.alert(t('error'), t('tracking_not_found'));
      }
    } catch (error) {
      console.error('Tracking error:', error);
      Alert.alert(t('error'), t('failed_to_load_tracking'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrackingData();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
      case 'delivered': return '#10b981';
      case 'in_transit': return '#3b82f6';
      case 'shipped': return '#8b5cf6';
      case 'pending': return '#f59e0b';
      case 'exception': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
      case 'delivered': return '✅';
      case 'in_transit': return '🚚';
      case 'shipped': return '📦';
      case 'pending': return '⏳';
      case 'exception': return '⚠️';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeftIcon size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('track_shipment')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.dark} />
          <Text style={styles.loadingText}>{t('loading_tracking')}</Text>
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
        <Text style={styles.headerTitle}>{t('track_shipment')}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.dark]}
            tintColor={COLORS.dark}
          />
        }
      >
        {trackingData ? (
          <>
            {/* Tracking Info Card */}
            <View style={styles.trackingCard}>
              <View style={styles.trackingHeader}>
                {(trackingData.trackingNumber || trackingNumber) && (
                  <Text style={styles.trackingNumber}>
                    {t('tracking_number')}: {trackingData.trackingNumber || trackingNumber}
                  </Text>
                )}
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: getStatusColor(trackingData.status || trackingData.trackingData?.status) }
                ]}>
                  <Text style={styles.statusText}>
                    {getStatusIcon(trackingData.status || trackingData.trackingData?.status)} {' '}
                    {trackingData.status || trackingData.trackingData?.status || 'Pending'}
                  </Text>
                </View>
              </View>
              
              {(trackingData.orderNumber || trackingData.orderId) && (
                <Text style={styles.orderId}>
                  {t('order_id')}: {trackingData.orderNumber || trackingData.orderId}
                </Text>
              )}
              
              {trackingData.estimatedDeliveryDate && (
                <Text style={styles.estimatedDelivery}>
                  {t('estimated_delivery')}: {formatDate(trackingData.estimatedDeliveryDate)}
                </Text>
              )}
              
              {(trackingData.carrier || trackingData.trackingData?.carrier) && (
                <Text style={styles.carrier}>
                  {t('carrier')}: {trackingData.carrier || trackingData.trackingData?.carrier}
                </Text>
              )}
            </View>

            {/* Shipping Address */}
            {trackingData.shippingAddress && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('delivery_address')}</Text>
                <View style={styles.addressCard}>
                  <Text style={styles.addressName}>
                    {trackingData.shippingAddress.firstName} {trackingData.shippingAddress.lastName}
                  </Text>
                  <Text style={styles.addressText}>
                    {trackingData.shippingAddress.address}
                  </Text>
                  {trackingData.shippingAddress.apartment && (
                    <Text style={styles.addressText}>
                      {trackingData.shippingAddress.apartment}
                    </Text>
                  )}
                  <Text style={styles.addressText}>
                    {trackingData.shippingAddress.city}, {trackingData.shippingAddress.pinCode}
                  </Text>
                  <Text style={styles.addressText}>
                    {trackingData.shippingAddress.country}
                  </Text>
                </View>
              </View>
            )}

            {/* Tracking Events */}
            {trackingData.trackingData?.events && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('tracking_history')}</Text>
                {trackingData.trackingData.events.map((event, index) => (
                  <View key={index} style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventStatus}>{event.status}</Text>
                      <Text style={styles.eventDate}>{formatDate(event.timestamp)}</Text>
                    </View>
                    {event.location && (
                      <Text style={styles.eventLocation}>{event.location}</Text>
                    )}
                    {event.description && (
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* No tracking events fallback */}
            {(!trackingData.trackingData?.events || trackingData.trackingData.events.length === 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('tracking_status')}</Text>
                <View style={styles.eventCard}>
                  <Text style={styles.eventStatus}>
                    {trackingData.status || trackingData.trackingData?.status || 'Pending'}
                  </Text>
                  <Text style={styles.eventDescription}>
                    {t('tracking_info_will_update')}
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>{t('no_tracking_data')}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchTrackingData}>
              <Text style={styles.retryButtonText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        )}
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
    color: 'black',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  trackingCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.dark,
  },
  trackingHeader: {
    marginBottom: 12,
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  orderId: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  estimatedDelivery: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  carrier: {
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
  eventCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  eventDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  eventLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#374151',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 100,
  },
  noDataText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TrackingScreen;
