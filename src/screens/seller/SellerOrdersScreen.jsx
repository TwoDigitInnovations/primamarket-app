import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  FlatList,
  StyleSheet
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Api, Post, GetApi } from '../../Helper/Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, PencilIcon, TrashIcon } from 'react-native-heroicons/outline';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import ProductList from '../../components/ProductList';

const TabButton = ({ title, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-1 py-3 items-center justify-center border-b-2 ${active ? 'border-indigo-600' : 'border-gray-200'
      }`}
  >
    <Text
      className={`text-sm font-medium ${active ? 'text-indigo-600' : 'text-gray-500'
        }`}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

export default function SellerOrdersScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  // Infinite scroll states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  const fetchOrders = async (page = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }

      // Get seller ID from AsyncStorage
      const user = await AsyncStorage.getItem('userInfo');
      const userDetail = user ? JSON.parse(user) : null;
      const sellerId = userDetail?._id;

      console.log(t('user_info_from_async_storage_orders'), userDetail);

      if (!sellerId) {
        throw new Error(t('seller_id_not_found'));
      }

      console.log(t('fetching_orders_for_seller_id'), sellerId, 'Page:', page);

      // Fetch orders for the seller with pagination
      const limit = 20;
      const response = await Post(
        `getOrderBySeller?page=${page}&limit=${limit}`,
        { seller_id: sellerId }
      );

      console.log(t('orders_api_response'), response);

      if (response && response.status) {
        // Transform the API response to match your component's expected format
        const apiOrders = response.data || [];

        let formattedOrders = apiOrders.map(order => ({
          id: order._id,
          orderNumber: order.orderId || `ORD-${order._id.slice(-6).toUpperCase()}`,
          customerName: (order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : null) || t('guest_user'),
          date: new Date(order.createdAt).toLocaleDateString(),
          amount: order.total || 0,
          status: order.status || `${t('processing_status')}`,
          items: order.productDetail?.map(item => ({
            id: item.product?._id || '',
            name: item.product?.name || item.productDetails?.name || t('unknown_product'),
            price: item.price || 0,
            quantity: item.qty || item.quantity || 1,
            image: Array.isArray(item.image) && item.image.length > 0
              ? item.image[0]
              : (item.product?.images?.[0]?.url || 'https://via.placeholder.com/150?text=No+Image')
          })) || []
        }));

        console.log(t('formatted_orders'), formattedOrders);

        // Update pagination info
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setCurrentPage(response.pagination.currentPage || page);
          setHasMoreData(page < (response.pagination.totalPages || 1));
        }

        if (isLoadMore && page > 1) {
          // Append new orders to existing list
          setOrders(prevOrders => [...prevOrders, ...formattedOrders]);
        } else {
          // Replace orders list (for initial load or refresh)
          setOrders(formattedOrders);
          setCurrentPage(1);
        }
      } else {
        throw new Error(response?.message || t('failed_to_fetch_orders'));
      }
    } catch (error) {
      console.error(t('error_fetching_orders'), error);
      Alert.alert(t('error'), error.message || t('failed_to_load_orders'));

      // Only show fallback data on initial load, not for load more
      if (!isLoadMore) {
        // Fallback to mock data if API fails (for testing)
        const mockOrders = [
          {
            id: '1',
            orderNumber: 'ORD-001',
            customerName: 'John Doe',
            date: new Date().toLocaleDateString(),
            amount: 99.99,
            status: 'Pending',
            items: [
              { id: '1', name: 'Product 1', price: 49.99, quantity: 1 },
              { id: '2', name: 'Product 2', price: 50.00, quantity: 1 },
            ],
          },
        ];
        setOrders(mockOrders);
      }
    } finally {
      if (!isLoadMore) {
        setLoading(false);
        setRefreshing(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const fetchProducts = async (page = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }

      // Get seller ID from AsyncStorage
      const user = await AsyncStorage.getItem('userInfo');
      const userDetail = user ? JSON.parse(user) : null;
      const sellerId = userDetail?._id;

      console.log(t('user_info_from_async_storage_products'), userDetail);

      if (!sellerId) {
        throw new Error(t('seller_id_not_found'));
      }

      console.log(t('fetching_products_for_seller_id'), sellerId, 'Page:', page);

      // Use the seller-specific endpoint for products
      const response = await GetApi(`getSellerProducts?seller_id=${sellerId}&page=${page}&limit=20`, {});

      console.log('Products API Response:', response);

      if (response && response.status) {
        // Transform the API response to match your component's expected format
        const apiProducts = response.data || [];
        const formattedProducts = apiProducts.map(product => {
          // Get price from price_slot array
          const priceSlot = product.price_slot && product.price_slot.length > 0 ? product.price_slot[0] : null;
          const price = priceSlot?.price || priceSlot?.Offerprice || 0;

          // Get image from variants - FIX: Handle base64 image data
          let imageUrl = 'https://via.placeholder.com/150?text=No+Image';
          if (product.varients && product.varients.length > 0 && product.varients[0].image) {
            const imageData = product.varients[0].image;
            // Check if imageData is array and get first base64 image
            if (Array.isArray(imageData) && imageData.length > 0) {
              // Base64 images already have data:image prefix, use directly
              imageUrl = imageData[0];
            } else if (typeof imageData === 'string') {
              imageUrl = imageData;
            }
          }

          return {
            id: product._id,
            name: product.name || t('unnamed_product'),
            price: price,
            stock: product.sold_pieces || 0,
            image: imageUrl,
            category: product.category?.name || t('uncategorized'),
            status: product.status === 'verified' ? t('active_status') : t('inactive_status'),
            description: product.short_description || '',
            slug: product.slug || '',
            createdAt: product.createdAt
          };
        });

        console.log('Formatted products:', formattedProducts);

        // Update pagination info
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setCurrentPage(response.pagination.currentPage || page);
          setHasMoreData(page < (response.pagination.totalPages || 1));
        }

        if (isLoadMore && page > 1) {
          // Append new products to existing list
          setProducts(prevProducts => [...prevProducts, ...formattedProducts]);
        } else {
          // Replace products list (for initial load or refresh)
          setProducts(formattedProducts);
          setCurrentPage(1);
        }
      } else {
        throw new Error(response?.message || t('failed_to_fetch_products'));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert(t('error'), error.message || t('failed_to_load_products'));
    } finally {
      if (!isLoadMore) {
        setLoading(false);
        setRefreshing(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const deleteProduct = async (productId) => {
    try {
      Alert.alert(
        t('delete_product'),
        t('confirm_delete_product'),
        [
          {
            text: t('cancel'),
            style: 'cancel',
          },
          {
            text: t('delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                // Call the API to delete the product
                const response = await Api.delete(`products/delete/${productId}`);

                if (response && response.success) {
                  // Refresh the products list after successful deletion
                  await fetchProducts(1, false);
                  Alert.alert(t('success'), t('product_deleted_success'));
                } else {
                  throw new Error(response?.message || t('failed_to_delete_product'));
                }
              } catch (error) {
                console.error('Error deleting product:', error);
                Alert.alert(t('error'), error.message || t('failed_to_delete_product'));
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting product:', error);
      Alert.alert(t('error'), t('failed_to_delete_product'));
    }
  };

  // Debounced load more to prevent multiple rapid calls
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Handle infinite scroll - load more data when user reaches end
  const handleLoadMore = React.useCallback(() => {
    if (!loadingMore && !isLoadingMore && hasMoreData && currentPage < totalPages) {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      console.log('Loading more data, page:', nextPage);

      setTimeout(() => {
        if (activeTab === 'orders') {
          fetchOrders(nextPage, true);
        } else {
          fetchProducts(nextPage, true);
        }
        setIsLoadingMore(false);
      }, 100); // Small delay to prevent rapid calls
    }
  }, [loadingMore, isLoadingMore, hasMoreData, currentPage, totalPages, activeTab]);

  // Handle refresh - reset to first page
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMoreData(true);

    if (activeTab === 'orders') {
      fetchOrders(1, false);
    } else {
      fetchProducts(1, false);
    }
  }, [activeTab]);

  // Reset pagination when switching tabs
  React.useEffect(() => {
    setCurrentPage(1);
    setHasMoreData(true);

    if (activeTab === 'orders') {
      fetchOrders(1, false);
    } else {
      fetchProducts(1, false);
    }
  }, [activeTab]);

  const handleOrderPress = (order) => {
    navigation.navigate('OrderDetails', { orderId: order.id });
  };

  const renderOrderItem = ({ item }) => {
    // Get the translated status text
    const getStatusText = (status) => {
      switch (status) {
        case 'Delivered':
          return t('delivered_status');
        case 'Processing':
        case 'Pending':
          return t('processing_status');
        default:
          return status;
      }
    };

    const statusText = getStatusText(item.status);

    return (
      <TouchableOpacity
        className="bg-white rounded-lg p-4 shadow-sm mb-3"
        onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
        activeOpacity={0.7}
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <Text className="font-semibold text-gray-900" numberOfLines={1}>{item.orderNumber}</Text>
            <Text className="text-sm text-gray-500" numberOfLines={1}>{item.customerName}</Text>
            <Text className="text-sm text-gray-500">{item.date}</Text>
          </View>
          <View className="items-end">
            <Text className="font-semibold">${item.amount?.toFixed(2) || '0.00'}</Text>
            <View className={`px-2 py-1 rounded-full mt-1 ${item.status === 'Delivered' ? 'bg-green-100' :
              item.status === 'Processing' || item.status === 'Pending' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
              <Text className={`text-xs ${item.status === 'Delivered' ? 'text-green-800' :
                item.status === 'Processing' || item.status === 'Pending' ? 'text-yellow-800' :
                  'text-blue-800'
                }`} numberOfLines={1}>
                {statusText}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Footer component for loading indicator
  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View className="py-6 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46F5" />
        <Text className="text-gray-600 text-base mt-3 font-medium">{t('loading_more')}</Text>
      </View>
    );
  };

  if (loading && !refreshing && orders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Orders</Text>
          <View style={styles.headerRight} />
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#E58F14" />
          <Text className="text-gray-600 text-lg mt-4 font-medium">{t('loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View className="bg-[#0B051D] px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <ChevronLeftIcon size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">{t('Orders')}</Text>
        </View>
      </View>

      {/* Orders List with Infinite Scroll */}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        // Infinite scroll props
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3} // Trigger earlier when user is 30% from the bottom
        ListFooterComponent={renderFooter}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={15}
        initialNumToRender={15}
        updateCellsBatchingPeriod={50}
        getItemLayout={(data, index) => (
          { length: 100, offset: 100 * index, index } // Approximate item height
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-10">
            <Text className="text-gray-500 text-lg">{t('no_orders_found')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9fafb' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#1F2937', 
    paddingHorizontal: 16, 
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: { 
    padding: 8,
    marginLeft: -8,
  },
  backIcon: { 
    fontSize: 32, 
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: { 
    width: 40,
  },
});