import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { GetApi, Api } from '../../Helper/Service';
import { useAuth } from '../../context/AuthContext';
import { HeartIcon as HeartIconSolid } from 'react-native-heroicons/solid';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import { COLORS } from '../../config';

const Favorites = () => {
  const navigation = useNavigation();
  const { userInfo: user, addToCart, updateFavoritesCount } = useAuth();
  const { t } = useTranslation();
  const { convertPrice, currencySymbol } = useCurrency();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quantities, setQuantities] = useState({});

  const fetchFavorites = async () => {
    try {
      setRefreshing(true);
      
      // Try to get detailed favorites first
      const favoritesDetailStr = await AsyncStorage.getItem('favoritesDetail');
      
      if (favoritesDetailStr && favoritesDetailStr !== 'null') {
        const favDetailArray = JSON.parse(favoritesDetailStr);
        console.log('Detailed favorites from storage:', favDetailArray);
        
        if (favDetailArray.length === 0) {
          setFavorites([]);
          return;
        }
        
        // Extract product IDs
        const productIds = favDetailArray.map(item => item._id);
        
        // Use dedicated backend API to get fresh wishlist data (same as website)
        const { Post } = require('../../Helper/Service');
        const response = await Post('getWishlistItems', { productIds });
        
        console.log('Fresh wishlist data from API:', response);

        // Handle response format: {status: true, data: [...]}
        let wishlistDataArray = [];
        if (response?.data && Array.isArray(response.data)) {
          wishlistDataArray = response.data;
        } else if (Array.isArray(response)) {
          wishlistDataArray = response;
        } else {
          console.warn('Invalid response from getWishlistItems API:', response);
          setFavorites([]);
          return;
        }

        if (wishlistDataArray.length === 0) {
          setFavorites([]);
          return;
        }

        // Merge fresh product data with saved selections
        const products = wishlistDataArray.map(productData => {
          // Find saved selection for this product
          const savedItem = favDetailArray.find(item => item._id === productData._id);
          
          if (!savedItem) {
            return productData;
          }

          // Get FRESH price and image based on saved variant/size selection
          let freshPrice = null;
          let freshImage = null;

          // Find matching variant if exists
          if (productData.varients && productData.varients.length > 0 && savedItem.selectedColor) {
            const matchingVariant = productData.varients.find(v => 
              v.color === savedItem.selectedColor?.color
            );

            if (matchingVariant) {
              // Get fresh image from variant
              if (matchingVariant.image && matchingVariant.image.length > 0) {
                freshImage = matchingVariant.image[0];
              }

              // Get fresh price from variant
              if (savedItem.selectedSize && matchingVariant.selected) {
                const matchingSize = matchingVariant.selected.find(s => {
                  const sizeValue = typeof s === 'string' ? s : (s?.value || s?.label);
                  return sizeValue === savedItem.selectedSize;
                });
                if (matchingSize) {
                  freshPrice = {
                    Offerprice: matchingSize.Offerprice || matchingSize.price || matchingVariant.Offerprice || matchingVariant.price || 0,
                    price: matchingSize.price || matchingVariant.price || 0
                  };
                }
              } else {
                freshPrice = {
                  Offerprice: matchingVariant.Offerprice || matchingVariant.price || 0,
                  price: matchingVariant.price || 0
                };
              }
            }
          }

          // Fallback to price_slot if no variant match
          if (!freshPrice && productData.price_slot && productData.price_slot.length > 0) {
            freshPrice = {
              Offerprice: productData.price_slot[0].Offerprice || productData.price_slot[0].price || 0,
              price: productData.price_slot[0].price || 0
            };
          }

          // Fallback to images array if no variant image
          if (!freshImage) {
            if (productData.images && productData.images.length > 0) {
              freshImage = productData.images[0];
            } else if (productData.image) {
              freshImage = productData.image;
            }
          }

          // Merge saved selection details with FRESH product data
          return {
            ...productData,
            uniqueId: savedItem.uniqueId,
            savedVariant: savedItem.selectedVariant,
            savedSize: savedItem.selectedSize,
            savedPrice: freshPrice, // Use fresh price
            savedImage: freshImage, // Use fresh image
            savedColor: savedItem.selectedColor
          };
        });
        
        console.log('Final favorite products with fresh data:', products);
        setFavorites(products);
      } else {
        // Fallback to old format (IDs only)
        const localFavorites = await AsyncStorage.getItem('favorites');
        console.log('Local favorites from storage (old format):', localFavorites);
        
        if (localFavorites && localFavorites !== 'null') {
          const favIds = JSON.parse(localFavorites);
          console.log('Parsed favorite IDs:', favIds);
          
          if (favIds.length === 0) {
            setFavorites([]);
            return;
          }
          
          // Use dedicated backend API
          const { Post } = require('../../Helper/Service');
          const response = await Post('getWishlistItems', { productIds: favIds });
          
          // Handle response format
          let wishlistDataArray = [];
          if (response?.data && Array.isArray(response.data)) {
            wishlistDataArray = response.data;
          } else if (Array.isArray(response)) {
            wishlistDataArray = response;
          }
          
          setFavorites(wishlistDataArray);
        } else {
          console.log('No favorites found in local storage');
          setFavorites([]);
        }
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      
      // Fallback to cached data on error
      try {
        const favoritesDetailStr = await AsyncStorage.getItem('favoritesDetail');
        if (favoritesDetailStr && favoritesDetailStr !== 'null') {
          const favDetailArray = JSON.parse(favoritesDetailStr);
          setFavorites(favDetailArray);
        }
      } catch (fallbackError) {
        console.error('Error loading cached favorites:', fallbackError);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRemoveFavorite = async (uniqueId) => {
    try {
      // Update both favorites storages using unique ID
      const localFavorites = await AsyncStorage.getItem('favorites');
      if (localFavorites) {
        let favArray = JSON.parse(localFavorites);
        favArray = favArray.filter(id => id !== uniqueId);
        await AsyncStorage.setItem('favorites', JSON.stringify(favArray));
        console.log('Removed from local favorites:', uniqueId);
      }
      
      // Also remove from detailed favorites using unique ID
      const favoritesDetailStr = await AsyncStorage.getItem('favoritesDetail');
      if (favoritesDetailStr) {
        let favDetailArray = JSON.parse(favoritesDetailStr);
        favDetailArray = favDetailArray.filter(item => item.uniqueId !== uniqueId);
        await AsyncStorage.setItem('favoritesDetail', JSON.stringify(favDetailArray));
        console.log('Removed from detailed favorites:', uniqueId);
      }
      
      // Update favorites count in TabNavigator
      if (updateFavoritesCount) {
        await updateFavoritesCount();
      }
      
      // Refresh the list
      fetchFavorites();
    } catch (error) {
      console.error('Error removing favorite:', error);
      Alert.alert(t('error'), t('failed_remove_favorites'));
    }
  };

  // Handle add to cart
  const handleAddToCart = async (product) => {
    try {
      // Use saved variant and size if available
      const variantIndex = product.savedVariant !== undefined ? product.savedVariant : 0;
      const selectedSize = product.savedSize || null;
      const selectedPrice = product.savedPrice || null;
      
      const response = await addToCart(product, variantIndex, 1, selectedSize, selectedPrice);
      if (response.success) {
        Alert.alert(t('success'), t('product_added_cart'));
      } else {
        Alert.alert(t('error'), response.error || t('failed_add_cart'));
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert(t('error'), t('failed_add_cart'));
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Wrap async function call properly
      const loadFavorites = async () => {
        await fetchFavorites();
      };
      loadFavorites();
    });
    return unsubscribe;
  }, [navigation, user]);

  // Render product item
  const renderProduct = ({ item }) => {
    // Get price - use saved price if available, otherwise fallback
    let price = 0;
    let originalPrice = 0;
    
    if (item.savedPrice) {
      // Use saved selection price
      price = item.savedPrice.Offerprice || item.savedPrice.price || 0;
      originalPrice = item.savedPrice.price || price;
    } else if (item.price_slot && item.price_slot.length > 0) {
      // Priority: price_slot > varients > direct price/Offerprice
      price = item.price_slot[0]?.Offerprice || item.price_slot[0]?.price || 0;
      originalPrice = item.price_slot[0]?.price || 0;
    } else if (item.varients && item.varients.length > 0) {
      const firstVariant = item.varients[0];
      price = firstVariant?.Offerprice || firstVariant?.price || 0;
      originalPrice = firstVariant?.price || price;
    } else {
      price = item.Offerprice || item.price || 0;
      originalPrice = item.price || price;
    }
    
    const discount = originalPrice > price 
      ? Math.round(((originalPrice - price) / originalPrice) * 100) 
      : 0;
    
    // Get image - use saved image if available, otherwise fallback
    let image = 'https://via.placeholder.com/150';
    if (item.savedImage) {
      // Use saved selection image
      image = item.savedImage;
    } else if (item.varients && item.varients.length > 0 && item.varients[0]?.image && item.varients[0].image.length > 0) {
      image = item.varients[0].image[0];
    } else if (item.images && item.images.length > 0) {
      image = item.images[0];
    } else if (item.image) {
      image = item.image;
    }
    
    // Get variant and size info for display
    const variantInfo = item.savedSize ? ` (${item.savedSize})` : '';
    const colorInfo = item.savedColor?.color ? ` • ${item.savedColor.color}` : '';

    return (
      <View className="bg-white rounded-lg shadow-sm mb-4 mx-4 p-4 border border-gray-100">
        <View className="flex-row">
          <Image 
            source={{ uri: image }} 
            className="w-24 h-24 rounded-lg mr-4"
            resizeMode="cover"
          />
          <View className="flex-1">
            <View className="flex-row justify-between">
              <View className="flex-1 mr-2">
                <Text 
                  className="text-base font-semibold text-gray-900" 
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                {(variantInfo || colorInfo) && (
                  <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
                    {colorInfo}{variantInfo}
                  </Text>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => handleRemoveFavorite(item.uniqueId || item._id)}
                className="p-1"
              >
                <HeartIconSolid size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
            
            <View className="flex-row items-center mt-1">
              <Text className="text-lg font-bold text-gray-900">
                {currencySymbol} {convertPrice(Number(price)).toLocaleString()}
              </Text>
              {originalPrice > price && (
                <Text className="text-sm text-gray-500 line-through ml-2">
                  {currencySymbol} {convertPrice(Number(originalPrice)).toLocaleString()}
                </Text>
              )}
              {discount > 0 && (
                <Text className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded ml-2">
                  {discount}% OFF
                </Text>
              )}
            </View>
            
            {quantities[item.uniqueId || item._id] === undefined || quantities[item.uniqueId || item._id] === 0 ? (
              <TouchableOpacity
                onPress={() => {
                  handleAddToCart(item);
                  setQuantities(prev => ({ ...prev, [item.uniqueId || item._id]: 1 }));
                }}
                className="mt-3 bg-[#0B051D] py-1.5 px-4 rounded-lg items-center self-start"
              >
                <Text className="text-white font-semibold text-sm">{t('add_to_cart')}</Text>
              </TouchableOpacity>
            ) : (
              <View className="mt-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => setQuantities(prev => ({ 
                      ...prev, 
                      [item.uniqueId || item._id]: Math.max(0, (prev[item.uniqueId || item._id] || 1) - 1) 
                    }))}
                    className="w-8 h-8 bg-gray-200 rounded-md items-center justify-center"
                  >
                    <Text className="text-lg font-bold">-</Text>
                  </TouchableOpacity>
                  <Text className="mx-4 text-lg font-semibold">{quantities[item.uniqueId || item._id] || 0}</Text>
                  <TouchableOpacity
                    onPress={() => setQuantities(prev => ({ 
                      ...prev, 
                      [item.uniqueId || item._id]: Math.min(10, (prev[item.uniqueId || item._id] || 1) + 1) 
                    }))}
                    className="w-8 h-8 bg-gray-200 rounded-md items-center justify-center"
                  >
                    <Text className="text-lg font-bold">+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Empty state
  const renderEmpty = () => (
    <View className="flex-1 justify-center items-center px-8">
      <Text className="text-xl font-semibold text-gray-700 mb-2">{t('no_favorites_yet')}</Text>
      <Text className="text-gray-500 text-center mb-6">
        {t('no_favorites_message')}
      </Text>
      <TouchableOpacity 
        onPress={() => navigation.navigate('HomeTab')}
        className="bg-[#0B051D] px-6 py-3 rounded-lg"
      >
        <Text className="text-white font-medium">{t('continue_shopping')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View style={{ backgroundColor: COLORS.mainColor }} className=" px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <ChevronLeftIcon size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">{t('my_favorites')}</Text>
        </View>
      </View>
      
      <FlatList
        data={favorites}
        renderItem={renderProduct}
        keyExtractor={(item) => item.uniqueId || item._id}
        contentContainerStyle={{ 
          paddingVertical: 16,
          paddingBottom: 90 
        }}
        ListEmptyComponent={renderEmpty}
        refreshing={refreshing}
        onRefresh={fetchFavorites}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default Favorites;