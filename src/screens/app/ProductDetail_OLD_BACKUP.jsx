import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  FlatList,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GetApi, Post, Api } from '../../Helper/Service';
import { useAuth } from '../../context/AuthContext';
import { HeartIcon as HeartIconOutline, ArrowLeftIcon } from 'react-native-heroicons/outline';
import { HeartIcon as HeartIconSolid } from 'react-native-heroicons/solid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductCard from '../../components/ProductCard';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const ProductDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userInfo: user, addToCart, updateCartCount, updateFavoritesCount } = useAuth();
  
  // Remove item from cart
  const removeFromCart = async (itemId) => {
    try {
      const cartData = await AsyncStorage.getItem('cartData');
      if (cartData) {
        const cart = JSON.parse(cartData);
        const updatedCart = cart.filter(item => item._id !== itemId);
        await AsyncStorage.setItem('cartData', JSON.stringify(updatedCart));
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Error removing from cart:', error);
      return { success: false, error: error.message };
    }
  };
  const { t } = useTranslation();
  const { productId, flashSaleId, flashSalePrice, isFlashSale } = route.params || {};

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteUpdated, setFavoriteUpdated] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  
  // New states for website-like functionality
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedImageList, setSelectedImageList] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedPrice, setSelectedPrice] = useState({});

