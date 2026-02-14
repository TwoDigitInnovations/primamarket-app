import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GetApi } from '../Helper/Service';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';

const { width } = Dimensions.get('window');

const FlashSale = () => {
  const [saleData, setSaleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { convertPrice, currencySymbol } = useCurrency();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const navigation = useNavigation();

  useEffect(() => {
    fetchFlashSales();
  }, []);

  useEffect(() => {
    let interval = null;
    
    if (saleData.length > 0 && saleData[0]?.endDateTime) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const endTime = new Date(saleData[0].endDateTime).getTime();
        const distance = endTime - now;

        if (distance > 0) {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          setTimeLeft({ days, hours, minutes, seconds });
        } else {
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          clearInterval(interval);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [saleData]);

  const fetchFlashSales = async () => {
    try {
      setLoading(true);
      const response = await GetApi("getOneFlashSalePerSeller");
      
      if (response && response.data) {
        // Filter out sales that have ended and only show verified products
        const now = new Date();
        const activeSales = response.data
          .filter(sale => new Date(sale.endDateTime) > now)
          .map(sale => ({
            ...sale,
            products: sale.products?.filter(product => product.is_verified === true) || []
          }))
          .filter(sale => sale.products.length > 0); // Remove sales with no verified products
        
        setSaleData(activeSales);
      }
    } catch (error) {
      console.error('Error fetching flash sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProduct = ({ item }) => {
    const product = item.products?.[0];
    if (!product) return null;

    // Get image from variants first, then from images array, then fallback
    let imageUrl = 'https://via.placeholder.com/150';
    if (product.varients && product.varients.length > 0 && product.varients[0]?.image?.[0]) {
      imageUrl = product.varients[0].image[0];
    } else if (product.images && product.images.length > 0) {
      imageUrl = product.images[0];
    } else if (product.image) {
      imageUrl = product.image;
    }
    
    const originalPrice = product.price_slot?.[0]?.price || 0;
    const salePrice = item.price || originalPrice;
    const discount = originalPrice > 0 
      ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
      : 0;

    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => navigation.navigate('FlashSaleDetail', { 
          saleId: item._id,
          productId: product._id
        })}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.productImage}
            resizeMode="cover"
          />
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name || 'Product Name'}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.salePrice}>{currencySymbol} {convertPrice(salePrice).toLocaleString()}</Text>
            {originalPrice > salePrice && (
              <Text style={styles.originalPrice}>{currencySymbol} {convertPrice(originalPrice).toLocaleString()}</Text>
            )}
          </View>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>Ends in: </Text>
            <Text style={styles.timerValue}>
              {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  }

  if (saleData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noSalesText}>{t('no_sale_live')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* <Text style={styles.title}>Flash Sales</Text> */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('AllFlashSales')}
        >
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={saleData}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAll: {
    color: '#FF6B6B',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  productCard: {
    width: 170,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    backgroundColor: '#f5f5f5',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 12,
    minHeight: 110,
  },
  productName: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '600',
    color: '#1F2937',
    height: 32,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  salePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerText: {
    fontSize: 9,
    color: '#991B1B',
    fontWeight: '500',
  },
  timerValue: {
    fontSize: 9,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSalesText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    paddingVertical: 20,
  },
});

export default FlashSale;
