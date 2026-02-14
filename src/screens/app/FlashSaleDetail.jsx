import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GetApi } from '../../Helper/Service';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { useCurrency } from '../../context/CurrencyContext';

const { width } = Dimensions.get('window');

// Helper function to get color name from hex code
const getColorName = (hexColor) => {
  if (!hexColor) return 'Unknown';
  
  const colorMap = {
    '#000000': 'Black',
    '#FFFFFF': 'White',
    '#FF0000': 'Red',
    '#00FF00': 'Green',
    '#0000FF': 'Blue',
    '#FFFF00': 'Yellow',
    '#FF00FF': 'Magenta',
    '#00FFFF': 'Cyan',
    '#FFA500': 'Orange',
    '#800080': 'Purple',
    '#FFC0CB': 'Pink',
    '#A52A2A': 'Brown',
    '#808080': 'Gray',
    '#C0C0C0': 'Silver',
    '#FFD700': 'Gold',
    '#000080': 'Navy',
    '#008080': 'Teal',
    '#800000': 'Maroon',
    '#808000': 'Olive',
    '#00FF7F': 'Spring Green',
    '#4B0082': 'Indigo',
    '#EE82EE': 'Violet',
    '#F0E68C': 'Khaki',
    '#E6E6FA': 'Lavender',
    '#FFDAB9': 'Peach',
    '#40E0D0': 'Turquoise',
    '#FF6347': 'Tomato',
    '#4682B4': 'Steel Blue',
    '#D2691E': 'Chocolate',
    '#FF1493': 'Deep Pink',
    '#1E90FF': 'Dodger Blue',
    '#32CD32': 'Lime Green',
    '#FFE4B5': 'Moccasin',
    '#FFDEAD': 'Navajo White',
    '#FFA07A': 'Light Salmon',
    '#20B2AA': 'Light Sea Green',
    '#87CEEB': 'Sky Blue',
    '#778899': 'Light Slate Gray',
    '#B0C4DE': 'Light Steel Blue',
    '#FFFFE0': 'Light Yellow',
    '#00CED1': 'Dark Turquoise',
    '#9400D3': 'Dark Violet',
    '#FF8C00': 'Dark Orange',
    '#8B0000': 'Dark Red',
    '#006400': 'Dark Green',
    '#00008B': 'Dark Blue',
    '#8B008B': 'Dark Magenta',
    '#556B2F': 'Dark Olive Green',
    '#FF4500': 'Orange Red',
    '#DA70D6': 'Orchid',
    '#DB7093': 'Pale Violet Red',
    '#FFEFD5': 'Papaya Whip',
    '#98FB98': 'Pale Green',
    '#AFEEEE': 'Pale Turquoise',
    '#DDA0DD': 'Plum',
    '#B0E0E6': 'Powder Blue',
    '#BC8F8F': 'Rosy Brown',
    '#4169E1': 'Royal Blue',
    '#8B4513': 'Saddle Brown',
    '#FA8072': 'Salmon',
    '#F4A460': 'Sandy Brown',
    '#2E8B57': 'Sea Green',
    '#FFF5EE': 'Seashell',
    '#A0522D': 'Sienna',
    '#87CEEB': 'Sky Blue',
    '#6A5ACD': 'Slate Blue',
    '#708090': 'Slate Gray',
    '#FFFAFA': 'Snow',
    '#00FF7F': 'Spring Green',
    '#4682B4': 'Steel Blue',
    '#D2B48C': 'Tan',
    '#D8BFD8': 'Thistle',
    '#FF6347': 'Tomato',
    '#40E0D0': 'Turquoise',
    '#EE82EE': 'Violet',
    '#F5DEB3': 'Wheat',
    '#F5F5F5': 'White Smoke',
    '#9ACD32': 'Yellow Green',
  };

  const upperHex = hexColor.toUpperCase();
  return colorMap[upperHex] || hexColor;
};

const FlashSaleDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { saleId, productId } = route.params || {};
  const { t } = useTranslation();
  const { convertPrice, currencySymbol } = useCurrency();

  // Add back button to header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: t('flash_sale'),
      headerTitleAlign: 'center',
      headerStyle: {
        backgroundColor: '#1F2937',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 20,
      },
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 0, padding: 0 }}
        >
           <ChevronLeftIcon size={24} color="white" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, t]);
  
  const [saleData, setSaleData] = useState(null);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSaleDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await GetApi("getOneFlashSalePerSeller");
      console.log('logs',response)
      if (response && response.data) {
       
        const sale = response.data.find(sale => sale._id === saleId);
        
        if (sale) {
          // If we have a productId but no product data, fetch the product
          if (productId && (!sale.products || !sale.products[0])) {
            const productResponse = await GetApi(`getProductById/${productId}`);
            if (productResponse && productResponse.data) {
              sale.products = [productResponse.data];
            }
          }
          
          setSaleData(sale);
        } else {
          console.log('Flash sale not found in the list');
        }
      } else {
        console.log('No flash sales data received');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [saleId, productId]);

  useEffect(() => {
    if (saleId) {
      fetchSaleDetails();
    } else {
      setIsLoading(false);
    }
  }, [saleId, fetchSaleDetails]);

  const updateTimer = useCallback(() => {
    if (!saleData?.endDateTime) return;
    
    const now = new Date().getTime();
    const endTime = new Date(saleData.endDateTime).getTime();
    const distance = endTime - now;

    if (distance > 0) {
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    } else {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    }
  }, [saleData]);

  useEffect(() => {
    let interval = null;
    
    if (saleData?.endDateTime) {
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [saleData, updateTimer]);



  const handleBuyNow = (product) => {
    if (!product?._id) {
      console.error('Invalid product data:', product);
      return;
    }
    
    const productData = product.products?.[0] || product;
    
    navigation.navigate('ProductDetail', {
      productId: productData._id || productData.slug,
      flashSaleId: saleData?._id,
      flashSalePrice: saleData?.price,
      isFlashSale: true,
      productData: productData // Pass the full product data as well
    });
  };

  const renderProduct = (product) => {
    if (!product) return null;

    // Get image from variants first, then from images array, then fallback
    let imageUrl = 'https://via.placeholder.com/300';
    if (product.varients && product.varients.length > 0 && product.varients[0]?.image?.[0]) {
      imageUrl = product.varients[0].image[0];
    } else if (product.images && product.images.length > 0) {
      imageUrl = product.images[0];
    } else if (product.image) {
      imageUrl = product.image;
    }
    
    const originalPrice = product.price_slot?.[0]?.price || 0;
    const salePrice = saleData?.price || originalPrice;
    const discount = originalPrice > 0 
      ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
      : 0;

    return (
      <View style={styles.productContainer}>
        <Image 
          source={{ uri: imageUrl }}
          style={styles.productImage}
          resizeMode="contain"
        />
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name || t('product_name')}
          </Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.salePrice}>{currencySymbol} {convertPrice(salePrice).toLocaleString()}</Text>
            {originalPrice > salePrice && (
              <Text style={styles.originalPrice}>{currencySymbol} {convertPrice(originalPrice).toLocaleString()}</Text>
            )}
            {discount > 0 && (
              <Text style={styles.discountBadge}>{discount}% OFF</Text>
            )}
          </View>
          
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{t('sale_ends_in')}: </Text>
            <Text style={styles.timerValue}>
              {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.buyNowButton}
            onPress={() => handleBuyNow(product)}
          >
            <Text style={styles.buyNowText}>{t('buy_now')}</Text>
          </TouchableOpacity>
          
          <Text style={styles.description}>
            {product.long_description || product.short_description || product.description || t('no_description_available')}
          </Text>

          {/* Available Colors Section */}
          {product.varients && product.varients.length > 0 && (
            <View style={styles.variantsSection}>
              <Text style={styles.sectionTitle}>{t('available_colors')} ({product.varients.length})</Text>
              {product.varients.map((variant, index) => (
                <View key={index} style={styles.variantCard}>
                  <View style={styles.variantHeader}>
                    <View style={[styles.colorBox, { backgroundColor: variant.color }]} />
                    <Text style={styles.variantPrice}>
                      {currencySymbol} {convertPrice(variant.Offerprice || variant.price || 0).toLocaleString()}
                    </Text>
                  </View>
                  {variant.selected && variant.selected.length > 0 && (
                    <View style={styles.sizesContainer}>
                      <Text style={styles.sizesLabel}>{t('available_sizes')}:</Text>
                      <View style={styles.sizesGrid}>
                        {variant.selected.map((size, sizeIndex) => (
                          <View key={sizeIndex} style={styles.sizeChip}>
                            <Text style={styles.sizeText}>{size.value}</Text>
                            <Text style={styles.sizeStock}>({size.total || 0})</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!saleData) {
    return (
      <View style={styles.container}>
        <Text>{t('flash_sale_not_found')}</Text>
      </View>
    );
  }

  const saleProduct = saleData.products?.[0];
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sellerName}>
          {saleData?.seller?.firstName && saleData?.seller?.lastName 
            ? `${saleData.seller.firstName} ${saleData.seller.lastName}'s Flash Sale`
            : saleData?.seller?.name || t('seller_flash_sale')}
        </Text>
        <Text style={styles.timeLeft}>
          {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s {t('left')}
        </Text>
      </View>
      
      <View style={styles.offerBanner}>
        <Text style={styles.offerText}>
          {saleData?.title || saleData?.name || t('limited_time_offer')}
        </Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {saleData?.products?.map((product, index) => (
          <View key={index}>
            {renderProduct(product)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sellerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timeLeft: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  offerBanner: {
    backgroundColor: '#fff8e1',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ffecb3',
  },
  offerText: {
    textAlign: 'center',
    color: '#ff8f00',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productContainer: {
    padding: 15,
  },
  productImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    marginTop: 20,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  salePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginRight: 10,
  },
  originalPrice: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  discountBadge: {
    backgroundColor: '#FF6B6B',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 'bold',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  timerText: {
    fontSize: 16,
    color: '#666',
    marginRight: 5,
  },
  timerValue: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  buyNowButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 15,
  },
  buyNowText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 20,
  },
  variantsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  variantCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  variantPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  sizesContainer: {
    marginTop: 8,
  },
  sizesLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  sizesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sizeChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sizeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  sizeStock: {
    fontSize: 11,
    color: '#6B7280',
  },
});

export default FlashSaleDetail;
