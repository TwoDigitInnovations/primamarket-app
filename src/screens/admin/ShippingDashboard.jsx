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
  FlatList,
} from 'react-native';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { GetApi, Post } from '../../Helper/Service';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import COLORS from '../../constants/colors';

const ShippingDashboard = ({ navigation }) => {
  const { t } = useTranslation();
  const { convertPrice, currencySymbol } = useCurrency();
  const [stats, setStats] = useState(null);
  const [readyOrders, setReadyOrders] = useState([]);
  const [shippedOrders, setShippedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ready');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, readyRes, shippedRes] = await Promise.all([
        GetApi('admin/shipmondo/shipping/stats'),
        GetApi('admin/shipmondo/orders/ready-for-shipping'),
        GetApi('admin/shipmondo/orders/shipped')
      ]);

      if (statsRes?.status) setStats(statsRes.data);
      if (readyRes?.status) setReadyOrders(readyRes.data);
      if (shippedRes?.status) setShippedOrders(shippedRes.data);
    } catch (error) {
      console.error('Error fetching shipping data:', error);
      Alert.alert(t('error'), t('failed_to_load_data'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const createShipment = async (orderId) => {
    try {
      const response = await Post(`admin/shipmondo/order/${orderId}/create-shipment`);
      if (response?.status) {
        Alert.alert(t('success'), t('shipment_created_successfully'));
        fetchData();
      } else {
        Alert.alert(t('error'), response?.message || t('failed_to_create_shipment'));
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
      Alert.alert(t('error'), t('failed_to_create_shipment'));
    }
  };

  const bulkCreateShipments = async () => {
    if (selectedOrders.length === 0) {
      Alert.alert(t('error'), t('please_select_orders'));
      return;
    }

    Alert.alert(
      t('confirm'),
      t('create_shipments_for_selected_orders'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('create'),
          onPress: async () => {
            try {
              setBulkProcessing(true);
              const response = await Post('admin/shipmondo/shipments/bulk-create', {
                orderIds: selectedOrders
              });

              if (response?.status) {
                const { successful, failed } = response.data;
                Alert.alert(
                  t('bulk_process_complete'),
                  `${t('successful')}: ${successful.length}\n${t('failed')}: ${failed.length}`
                );
                setSelectedOrders([]);
                fetchData();
              }
            } catch (error) {
              console.error('Bulk create error:', error);
              Alert.alert(t('error'), t('bulk_process_failed'));
            } finally {
              setBulkProcessing(false);
            }
          }
        }
      ]
    );
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const renderStatsCard = (title, value, color) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  );

  const renderOrderItem = ({ item }) => {
    const isSelected = selectedOrders.includes(item._id);
    const isReady = activeTab === 'ready';

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          {isReady && (
            <TouchableOpacity
              style={[styles.checkbox, isSelected && styles.checkboxSelected]}
              onPress={() => toggleOrderSelection(item._id)}
            >
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          )}
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>Order #{item.orderId}</Text>
            <Text style={styles.customerName}>
              {item.user?.first_name} {item.user?.last_name}
            </Text>
            <Text style={styles.orderTotal}>
              {currencySymbol} {convertPrice(item.total || 0).toLocaleString()}
            </Text>
          </View>
          {isReady ? (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => createShipment(item._id)}
            >
              <Text style={styles.createButtonText}>{t('create_shipment')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.shippingInfo}>
              <Text style={styles.trackingNumber}>
                {item.trackingNumber || 'N/A'}
              </Text>
              <Text style={[styles.shippingStatus, { color: getStatusColor(item.shippingStatus) }]}>
                {item.shippingStatus || 'shipped'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return '#10b981';
      case 'in_transit': return '#3b82f6';
      case 'shipped': return '#8b5cf6';
      case 'exception': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeftIcon size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('shipping_dashboard')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.dark} />
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
        <Text style={styles.headerTitle}>{t('shipping_dashboard')}</Text>
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
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            {renderStatsCard(t('ready_to_ship'), stats.readyToShip, '#f59e0b')}
            {renderStatsCard(t('shipped'), stats.shipped, '#8b5cf6')}
            {renderStatsCard(t('in_transit'), stats.inTransit, '#3b82f6')}
            {renderStatsCard(t('delivered'), stats.delivered, '#10b981')}
            {renderStatsCard(t('exceptions'), stats.exceptions, '#ef4444')}
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ready' && styles.activeTab]}
            onPress={() => setActiveTab('ready')}
          >
            <Text style={[styles.tabText, activeTab === 'ready' && styles.activeTabText]}>
              {t('ready_to_ship')} ({readyOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'shipped' && styles.activeTab]}
            onPress={() => setActiveTab('shipped')}
          >
            <Text style={[styles.tabText, activeTab === 'shipped' && styles.activeTabText]}>
              {t('shipped')} ({shippedOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bulk Actions */}
        {activeTab === 'ready' && selectedOrders.length > 0 && (
          <View style={styles.bulkActions}>
            <Text style={styles.selectedCount}>
              {selectedOrders.length} {t('orders_selected')}
            </Text>
            <TouchableOpacity
              style={[styles.bulkButton, bulkProcessing && styles.bulkButtonDisabled]}
              onPress={bulkCreateShipments}
              disabled={bulkProcessing}
            >
              {bulkProcessing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.bulkButtonText}>{t('create_all_shipments')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Orders List */}
        <FlatList
          data={activeTab === 'ready' ? readyOrders : shippedOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.ordersList}
        />
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
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    flex: 1,
    minWidth: '45%',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.dark,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#ffffff',
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  selectedCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  bulkButton: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkButtonDisabled: {
    opacity: 0.6,
  },
  bulkButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  ordersList: {
    paddingHorizontal: 16,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.dark,
    borderColor: COLORS.dark,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  createButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  shippingInfo: {
    alignItems: 'flex-end',
  },
  trackingNumber: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  shippingStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default ShippingDashboard;