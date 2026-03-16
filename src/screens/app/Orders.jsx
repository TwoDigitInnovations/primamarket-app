import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { ChevronLeftIcon, ChevronDownIcon, ChevronUpIcon } from 'react-native-heroicons/outline';
import { useAuth } from '../../context/AuthContext';
import { GetApi, Post } from '../../Helper/Service';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCurrency } from '../../context/CurrencyContext';
import COLORS from '../../constants/colors';


const OrdersScreen = ({ navigation }) => {
  const { userInfo } = useAuth();
  const { t } = useTranslation();
  const { convertPrice, currencySymbol } = useCurrency();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const limit = 10;

  // Close success popup after 3 seconds
  useEffect(() => {
    if (showSuccessPopup) {
      const timer = setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessPopup]);





  const openRatingModal = (product, order) => {
    const existingReview = product.review || (product.rating ? {
      rating: product.rating,
      description: product.reviewText || '',
      createdAt: product.reviewDate || new Date().toISOString()
    } : null);

    setSelectedProduct({
      ...product,
      orderId: order._id,
      existingReview
    });

    if (existingReview) {
      setRating(existingReview.rating || 0);
      setReviewText(existingReview.description || '');
    } else {
      setRating(0);
      setReviewText('');
    }

    setShowRatingModal(true);
  };

  const submitRating = async () => {
    if (rating === 0) {
      alert(t('please_select_rating'));
      return;
    }

    if (isSubmittingRating) {
      return;
    }

    setIsSubmittingRating(true);

    const productId = selectedProduct.product?._id || selectedProduct._id;
    const orderId = selectedProduct.orderId;
    const trimmedReviewText = reviewText.trim();

    const data = {
      product: productId,
      rating: rating,
      review: trimmedReviewText || ''
    };

    const updateOrderState = (apiResult = {}) => {
      setOrders(prevOrders => {
        return prevOrders.map(order => {
          if (order._id === orderId) {
            return {
              ...order,
              productDetail: order.productDetail.map(item => {
                const itemProductId = item.product?._id || item._id;
                if (itemProductId === productId) {
                  const newReview = {
                    rating: rating,
                    description: trimmedReviewText,
                    createdAt: new Date().toISOString(),
                    isRated: true,
                    posted_by: {
                      id: userInfo?.id || userInfo?._id,
                      _id: userInfo?.id || userInfo?._id
                    }
                  };

                  return {
                    ...item,
                    isRated: true,
                    rating: rating,
                    review: newReview
                  };
                }
                return item;
              })
            };
          }
          return order;
        });
      });
    };

    try {
      const result = await Post('addreview', data, { navigation });
      updateOrderState(result);

      setShowRatingModal(false);
      setShowSuccessPopup(true);

      // Refresh orders after a short delay to ensure the backend has processed the update
      setTimeout(() => {
        fetchOrders(true);
      }, 1000);

    } catch (error) {
      console.error('Error in submitRating:', error);
      // Still update the UI optimistically
      updateOrderState();
      alert(t('review_submitted_offline'));
    } finally {
      setIsSubmittingRating(false);
    }
  };


  const groupOrdersByOrderNumber = (orders) => {
    const groupedOrders = {};

    orders.forEach(order => {
      const orderKey = order.orderNumber || order._id;
      if (!groupedOrders[orderKey]) {
        groupedOrders[orderKey] = {
          ...order,
          productDetail: [],
          total: order.total || 0
        };
      }

      let productsToAdd = [];

      const processProduct = (product) => {
        // Check if the product has a rating either directly or in the review object
        const hasRating = (product.rating && product.rating > 0) ||
          (product.review && product.review.rating && product.review.rating > 0);

        // Preserve existing isRated if it's already true, otherwise use hasRating
        const isRated = product.isRated === true ? true : hasRating;

        // Create a consistent review object
        let review = null;
        if (product.review) {
          review = {
            ...product.review,
            rating: product.review.rating || 0,
            description: product.review.description || '',
            createdAt: product.review.createdAt || new Date().toISOString()
          };
        } else if (product.rating) {
          review = {
            rating: product.rating,
            description: product.reviewText || '',
            createdAt: product.reviewDate || new Date().toISOString()
          };
        }

        return {
          ...product,
          isRated,
          review,
          // Ensure rating is set at the root level for backward compatibility
          rating: review?.rating || 0
        };
      };

      if (order.productDetail && Array.isArray(order.productDetail)) {
        productsToAdd = order.productDetail.map(processProduct);
      } else if (order.products && Array.isArray(order.products)) {
        productsToAdd = order.products.map(product => {
          const processed = processProduct(product);
          return {
            ...processed,
            product: product.product || {
              _id: product._id,
              name: product.name,
              price: product.price
            },
            image: Array.isArray(product.image) ? product.image : [product.image || 'https://via.placeholder.com/60'],
            qty: product.qty || product.quantity || 1,
            price: product.price || 0
          };
        });
      } else if (order.name) {
        const processed = processProduct(order);
        productsToAdd = [{
          ...processed,
          _id: order._id,
          product: {
            _id: order._id,
            name: order.name,
            price: order.price
          },
          image: Array.isArray(order.image) ? order.image : [order.image || 'https://via.placeholder.com/60'],
          qty: order.qty || order.quantity || 1,
          price: order.price || 0
        }];
      }

      groupedOrders[orderKey].productDetail = [
        ...(groupedOrders[orderKey].productDetail || []),
        ...productsToAdd
      ];
    });

    return Object.values(groupedOrders);
  };

  const fetchOrders = async (isRefreshing = false) => {
    try {
      setLoading(true);

      if (isRefreshing) {
        setPage(1);
        setHasMore(true);
      }

      const currentPage = isRefreshing ? 1 : page;
      const response = await GetApi(`getProductRequestbyUser?page=${currentPage}&limit=${limit}`);

      if (response?.data) {
        const ordersData = Array.isArray(response.data) ? response.data : [];
        console.log('📦 ORDERS API Response:', ordersData.length, 'orders');
        console.log('First order sample:', ordersData[0]);
        console.log('First order _id:', ordersData[0]?._id);
        console.log('First order orderId:', ordersData[0]?.orderId);

        const groupedOrders = groupOrdersByOrderNumber(ordersData);
        console.log('📦 Grouped orders:', groupedOrders.length, 'groups');

        if (isRefreshing || currentPage === 1) {
          setOrders(groupedOrders);
        } else {
          setOrders(prevOrders => {
            const combined = [...prevOrders, ...ordersData];
            return groupOrdersByOrderNumber(combined);
          });
        }

        setHasMore(ordersData.length === limit);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setOrders([]);
    fetchOrders(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        try {
          await fetchOrders(true);
        } catch (error) {
          console.error('Error in focus effect:', error);
        }
      };

      if (isActive) {
        loadData();
      }

      return () => {
        isActive = false;
      };
    }, [])
  );

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusStyle = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'completed') {
      return { backgroundColor: '#dcfce7', color: '#166534' };
    } else if (statusLower === 'pending') {
      return { backgroundColor: '#fef3c7', color: '#92400e' };
    }
    return { backgroundColor: '#f3f4f6', color: '#374151' };
  };


  const renderOrderItem = (item, index) => {
    const isExpanded = expandedOrderId === item._id;
    const hasProducts = item.productDetail && item.productDetail.length > 0;
    const displayOrderId = item.orderId || item._id;

    // Add this debug log
    console.log('Debug - Order products:', item.productDetail?.map(p => ({
      name: p.product?.name || p.name,
      isRated: p.isRated,
      hasRating: !!p.rating,
      hasReview: !!p.review,
      ratingValue: p.rating,
      reviewData: p.review
    })));

    return (
      <View key={item._id} style={styles.orderCard}>
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <View style={styles.orderNumber}>
              <Text style={styles.orderNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.orderInfo}>
              <Text style={styles.orderTitle}>Order #{displayOrderId}</Text>
              <Text style={styles.orderDate}>{formatDate(item.createdAt || item.updatedAt)}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => toggleOrderDetails(item._id)}
            style={styles.toggleIcon}
          >
            {isExpanded ? (
              <ChevronUpIcon size={20} color="#12344D" />
            ) : (
              <ChevronDownIcon size={20} color="#12344D" />
            )}
          </TouchableOpacity>
        </View>

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <Text style={styles.totalAmount}>
            {t('total_amount')}: <Text style={styles.totalValue}>{currencySymbol} {convertPrice(item.total || 0).toLocaleString()}</Text>
          </Text>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusBadge, getStatusStyle(item.status)]}>
              {item.status || t('pending')}
            </Text>
          </View>
        </View>

        {/* Expanded Order Details */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {hasProducts ? (
              <>
                {item.productDetail.map((product, productIndex) => (
                  <View key={`${item._id}-${productIndex}`} style={styles.productItem}>
                    <Image
                      source={{
                        uri: (Array.isArray(product.image) ? product.image[0] : product.image) || 'https://via.placeholder.com/80'
                      }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                    <View style={styles.productDetails}>
                      <View style={styles.productHeader}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.product?.name || product.name || 'Product Name'}
                        </Text>
                        {product.isRated || (product.review && product.review.rating > 0) ? (
                          <TouchableOpacity
                            style={[styles.rateButton, styles.updateButton]}
                            onPress={() => openRatingModal(product, item)}
                            disabled={isSubmittingRating}
                          >
                            <Text style={styles.rateButtonText}>{t('update_review')}</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.rateButton}
                            onPress={() => openRatingModal(product, item)}
                            disabled={isSubmittingRating}
                          >
                            <Text style={styles.rateButtonText}>{t('rate_product')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {product.color && (
                        <View style={styles.colorContainer}>
                          <Text style={styles.colorLabel}>{t('color')}:</Text>
                          <View
                            style={[styles.colorDot, { backgroundColor: product.color }]}
                          />
                        </View>
                      )}

                      <Text style={styles.productQuantity}>
                        {t('quantity')}: {product.qty || product.quantity || 1}
                      </Text>
                      <Text style={styles.orderId} numberOfLines={1}>
                        {t('order_id')}: {item.orderId || item._id}
                      </Text>
                    </View>
                    <View style={styles.productPrice}>
                      <Text style={styles.priceText}>
                        {currencySymbol} {convertPrice((product.price || 0) * (product.qty || product.quantity || 1)).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}


                <View style={styles.orderFooterInfo}>
                  {item.tax && (
                    <View style={styles.infoTag}>
                      <Text style={styles.infoTagText}>{t('tax')}: {currencySymbol} {convertPrice(item.tax || 0).toLocaleString()}</Text>
                    </View>
                  )}
                  {item.deliveryCharge && (
                    <View style={styles.infoTag}>
                      <Text style={styles.infoTagText}>
                        {t('delivery_charge')}: {currencySymbol} {convertPrice(item.deliveryCharge || 0).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* View Details Button */}
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => {
                   
                    navigation.navigate('OrderDetails', { orderId: item.orderId || item._id });
                  }}
                >
                  <Text style={styles.viewDetailsText}>{t('view_details')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noProductsContainer}>
                <Text style={styles.noProductsText}>{t('no_product_details_available')}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ff66c4" />
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ChevronLeftIcon size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('my_orders')}</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#12344D" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ChevronLeftIcon size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('my_orders')}</Text>
        </View>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('no_orders_yet')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('no_orders_message')}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={styles.startShoppingButton}
          >
            <Text style={styles.startShoppingText}>{t('start_shopping')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#12344D']}
              tintColor="#12344D"
            />
          }
          onScrollEndDrag={({ nativeEvent }) => {
            if (hasMore && !loading && !refreshing &&
              nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
              nativeEvent.contentSize.height - 20) {
              setPage(prevPage => prevPage + 1);
            }
          }}
          scrollEventThrottle={400}
        >


          {orders.map((order, index) => renderOrderItem(order, index))}

          {loading && orders.length > 0 && (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#12344D" />
            </View>
          )}
        </ScrollView>
      )}
      <Modal
        visible={showRatingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRatingModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedProduct?.isRated ? t('update_review') : t('rate_product')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowRatingModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Rest of your modal content remains the same */}
                {/* Product Info */}
                <View style={styles.productInfoSection}>
                  <Image
                    source={{
                      uri: (Array.isArray(selectedProduct.image) ?
                        selectedProduct.image[0] :
                        selectedProduct.image) || 'https://via.placeholder.com/120'
                    }}
                    style={styles.modalProductImage}
                  />
                  <View style={styles.modalProductDetails}>
                    <Text style={styles.modalProductName}>
                      {selectedProduct.product?.name || selectedProduct.name || 'Product Name'}
                    </Text>
                    <Text style={styles.modalProductPrice}>
                      {currencySymbol} {convertPrice(selectedProduct.price || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Rating Stars */}
                <View style={styles.ratingSection}>
                  <Text style={styles.ratingLabel}>{t('your_rating')}</Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                        style={styles.starButton}
                      >
                        <Text style={[
                          styles.starText,
                          { color: star <= rating ? '#E58F14' : '#d1d5db' }
                        ]}>
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.ratingText}>
                    {rating === 0 ? t('tap_to_rate') :
                      rating === 1 ? t('poor') :
                        rating === 2 ? t('fair') :
                          rating === 3 ? t('good') :
                            rating === 4 ? t('very_good') : t('excellent')}
                  </Text>
                </View>

                {/* Review Text */}
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewLabel}>{t('write_review_optional')}</Text>
                  <TextInput
                    style={styles.reviewInput}
                    placeholder={t('share_your_experience')}
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    value={reviewText}
                    onChangeText={setReviewText}
                    textAlignVertical="top"
                  />
                </View>

                {/* Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowRatingModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitButton, isSubmittingRating && { opacity: 0.6 }]}
                    onPress={submitRating}
                    disabled={isSubmittingRating}
                  >
                    <Text style={styles.submitButtonText}>
                      {isSubmittingRating ? t('submitting') || 'Submitting...' : t('submit')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Popup */}
      <Modal
        transparent={true}
        visible={showSuccessPopup}
        animationType="fade"
        onRequestClose={() => setShowSuccessPopup(false)}
      >
        <View style={styles.successPopupOverlay}>
          <View style={styles.successPopup}>
            <Text style={styles.successPopupText}>{t('thank_you_review')}</Text>
          </View>
        </View>
      </Modal>
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
  },
  headerContent: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  startShoppingButton: {
    backgroundColor: COLORS.mainColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startShoppingText: {
    color: 'white',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Increased for tab bar space
  },
  ordersHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ordersTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#E58F14',
    marginBottom: 8,
  },
  ordersSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#12344D',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#12344D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  rateButton: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  updateButton: {
    backgroundColor: '#E58F14',
  },
  ratedContainer: {
    backgroundColor: '#e5f7e5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  ratedText: {
    color: '#2e7d32',
    fontSize: 12,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6b7280',
    lineHeight: 24,
  },
  modalBody: {
    padding: 16,
  },
  productInfoSection: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  modalProductImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  modalProductDetails: {
    flex: 1,
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  modalProductPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  ratingSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starButton: {
    padding: 8,
  },
  starText: {
    fontSize: 32,
  },
  ratingText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '500',
  },
  reviewSection: {
    marginBottom: 20,
  },
  reviewLabel: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 8,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  successPopupOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  successPopup: {
    backgroundColor: '#E58F14',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    marginBottom: 30,
  },
  successPopupText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#4b5563',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  toggleIcon: {
    padding: 4,
  },
  orderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  totalAmount: {
    fontSize: 16,
    color: '#374151',
  },
  totalValue: {
    fontWeight: '600',
    color: '#12344D',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '500',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  productItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#12344D',
    borderRadius: 8,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  updateButton: {
    backgroundColor: '#E58F14',
  },
  rateButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorLabel: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '600',
    marginRight: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000',
  },
  productQuantity: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  productPrice: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 80,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  orderFooterInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  infoTag: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  infoTagText: {
    fontSize: 12,
    color: '#12344D',
    fontWeight: '500',
  },
  noProductsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noProductsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#12344D',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  productInfoSection: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalProductImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#12344D',
  },
  modalProductDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  modalProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  modalProductPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E58F14',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#12344D',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  starButton: {
    marginHorizontal: 4,
    padding: 4,
  },
  starText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#12344D',
    marginBottom: 12,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#12344D',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    backgroundColor: '#f9fafb',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#12344D',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#12344D',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
     backgroundColor: COLORS.dark,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  viewDetailsButton: {
    backgroundColor: COLORS.dark,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OrdersScreen;