const fetchProductDetails = async () => {
  try {
    setLoading(true);
    setError(null);
    
      // Check if we have product data from navigation (e.g., from flash sale)
    if (route.params?.productData) {
      setProduct(route.params.productData);
      setCurrentProduct(route.params.productData);
      setLoading(false);
      return;
    }
    
    if (!productId) {
      throw new Error(t('product_id_required'));
    }
    
    console.log('Fetching product details for ID:', productId);
    
    
    const isFlashSale = !!route.params?.isFlashSale;
    const userParam = user?._id ? `?user=${user._id}` : '';
    
    // Try to fetch product data
    const response = await GetApi(`getProductByslug/${productId}${userParam}`).catch(err => {
      console.error('API Error:', err);
      throw new Error(t('failed_fetch_product_details'));
    });
    
    console.log('Product details response:', response);
    
    if (!response) {
      throw new Error(t('no_response_from_server'));
    }
    
    // Handle different response formats
    let productData = response.data || response.product || response;
    
    if (!productData) {
      throw new Error(t('invalid_product_data'));
    }
    
    // If coming from flash sale, override the price
    if (isFlashSale && route.params?.flashSalePrice) {
      productData = {
        ...productData,
        price_slot: [{
          ...(productData.price_slot?.[0] || {}),
          Offerprice: route.params.flashSalePrice
        }]
      };
    }
    
    setProduct(productData);
    setCurrentProduct(productData);
    
    // Initialize images, colors, and sizes
    const hasVariants = productData?.varients && productData.varients.length > 0;
    
    if (hasVariants) {
      // Product has variants - use first variant
      const firstVariant = productData.varients[0];
      setSelectedColor(firstVariant);
      setSelectedImageList(firstVariant.image || []);
      
      // Set first size if available
      if (firstVariant.selected && firstVariant.selected.length > 0) {
        setSelectedSize(firstVariant.selected[0]);
      }
      
      // Set price from variant
      const variantPrice = firstVariant?.Offerprice || firstVariant?.price || 0;
      setSelectedPrice({
        value: firstVariant?.selected?.[0]?.value || '',
        Offerprice: variantPrice,
        price: firstVariant?.price || 0
      });
    } else {
      // Simple product - use images array
      const productImages = productData?.images || [];
      setSelectedImageList(productImages);
      
      // Set price from price_slot
      const priceSlot = productData?.price_slot?.[0];
      if (priceSlot) {
        setSelectedPrice(priceSlot);
      }
    }
    
    // Handle reviews
    if (productData.reviews && Array.isArray(productData.reviews)) {
      setReviews(productData.reviews);
    }
    
    // Handle favorites
    if (productData.isFavorite !== undefined) {
      setIsFavorite(productData.isFavorite);
    }
    
    // Fetch related products if category is available
    if (productData.category?._id) {
      fetchRelatedProducts(productData.category._id, productData._id);
    }
  } catch (error) {
    console.error('Error fetching product details:', error);
    setError(error.message || t('failed_load_product_details'));
  } finally {
    setLoading(false);
  }
};

  // Fetch related products by category
  const fetchRelatedProducts = async (categoryId) => {
    try {
      setLoadingRelated(true);
      const response = await GetApi(`getProductbycategory/${categoryId}`);
      
      if (response && Array.isArray(response)) {
        // Filter out current product and limit to 5 items
        const filtered = response
          .filter(item => item._id !== productId)
          .slice(0, 5)
          .map(product => ({
            id: product._id,
            name: product.name,
            price: `$${Math.round(product.price_slot?.[0]?.Offerprice || 0)}`,
            originalPrice: `$${Math.round(product.price_slot?.[0]?.price || 0)}`,
            image: product.varients?.[0]?.image?.[0] || product.image || 'https://via.placeholder.com/300',
            rating: 4.0
          }));
        
        setRelatedProducts(filtered);
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      setFavoriteLoading(true);
      const newFavoriteState = !isFavorite;
      
      // Update local storage for both logged in and guest users
      const updated = await updateLocalFavorites(product._id, newFavoriteState);
      
      if (updated) {
        // Only update the UI if the favorites were actually changed
        setIsFavorite(newFavoriteState);
        
        // Toggle the favoriteUpdated state to trigger the useEffect hook
        // This will update the favorites count in the tab bar
        setFavoriteUpdated(prev => !prev);
        
        console.log('Favorite toggled successfully:', newFavoriteState);
      }
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert(t('error'), t('failed_update_favorites'));
    } finally {
      setFavoriteLoading(false);
    }
  };

  
  const updateLocalFavorites = async (productId, isFav) => {
    try {
      const favorites = await AsyncStorage.getItem('favorites');
      let favArray = [];
      
      if (favorites) {
        favArray = JSON.parse(favorites);
      }
  
     
  
      let updated = false;
      
      if (isFav) {
        if (!favArray.includes(productId)) {
          favArray.push(productId);
          updated = true;
        }
      } else {
        const initialLength = favArray.length;
        favArray = favArray.filter(id => id !== productId);
        updated = favArray.length !== initialLength;
      }
  
      if (updated) {
        await AsyncStorage.setItem('favorites', JSON.stringify(favArray));
        console.log('Updated favorites:', favArray);
        return true; // Return true if favorites were updated
      }
      
      return false; // Return false if no changes were made
    } catch (error) {
      console.error('Error updating local favorites:', error);
      throw error; // Re-throw to be caught by the calling function
    }
  };

  // Check if product is in favorites
  const checkIfFavorite = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favorites');
      if (favorites) {
        const favArray = JSON.parse(favorites);
        setIsFavorite(favArray.includes(product?._id));
        console.log('Checking favorites - product in favorites:', favArray.includes(product?._id));
      }
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  };

  // Add to cart functionality
  const handleAddToCart = async () => {
    // Use quantity 1 if current quantity is 0
    const cartQuantity = quantity === 0 ? 1 : quantity;

    try {
      setAddingToCart(true);
      
      const response = await addToCart(product, selectedVariant, cartQuantity);
      
      if (response.success) {
        Alert.alert(t('success'), t('product_added_to_cart'));
        // Set quantity to 1 after adding to cart to show quantity controls
        setQuantity(1);
      } else {
        Alert.alert(t('error'), response.error || t('failed_add_to_cart'));
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert(t('error'), error.message || t('failed_add_to_cart'));
    } finally {
      setAddingToCart(false);
    }
  };

  // Toggle favorite functionality
  const handleToggleFavorite = async () => {
    await toggleFavorite();
  };
  

  // Render stars for rating
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

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
      <Text key={index} className="text-orange-400 text-lg">
        {star}
      </Text>
    ));
  };

  // Handle quantity change
  const updateQuantity = async (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 0 && newQuantity <= 10) {
      setQuantity(newQuantity);
      
      // If quantity is being increased from 0, add to cart
      if (newQuantity > 0 && quantity === 0) {
        try {
          await addToCart(product, selectedVariant, newQuantity);
          // Update cart count in tab navigator
          if (updateCartCount) {
            await updateCartCount();
          }
        } catch (error) {
          console.error('Error updating cart:', error);
        }
      }
      // If quantity is being decreased to 0, remove from cart
      else if (newQuantity === 0 && quantity > 0) {
        try {
          await removeFromCart(product._id + '_' + selectedVariant);
          // Update cart count in tab navigator
          if (updateCartCount) {
            await updateCartCount();
          }
        } catch (error) {
          console.error('Error removing from cart:', error);
        }
      }
      // If quantity is being updated (but not to/from 0), update cart
      else if (newQuantity > 0 && quantity > 0) {
        try {
          const cartData = await AsyncStorage.getItem('cartData');
          if (cartData) {
            let cart = JSON.parse(cartData);
            const itemIndex = cart.findIndex(item => item._id === product._id + '_' + selectedVariant);
            
            if (itemIndex >= 0) {
              cart[itemIndex].qty = newQuantity;
              cart[itemIndex].total = cart[itemIndex].price * newQuantity;
              await AsyncStorage.setItem('cartData', JSON.stringify(cart));
              // Update cart count in tab navigator
              if (updateCartCount) {
                await updateCartCount();
              }
            }
          }
        } catch (error) {
          console.error('Error updating cart quantity:', error);
        }
      }
    }
  };

  // Handle related product press
  const handleRelatedProductPress = (relatedProduct) => {
    navigation.push('ProductDetail', { productId: relatedProduct.id });
  };

  // Render related product item
  const renderRelatedProduct = ({ item }) => (
    <TouchableOpacity 
      onPress={() => handleRelatedProductPress(item)}
      className="w-32 mr-4"
    >
      <View className="bg-gray-100 rounded-lg p-3">
        <Image
          source={{ uri: item.image }}
          className="w-full h-24 rounded-lg mb-2"
          resizeMode="contain"
        />
        <Text className="text-black font-medium text-xs mb-1" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="text-black font-bold text-sm">{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  // Fetch product reviews
  const fetchProductReviews = async () => {
    // Use product._id if available, otherwise fall back to productId
    const reviewProductId = product?._id || productId;
    
    if (!reviewProductId) {
      console.log('No product ID available for fetching reviews');
      return;
    }
    
    console.log('Fetching reviews for product ID:', reviewProductId);
    setLoadingReviews(true);
    
    try {
      // Get user token from AsyncStorage
      const user = await AsyncStorage.getItem('userInfo');
      const userData = user ? JSON.parse(user) : null;
      const token = userData?.token;
      
      if (!token) {
        console.warn('No authentication token found');
        // Continue without token as some APIs might not require it for public reviews
      }

      const url = `https://api.merkapp.net/api/getProductReviews/${reviewProductId}`;
      console.log('Fetching reviews from URL:', url);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Only add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });
      
      console.log('Reviews API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch reviews. Status:', response.status, 'Response:', errorText);
        throw new Error(`Failed to fetch reviews: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Fetched reviews response:', JSON.stringify(result, null, 2));
      
      // Handle different response formats
      let reviewsData = [];
      
      if (result?.data?.reviews) {
        reviewsData = result.data.reviews;
      } else if (result?.data) {
        reviewsData = Array.isArray(result.data) ? result.data : [];
      } else if (Array.isArray(result)) {
        reviewsData = result;
      }
      
      console.log(`Setting ${reviewsData.length} reviews`);
      setReviews(reviewsData);
      
    } catch (error) {
      console.error('Error in fetchProductReviews:', {
        message: error.message,
        stack: error.stack,
        productId,
        time: new Date().toISOString()
      });
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Render star rating - matches web version
  const renderStarRating = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <View className="flex-row items-center">
        {[...Array(5)].map((_, i) => (
          <Text 
            key={i} 
            className={`text-lg ${i < fullStars || (i === fullStars && hasHalfStar) ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </Text>
        ))}
        <Text className="text-gray-600 text-sm ml-1">({rating?.toFixed?.(1) || '0.0'})</Text>
      </View>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  useEffect(() => {
    // Fetch reviews when product data is available
    if (product?._id) {
      fetchProductReviews();
    }
  }, [product?._id]);

  useEffect(() => {
    if (product) {
      checkIfFavorite();
    }
  }, [product]);

  // Update favorites count when favorite status changes
  useEffect(() => {
    if (updateFavoritesCount) {
      updateFavoritesCount();
    }
  }, [favoriteUpdated, updateFavoritesCount]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f97316" />
          <Text className="text-gray-400 mt-4">{t('loading_product_details')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-red-500 text-center mb-4">{error || t('product_not_found')}</Text>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="bg-orange-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">{t('go_back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentVariant = product.varients?.[selectedVariant];
  const productImage = selectedImageList[currentImageIndex] || product.image || 'https://via.placeholder.com/400';
  
  // Price calculation - use selectedPrice from state
  const isFlashSaleActive = !!flashSaleId && flashSalePrice;
  const currentPrice = isFlashSaleActive 
    ? flashSalePrice 
    : (selectedPrice?.Offerprice || selectedPrice?.price || product.price_slot?.[0]?.Offerprice || 0);
  const originalPrice = isFlashSaleActive 
    ? (product.price_slot?.[0]?.price || 0)
    : (selectedPrice?.price || product.price_slot?.[0]?.price || 0);
  const discount = originalPrice > 0 && currentPrice < originalPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) 
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <ArrowLeftIcon size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold">{t('product_details')}</Text>
        </View>
        <TouchableOpacity onPress={handleToggleFavorite}>
          {isFavorite ? (
            <HeartIconSolid size={24} color="#EF4444" />
          ) : (
            <HeartIconOutline size={24} color="#9CA3AF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        style={{ flex: 1 }}
      >
        {/* Product Images Carousel */}
        <View className="mt-4">
          {/* Main Image */}
          <View className="bg-gray-100 mx-4 rounded-lg" style={{ height: 350 }}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / (width - 32));
                setCurrentImageIndex(index);
              }}
            >
              {selectedImageList.map((imageUri, index) => (
                <View key={index} style={{ width: width - 32 }}>
                  <Image
                    source={{ uri: imageUri }}
                    className="w-full h-full rounded-lg"
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
            
            {discount > 0 && (
              <View className="absolute top-4 left-4 bg-red-500 px-2 py-1 rounded">
                <Text className="text-white text-xs font-bold">{discount}% OFF</Text>
              </View>
            )}
            
            {/* Image Indicator */}
            {selectedImageList.length > 1 && (
              <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
                {selectedImageList.map((_, index) => (
                  <View
                    key={index}
                    className={`w-2 h-2 rounded-full mx-1 ${
                      currentImageIndex === index ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </View>
            )}
          </View>
          
          {/* Thumbnail Images */}
          {selectedImageList.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3 px-4"
            >
              {selectedImageList.map((imageUri, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentImageIndex(index)}
                  className={`mr-2 rounded-lg overflow-hidden ${
                    currentImageIndex === index ? 'border-2 border-orange-500' : 'border border-gray-300'
                  }`}
                  style={{ width: 60, height: 60 }}
                >
                  <Image
                    source={{ uri: imageUri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Product Info */}
        <View className="px-4 mt-6">
          {/* Product Name */}
          <Text className="text-2xl font-bold text-black mb-2">
            {product.name}
          </Text>

          {/* Rating */}
          <View className="flex-row items-center mb-4">
            <View className="flex-row mr-2">
              {renderStars(4.0)}
            </View>
            <Text className="text-gray-500 text-sm">(4.0) • {product.sold_pieces || 0} {t('sold')}</Text>
          </View>

          {/* Price and Add to Cart */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <View className="flex-col">
                <View className="flex-row items-center">
                  <Text className="text-3xl font-bold text-black">
                    ${Math.round(currentPrice)}
                  </Text>
                  {isFlashSaleActive && (
                    <Text className="ml-2 text-sm text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                      {t('flash_sale')}
                    </Text>
                  )}
                </View>
                {originalPrice > currentPrice && (
                  <Text className="text-base text-gray-400 line-through">
                    ${Math.round(originalPrice)}
                  </Text>
                )}
              </View>
            </View>
            
            {quantity === 0 ? (
              <TouchableOpacity
                onPress={handleAddToCart}
                disabled={addingToCart}
                className="bg-[#0B051D] py-3 px-6 rounded-lg items-center"
              >
                {addingToCart ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold text-sm">{t('add_to_cart')}</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View className="flex-row items-center bg-gray-100 rounded-lg px-2 py-1">
                <TouchableOpacity
                  onPress={() => updateQuantity(-1)}
                  className="w-8 h-8 items-center justify-center"
                >
                  <Text className="text-xl font-bold">-</Text>
                </TouchableOpacity>
                <Text className="mx-3 text-lg font-semibold">{quantity}</Text>
                <TouchableOpacity
                  onPress={() => updateQuantity(1)}
                  className="w-8 h-8 items-center justify-center"
                >
                  <Text className="text-xl font-bold">+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Product Short Description */}
          {product.short_description && (
            <View className="mb-4">
              <Text className="text-lg font-semibold text-black mb-2">{t('overview')}</Text>
              <Text className="text-gray-600 leading-6">
                {product.short_description}
              </Text>
            </View>
          )}

          {/* Product Long Description */}
          {product.long_description && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-black mb-2">{t('description')}</Text>
              <Text className="text-gray-600 leading-6">
                {product.long_description}
              </Text>
            </View>
          )}

          {/* Variants Selection */}
          {product.varients && product.varients.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-black mb-3">
                {product.varients.length > 1 ? t('select_variant') : t('variant')}
              </Text>
             <ScrollView 
  horizontal 
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{
    paddingBottom: 8,
    paddingRight: 12
  }}
>
  {product.varients.map((variant, index) => (
    <TouchableOpacity
      key={index}
      onPress={() => setSelectedVariant(index)}
      className="mr-3"  
      style={{
        minWidth: 60,  
        alignItems: 'center'
      }}
    >
      {variant.color && (
      <View 
      className="w-8 h-8 rounded-full mb-2"
      style={{ 
        backgroundColor: variant.color || '#CCCCCC'
      }}
    />
      )}
      <Text 
        className={`text-sm text-center font-medium ${
          selectedVariant === index ? 'text-orange-500' : 'text-gray-700'
        }`}
        numberOfLines={1}
      >
        {variant.name || ' '}
      </Text>
      {variant.price && (
        <Text className="text-xs text-gray-500 mt-1">
          ${variant.price.toFixed(2)}
        </Text>
      )}
    </TouchableOpacity>
  ))}
</ScrollView>
              
              {/* Display selected variant details */}
              {/* {currentVariant && (
                <View className="mt-4 bg-gray-50 p-3 rounded-lg">
                  <Text className="font-medium text-black mb-1">Selected Variant:</Text>
                  <View className="flex-row items-center">
                    {currentVariant.color && (
                      <View 
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: currentVariant.color }}
                      />
                    )}
                    <Text className="text-gray-700">
                      {currentVariant.name || 'Default'} • 
                      {currentVariant.price ? `$${currentVariant.price.toFixed(2)}` : 'Price not available'}
                    </Text>
                  </View>
                </View>
              )} */}
            </View>
          )}

          {/* Favorite Button */}
          <View className="mb-6">
            <TouchableOpacity 
              onPress={toggleFavorite}
              disabled={favoriteLoading}
              className="flex-row items-center justify-center py-2 rounded-lg border border-gray-300 w-32"
            >
              {favoriteLoading ? (
                <ActivityIndicator size="small" color="#f97316" />
              ) : isFavorite ? (
                <>
                  <HeartIconSolid size={20} color="#ef4444" />
                  <Text className="text-gray-700 ml-2 font-medium">{t('saved')}</Text>
                </>
              ) : (
                <>
                  <HeartIconOutline size={20} color="#6b7280" />
                  <Text className="text-gray-700 ml-2 font-medium">{t('save')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Product Details */}
          {/* <View className="mb-6">
            <Text className="text-lg font-semibold text-black mb-3">Product Details</Text>
            <View className="bg-gray-50 rounded-lg p-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Category</Text>
                <Text className="text-black font-medium">
                  {product.category?.name || 'Uncategorized'}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Brand</Text>
                <Text className="text-black font-medium">
                  {product.brand || 'Generic'}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Stock</Text>
                <Text className="text-black font-medium">
                  {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">SKU</Text>
                <Text className="text-black font-medium">
                  {product.sku || product._id?.slice(-8)}
                </Text>
              </View>
            </View>
          </View> */}

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('customer_reviews')}</Text>
              {reviews.length > 2 && (
                <TouchableOpacity onPress={() => setShowAllReviews(!showAllReviews)}>
                  <Text style={styles.seeAllText}>
                    {showAllReviews ? t('show_less') : `${t('see_all')} (${reviews.length})`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingReviews ? (
              <ActivityIndicator size="small" color="#0000ff" />
            ) : reviews.length > 0 ? (
              <View>
             {(showAllReviews ? reviews : reviews.slice(0, 2)).map((review, index) => {
  console.log(`Rendering review ${index} posted_by:`, review.posted_by); // Debug line
  
  return (
    <View key={index} style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {review.posted_by?.firstName?.charAt(0).toUpperCase() ||
               review.posted_by?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.reviewerName}>
              {(() => {
                const pb = review.posted_by;
                console.log('Processing posted_by:', pb); // Debug line
                
                if (pb?.firstName && pb?.lastName) {
                  return `${pb.firstName} ${pb.lastName}`;
                } else if (pb?.firstName) {
                  return pb.firstName;
                } else if (pb?.name) {
                  return pb.name;
                } else {
                  return t('anonymous_user');
                }
              })()}
            </Text>
            <View style={styles.ratingContainer}>
              {renderStarRating(review.rating)}
              <Text style={styles.reviewDate}>
                {formatDate(review.createdAt || new Date())}
              </Text>
            </View>
          </View>
        </View>
      </View>
      {review.description && (
        <Text style={styles.reviewText}>{review.description}</Text>
      )}
    </View>
  );
})}
              </View>
            ) : (
              <Text style={styles.noReviewsText}>{t('no_reviews_yet')}</Text>
            )}
          </View>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <View className="mt-8 px-4">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-gray-900">{t('you_may_also_like')}</Text>
                <TouchableOpacity 
                  onPress={() => {
                    if (currentProduct?.category?._id) {
                      navigation.navigate('CategoryProducts', {
                        categoryId: currentProduct.category._id,
                        categoryName: currentProduct.category.name
                      });
                    }
                  }}
                >
                  <Text className="text-orange-500 font-medium">{t('see_all')}</Text>
                </TouchableOpacity>
              </View>
              
              {loadingRelated ? (
                <ActivityIndicator size="large" color="#0000ff" />
              ) : (
                <FlatList
                  data={relatedProducts}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View className="mr-4 w-40">
                      <ProductCard product={item} />
                    </View>
                  )}
                  contentContainerStyle={{
                    paddingBottom: 16,
                  }}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

     
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  seeAllText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  reviewItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#4B5563',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewerName: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    color: '#F59E0B',
    fontSize: 16,
    marginRight: 2,
  },
  reviewDate: {
    color: '#6B7280',
    fontSize: 12,
    marginLeft: 8,
  },
  reviewText: {
    color: '#4B5563',
    lineHeight: 20,
  },
  noReviewsText: {
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default ProductDetailScreen;
