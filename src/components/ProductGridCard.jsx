import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCurrency } from '../context/CurrencyContext';
import { COLORS } from '../config';

const { width } = Dimensions.get('window');

const ProductGridCard = ({ item }) => {
  const navigation = useNavigation();
  const { convertPrice, currencySymbol, formatPrice } = useCurrency();

  // Get image - check variants first, then images array, then direct image
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

  // Get price - check all possible locations with comprehensive fallbacks
  const getPrice = () => {
    let price = 0;
    let offerPrice = 0;
    
    // Priority 1: Check price_slot (most reliable)
    if (item.price_slot && item.price_slot.length > 0) {
      const priceSlot = item.price_slot[0];
      price = parseFloat(priceSlot.price) || 0;
      offerPrice = priceSlot.Offerprice && parseFloat(priceSlot.Offerprice) > 0 
        ? parseFloat(priceSlot.Offerprice) 
        : price;
    }
    
    // Priority 2: Check variants for price (if price_slot didn't have price)
    if (price === 0 && item.varients && item.varients.length > 0) {
      const variant = item.varients[0];
      // Check if variant has price
      if (variant.price && parseFloat(variant.price) > 0) {
        price = parseFloat(variant.price) || 0;
        offerPrice = variant.Offerprice && parseFloat(variant.Offerprice) > 0 
          ? parseFloat(variant.Offerprice) 
          : price;
      }
      // Check if variant has Offerprice only
      else if (variant.Offerprice && parseFloat(variant.Offerprice) > 0) {
        offerPrice = parseFloat(variant.Offerprice) || 0;
        price = offerPrice;
      }
    }
    
    // Priority 3: Check direct price properties
    if (price === 0) {
      if (item.Offerprice && parseFloat(item.Offerprice) > 0) {
        offerPrice = parseFloat(item.Offerprice) || 0;
        price = parseFloat(item.price) || offerPrice;
      } else if (item.price && parseFloat(item.price) > 0) {
        price = parseFloat(item.price) || 0;
        offerPrice = price;
      }
    }
    
    // Priority 4: Fallback to originalPrice
    if (price === 0 && item.originalPrice && parseFloat(item.originalPrice) > 0) {
      price = parseFloat(item.originalPrice) || 0;
      offerPrice = parseFloat(item.price) || price;
    }

    return { price, offerPrice };
  };

  const imageData = getProductImage();
  const { price, offerPrice } = getPrice();
  const discountPercentage = (offerPrice && offerPrice < price) ?
    Math.round(((price - offerPrice) / price) * 100) : 0;

  // Convert prices to user currency
  const convertedPrice = convertPrice(price);
  const convertedOfferPrice = convertPrice(offerPrice);

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', {
        productId: item.slug || item._id,
        productName: item.name
      })}
    >
      {/* Discount badge */}
      {offerPrice && offerPrice < price && (
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
          {offerPrice && offerPrice < price ? (
            <>
              <Text style={styles.price}>{currencySymbol} {convertedOfferPrice.toLocaleString()}</Text>
              <Text style={styles.originalPrice}>{currencySymbol} {convertedPrice.toLocaleString()}</Text>
            </>
          ) : (
            <Text style={styles.price}>{currencySymbol} {(convertedOfferPrice || convertedPrice).toLocaleString()}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.mainColor,
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
});

export default ProductGridCard;
