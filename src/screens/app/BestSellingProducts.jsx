import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeftIcon, ChevronLeftIcon } from 'react-native-heroicons/outline';
import { useTranslation } from 'react-i18next';
import { GetApi } from '../../Helper/Service';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCurrency } from '../../context/CurrencyContext';


const { width } = Dimensions.get('window');

const BestSellingProducts = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { convertPrice, currencySymbol } = useCurrency();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchProducts = useCallback(async (pageNum = 1, isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      console.log('Fetching products, page:', pageNum);
      const response = await GetApi(`getProduct?page=${pageNum}&is_verified=true`, {});
      console.log('Full API Response:', response);

      if (!response) {
        console.error('No response from API');
        return;
      }

      // Extract products from response
      const newProducts = response.data || [];
      console.log('Extracted products count:', newProducts.length);
      console.log('First product sample:', newProducts[0]); // Add this line

      // Update products state
      setProducts(prevProducts => {
        const updatedProducts = isRefreshing || pageNum === 1 ?
          [...newProducts] :
          [...prevProducts, ...newProducts.filter(p => !prevProducts.some(prev => prev._id === p._id))];

        console.log('Updated products state count:', updatedProducts.length); // Add this line
        console.log('Products state sample:', updatedProducts[0]); // Add this line

        return updatedProducts;
      });

      // Update pagination state
      if (response.pagination) {
        const { currentPage, totalPages } = response.pagination;
        console.log('Pagination:', { currentPage, totalPages, hasMore: currentPage < totalPages });
        setHasMore(currentPage < totalPages);
      } else {
        setHasMore(newProducts.length > 0);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const handleLoadMore = useCallback(() => {
    console.log('handleLoadMore called. loading:', loading, 'hasMore:', hasMore);
    if (!loading && hasMore) {
      const nextPage = page + 1;
      console.log('Loading more products, page:', nextPage);
      setPage(nextPage);
      fetchProducts(nextPage);
    }
  }, [loading, hasMore, page, fetchProducts]);

  const handleRefresh = () => {
    setPage(1);
    fetchProducts(1, true);
  };
  const renderFooter = () => {
    return null; // Simple return null
  };

  const renderProductItem = ({ item }) => {
    // Get image - check variants first, then images array, then direct image property
    const getProductImage = () => {
      if (item.varients && item.varients.length > 0 && item.varients[0].image && item.varients[0].image.length > 0) {
        return item.varients[0].image[0];
      }
      if (item.images && item.images.length > 0) {
        return item.images[0];
      }
      if (item.image) {
        return item.image;
      }
      return 'https://via.placeholder.com/300';
    };

    // Get price - comprehensive check for all possible locations
    let price = 0;
    let offerPrice = 0;
    
    // Priority 1: Check price_slot
    if (item.price_slot && item.price_slot.length > 0 && item.price_slot[0].price) {
      const priceSlot = item.price_slot[0];
      price = parseFloat(priceSlot.price) || 0;
      // If Offerprice exists and is greater than 0, use it, otherwise use price
      offerPrice = (priceSlot.Offerprice && parseFloat(priceSlot.Offerprice) > 0) 
        ? parseFloat(priceSlot.Offerprice) 
        : price;
    }
    
    // Priority 2: If no price from price_slot, check variants
    if (price === 0 && item.varients && item.varients.length > 0 && item.varients[0].price) {
      const variant = item.varients[0];
      price = parseFloat(variant.price) || 0;
      // If Offerprice exists and is greater than 0, use it, otherwise use price
      offerPrice = (variant.Offerprice && parseFloat(variant.Offerprice) > 0) 
        ? parseFloat(variant.Offerprice) 
        : price;
    }
    
    // Priority 3: If still no price, check direct price property
    if (price === 0 && item.price) {
      price = parseFloat(item.price) || 0;
      offerPrice = price;
    }
    
    const imageData = getProductImage();

    // Calculate discount - use offer price if it's lower than regular price
    // If offerPrice is 0 or equal to price, use price as finalPrice
    const finalPrice = (offerPrice > 0 && offerPrice < price) ? offerPrice : price;
    const discountPercentage = (offerPrice > 0 && price > 0 && offerPrice < price) ?
      Math.round(((price - offerPrice) / price) * 100) : 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', {
          productId: item.slug || item._id,
          productName: item.name
        })}
      >
        {/* Discount badge - Show if there's an offer price */}
        {discountPercentage > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {discountPercentage}% OFF
            </Text>
          </View>
        )}

        <Image
          source={{ uri: imageData }}
          style={styles.productImage}
          resizeMode="contain"
        />

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name || 'No name'}
          </Text>

          <View style={styles.priceContainer}>
            {discountPercentage > 0 ? (
              <>
                <Text style={styles.price}>{currencySymbol} {convertPrice(finalPrice).toLocaleString()}</Text>
                <Text style={styles.originalPrice}>{currencySymbol} {convertPrice(price).toLocaleString()}</Text>
              </>
            ) : (
              <Text style={styles.price}>{currencySymbol} {convertPrice(finalPrice || price || 0).toLocaleString()}</Text>
            )}
          </View>

          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars(4.0)}
            </View>
            <Text style={styles.soldText}>({item.sold_pieces || 0} sold)</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalfStar) {
      stars.push('☆');
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push('☆');
    }

    return stars.map((star, index) => (
      <Text key={index} style={styles.star}>
        {star}
      </Text>
    ));
  };

  if (initialLoad) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0000ff" />
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
                <ChevronLeftIcon size={24} color="black" />
              </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('explore_our_products')}</Text>
            </View>
          </View>
        

      {/* Products List */}
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item, index) => `${item.id || index}-${item.updated_at || ''}`}
        numColumns={2}
        contentContainerStyle={[styles.productList, { paddingBottom: 80 }]}
        columnWrapperStyle={styles.columnWrapper}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={hasMore ? renderFooter : null}
        ListEmptyComponent={
          !initialLoad && !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          ) : null
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={100}
        initialNumToRender={8}
        windowSize={11}
        showsVerticalScrollIndicator={false}
      />
      {loadingMore && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productList: {
    padding: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'black',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productCard: {
    width: width / 2 - 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  discountBadge: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f3f4f6',
  },
  productInfo: {
    paddingHorizontal: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
    minHeight: 36,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  star: {
    color: '#f59e0b',
    fontSize: 12,
    marginRight: 1,
  },
  soldText: {
    fontSize: 12,
    color: '#6b7280',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  }
});

export default BestSellingProducts;