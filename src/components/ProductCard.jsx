import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCurrency } from '../context/CurrencyContext';

const ProductCard = ({ product, onPress, style }) => {
  const navigation = useNavigation();
  const { convertPrice, currencySymbol } = useCurrency();
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('ProductDetail', { 
        productId: product.slug || product.id || product._id,
        productName: product.name
      });
    }
  };

  // Get image - check variants first, then images array, then direct image property
  const getProductImage = () => {
    if (product.varients && product.varients.length > 0 && product.varients[0].image && product.varients[0].image.length > 0) {
      return product.varients[0].image[0];
    }
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    if (product.image) {
      return product.image;
    }
    return 'https://via.placeholder.com/300';
  };

  // Get price - check variants first, then price_slot, then direct price property
  const getProductPrice = () => {
    // First check if product has variants with price
    if (product.varients && product.varients.length > 0) {
      const variant = product.varients[0];
      const offerPrice = variant.Offerprice && variant.Offerprice > 0 ? variant.Offerprice : variant.price;
      const originalPrice = variant.price || 0;
      
      if (offerPrice > 0) {
        return {
          price: `${currencySymbol} ${convertPrice(offerPrice).toLocaleString()}`,
          originalPrice: offerPrice < originalPrice ? `${currencySymbol} ${convertPrice(originalPrice).toLocaleString()}` : null,
          discount: offerPrice < originalPrice ? `${Math.round(((originalPrice - offerPrice) / originalPrice) * 100)}% OFF` : null
        };
      }
    }
    
    // Then check price_slot
    if (product.price_slot && product.price_slot.length > 0) {
      const priceSlot = product.price_slot[0];
      // Use Offerprice only if it's greater than 0, otherwise use price
      const offerPrice = priceSlot.Offerprice && priceSlot.Offerprice > 0 ? priceSlot.Offerprice : priceSlot.price;
      const originalPrice = priceSlot.price || 0;
      
      if (offerPrice > 0) {
        return {
          price: `${currencySymbol} ${convertPrice(offerPrice).toLocaleString()}`,
          originalPrice: offerPrice < originalPrice ? `${currencySymbol} ${convertPrice(originalPrice).toLocaleString()}` : null,
          discount: offerPrice < originalPrice ? `${Math.round(((originalPrice - offerPrice) / originalPrice) * 100)}% OFF` : null
        };
      }
    }
    
    // Finally check direct price property
    if (product.price) {
      const priceValue = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
      return {
        price: `${currencySymbol} ${convertPrice(priceValue).toLocaleString()}`,
        originalPrice: product.originalPrice ? `${currencySymbol} ${convertPrice(product.originalPrice).toLocaleString()}` : null,
        discount: product.discount
      };
    }
    
    return {
      price: `${currencySymbol} 0`,
      originalPrice: null,
      discount: null
    };
  };

  const imageUri = getProductImage();
  const priceInfo = getProductPrice();

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: imageUri }} 
          style={styles.image} 
          resizeMode="contain"
        />
        {priceInfo.discount && priceInfo.discount !== '0% OFF' && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{priceInfo.discount}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{priceInfo.price}</Text>
          {priceInfo.originalPrice && priceInfo.originalPrice !== priceInfo.price && (
            <Text style={styles.originalPrice}>{priceInfo.originalPrice}</Text>
          )}
        </View>
        
        {product.rating !== undefined && (
          <View style={styles.ratingContainer}>
            {renderStars(product.rating || 0)}
            {product.reviewCount !== undefined && (
              <Text style={styles.reviewCount}>({product.reviewCount})</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const renderStars = (rating) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push('★');
    } else if (i === fullStars && hasHalfStar) {
      stars.push('½');
    } else {
      stars.push('☆');
    }
  }

  return (
    <View style={styles.starsContainer}>
      {stars.map((star, index) => (
        <Text key={index} style={styles.star}>
          {star}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    margin: 4,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f8f9fa',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#e63946',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  details: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    height: 40,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2b2d42',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: '#6c757d',
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
    color: '#ffc107',
    fontSize: 14,
  },
  reviewCount: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
});

export default ProductCard;
