import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { useCurrency } from '../../context/CurrencyContext';

const CartScreen = () => {
  const navigation = useNavigation();
  const { userInfo: user, updateCartCount } = useAuth();
  const { t } = useTranslation();
  const { convertPrice, currencySymbol, formatPrice, userCurrency, exchangeRate } = useCurrency();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingItem, setUpdatingItem] = useState(null);
  // Payment method will be selected in BillingDetails
  const [taxRate, setTaxRate] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  // Constants
  const SHIPPING_FEE = 0; // Free shipping

  // Fetch cart items with fresh product data from backend using dedicated API (like website)
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const cartData = await AsyncStorage.getItem('cartData');
      console.log('Cart data from storage:', cartData);
      
      if (!cartData) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      const parsedCart = JSON.parse(cartData);
      if (!Array.isArray(parsedCart) || parsedCart.length === 0) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      // Prepare cart items for API call (minimal data)
      const cartItemsForAPI = parsedCart.map(item => ({
        productId: item.product_id,
        quantity: item.qty,
        selectedVariant: item.selectedColor ? {
          color: item.selectedColor,
          selected: item.selectedSize ? [item.selectedSize] : []
        } : null,
        selectedSize: item.selectedSize
      }));

      // Call dedicated backend API to get fresh cart data (same as website)
      const { Post } = require('../../Helper/Service');
      const response = await Post('getCartItems', { items: cartItemsForAPI });
      
      console.log('Fresh cart data from API:', response);

      // Handle response format: {status: true, data: [...]}
      let cartDataArray = [];
      if (response?.data && Array.isArray(response.data)) {
        cartDataArray = response.data;
      } else if (Array.isArray(response)) {
        cartDataArray = response;
      } else {
        console.warn('Invalid response from getCartItems API:', response);
        setCartItems([]);
        setLoading(false);
        return;
      }

      if (cartDataArray.length === 0) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      // Format response for UI
      const freshCartItems = cartDataArray.map(item => {
        // Create unique cart item ID
        const cartItemId = item.selectedSize 
          ? `${item._id}_${item.selectedVariant?.color || 0}_${item.selectedSize}`
          : `${item._id}_${item.selectedVariant?.color || 0}`;

        return {
          id: cartItemId,
          product: {
            _id: item._id,
            name: item.name,
            image: item.image || 'https://via.placeholder.com/300',
            price: item.Offerprice || item.price || 0,
            originalPrice: item.price || 0,
            category: item.category?.name || 'Uncategorized',
            stock: item.stock || 0
          },
          variant: item.selectedVariant,
          selectedVariantName: item.selectedVariant?.name || '',
          selectedColor: item.selectedColor?.color || null,
          selectedSize: item.selectedSize,
          quantity: item.qty,
          totalPrice: item.total,
          inStock: item.inStock
        };
      });

      setCartItems(freshCartItems);

      // Update AsyncStorage with fresh data
      const updatedCartData = freshCartItems.map(item => ({
        _id: item.id,
        product_id: item.product._id,
        name: item.product.name,
        price: item.product.price,
        originalPrice: item.product.originalPrice,
        qty: item.quantity,
        total: item.totalPrice,
        image: item.product.image,
        selectedVariant: item.variant,
        selectedVariantName: item.selectedVariantName,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        userid: user?._id || 'guest'
      }));
      await AsyncStorage.setItem('cartData', JSON.stringify(updatedCartData));

    } catch (error) {
      console.error('Error fetching cart:', error);
      setError(error.message || 'Failed to load cart');
      
      // Fallback to cached data on error
      try {
        const cartData = await AsyncStorage.getItem('cartData');
        if (cartData) {
          const parsedCart = JSON.parse(cartData);
          const cachedItems = parsedCart.map(item => ({
            id: item._id,
            product: {
              _id: item.product_id,
              name: item.name,
              image: item.image || 'https://via.placeholder.com/300',
              price: item.price || 0,
              originalPrice: item.originalPrice || 0,
              category: 'Uncategorized'
            },
            variant: item.selectedVariant,
            selectedVariantName: item.selectedVariantName || '',
            selectedColor: item.selectedColor,
            selectedSize: item.selectedSize,
            quantity: item.qty,
            totalPrice: item.total
          }));
          setCartItems(cachedItems);
        }
      } catch (fallbackError) {
        console.error('Error loading cached cart:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Update cart item quantity in localStorage
  const updateCartQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }

    try {
      setUpdatingItem(itemId);
      
      const cartData = await AsyncStorage.getItem('cartData');
      if (cartData) {
        const parsedCart = JSON.parse(cartData);
        const updatedCart = parsedCart.map(item => {
          if (item._id === itemId) {
            return {
              ...item,
              qty: newQuantity,
              total: item.price * newQuantity
            };
          }
          return item;
        });
        
        await AsyncStorage.setItem('cartData', JSON.stringify(updatedCart));
        
        // Update local state
        setCartItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, quantity: newQuantity, totalPrice: item.product.price * newQuantity }
            : item
        ));
        
        // Update cart count in tab navigator
        updateCartCount();
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      Alert.alert(t('error'), error.message || t('failed_update_quantity'));
    } finally {
      setUpdatingItem(null);
    }
  };

  // Remove item from cart (localStorage)
  const removeFromCart = async (itemId) => {
    try {
      setUpdatingItem(itemId);
      
      const cartData = await AsyncStorage.getItem('cartData');
      if (cartData) {
        const parsedCart = JSON.parse(cartData);
        const updatedCart = parsedCart.filter(item => item._id !== itemId);
        
        await AsyncStorage.setItem('cartData', JSON.stringify(updatedCart));
        setCartItems(prev => prev.filter(item => item.id !== itemId));
        
        // Update cart count in tab navigator
        updateCartCount();
        Alert.alert(t('success'), t('item_removed_cart'));
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      Alert.alert(t('error'), error.message || t('failed_remove_item'));
    } finally {
      setUpdatingItem(null);
    }
  };

  // Calculate totals
  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      // Convert totalPrice to number (it might be string like "300.00")
      const itemTotal = parseFloat(item.totalPrice) || 0;
      return total + itemTotal;
    }, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * taxRate) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    return subtotal + tax + deliveryCharge;
  };

  // const calculateTotal = () => {
  //   return calculateSubtotal() + SERVICE_FEE + SHIPPING_FEE;
  // };

  // Render cart item
  const renderCartItem = ({ item }) => {
    const isUpdating = updatingItem === item.id;
    
    return (
      <View className="bg-white mx-4 mb-4 p-4 rounded-lg border border-gray-200">
        <View className="flex-row">
          {/* Product Image */}
          <Image
            source={{ uri: item.product.image }}
            className="w-20 h-20 rounded-lg mr-4"
            resizeMode="contain"
          />
          
          {/* Product Info */}
          <View className="flex-1">
            <Text className="text-black font-semibold text-base mb-1" numberOfLines={2}>
              {item.product.name}
            </Text>
            
            {/* Show variant details */}
            <View className="mb-2">
              {item.selectedVariantName && (
                <Text className="text-gray-600 text-xs mb-1">
                  {item.selectedVariantName}
                </Text>
              )}
              
              <View className="flex-row items-center flex-wrap">
                {item.selectedColor && (
                  <View className="flex-row items-center mr-3">
                    <Text className="text-gray-500 text-xs mr-1">Color:</Text>
                    <View 
                      className="w-3 h-3 rounded-full border border-gray-400"
                      style={{ backgroundColor: item.selectedColor }}
                    />
                  </View>
                )}
                
                {item.selectedSize && (
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-xs mr-1">Size:</Text>
                    <Text className="text-gray-700 text-xs font-medium">{item.selectedSize}</Text>
                  </View>
                )}
              </View>
            </View>
            
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-black font-bold text-lg">
                  {currencySymbol} {convertPrice(Number(item.product.price || 0)).toLocaleString()}
                </Text>
                {item.product.originalPrice > item.product.price && (
                  <Text className="text-gray-400 line-through text-sm">
                    {currencySymbol} {convertPrice(Number(item.product.originalPrice || 0)).toLocaleString()}
                  </Text>
                )}
              </View>
             
         {/* Quantity Controls */}
<View className="flex-row items-center">
  <TouchableOpacity
    onPress={() => updateCartQuantity(item.id, item.quantity - 1)}
    disabled={isUpdating}
    className={`w-8 h-8 rounded items-center justify-center ${isUpdating ? 'bg-gray-100' : 'bg-gray-200'}`}
  >
    <Text className={`text-lg font-bold ${isUpdating ? 'text-gray-400' : 'text-black'}`}>-</Text>
  </TouchableOpacity>
  
  <View className="mx-2 min-w-[25px] items-center">
    <Text className="text-base font-semibold">
      {item.quantity}
    </Text>
  </View>
  
  <TouchableOpacity
    onPress={() => updateCartQuantity(item.id, item.quantity + 1)}
    disabled={isUpdating}
    className={`w-8 h-8 rounded items-center justify-center ${isUpdating ? 'bg-gray-100' : 'bg-gray-200'}`}
  >
    <Text className={`text-lg font-bold ${isUpdating ? 'text-gray-400' : 'text-black'}`}>+</Text>
  </TouchableOpacity>
</View>
            </View>
            
            {/* Item Total */}
            <Text className="text-right text-black font-bold text-lg mt-2">
              {t('total')}: {currencySymbol} {convertPrice(Number(item.totalPrice || 0)).toLocaleString()}
            </Text>
          </View>
        </View>
        
        {/* Remove Button */}
        <TouchableOpacity
          onPress={() => removeFromCart(item.id)}
          disabled={updatingItem === item.id && updatingItem !== null}
          className="mt-3 py-1 px-3 rounded self-end bg-[#0B051D]"
        >
          <Text className="text-white text-center font-medium text-sm">
            {t('remove')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Fetch tax rate and delivery charges
  useEffect(() => {
    const fetchCharges = async () => {
      try {
        // Fetch tax rate
        const { GetApi } = require('../../Helper/Service');
        const taxResponse = await GetApi('getTax');
        console.log(taxResponse)
        if (taxResponse?.taxRate !== undefined) {
          setTaxRate(taxResponse.taxRate);
        }

        // Fetch delivery charge
        const deliveryResponse = await GetApi('getDeliveryCharge');
        console.log("Delivery charge response:", deliveryResponse);
        if (deliveryResponse?.data?.deliveryCharge !== undefined) {
          setDeliveryCharge(deliveryResponse.data.deliveryCharge);
          console.log("Delivery charge set to:", deliveryResponse.data.deliveryCharge);
        }
      } catch (error) {
        console.error('Error fetching charges:', error);
      }
    };

    fetchCharges();
  }, []);

  useEffect(() => {
    fetchCartItems();
  }, []);

  // Add focus listener to refresh cart when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCartItems();
    });

    return unsubscribe;
  }, [navigation]);

  // Remove login requirement for cart - allow guest cart
  // if (!user) {
  //   return (
  //     <SafeAreaView className="flex-1 bg-white">
  //       <View className="flex-1 justify-center items-center px-4">
  //         <Text className="text-gray-500 text-lg mb-4">Please login to view your cart</Text>
  //         <TouchableOpacity 
  //           onPress={() => navigation.navigate('Auth')}
  //           className="bg-orange-500 px-6 py-3 rounded-lg"
  //         >
  //           <Text className="text-white font-medium">Login</Text>
  //         </TouchableOpacity>
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

  const navigateToBilling = () => {
    setIsCheckingOut(true);
    
    // Pass complete product data including image
    const simplifiedCartItems = cartItems.map(item => ({
      id: item.id,
      product: {
        _id: item.product._id,
        name: item.product.name,
        price: item.product.price,
        image: item.product.image, // Include the image URL
        originalPrice: item.product.originalPrice
      },
      quantity: item.quantity,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize
    }));

    navigation.navigate('CartStack', {
      screen: 'BillingDetails',
      params: {
        cartItems: simplifiedCartItems,
        subtotal: calculateSubtotal(),
        shipping: SHIPPING_FEE,
        total: calculateTotal(),
        taxRate: taxRate,
        deliveryCharge: deliveryCharge
      }
    });
    
    // Reset loading state after navigation
    setTimeout(() => setIsCheckingOut(false), 500);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f97316" />
          <Text className="text-gray-400 mt-4">{t('loading_cart')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500 text-center mb-4">{error}</Text>
          <TouchableOpacity 
            onPress={fetchCartItems}
            className="bg-orange-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-gray-500 text-lg mb-4">{t('cart_empty')}</Text>
          <TouchableOpacity 
            onPress={() => {
              // Reset the navigation stack and navigate to the Home tab
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'HomeTab' }],
                })
              );
            }}
            className="bg-[#0B051D] px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">{t('continue_shopping')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
    <View className="flex-1">
      {/* Header */}
      <View className="bg-[#0B051D] px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <ChevronLeftIcon size={24} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-xl font-semibold">{t('shopping_cart')}</Text>
            <Text className="text-gray-300 text-sm">{cartItems.length} {cartItems.length === 1 ? t('item') : t('items')}</Text>
          </View>
        </View>
      </View>

      {/* Cart Items - with proper flex to leave space for bottom section */}
      <View className="flex-1">
        <FlatList
          data={cartItems}
          renderItem={renderCartItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ 
            paddingBottom: 20,
            paddingTop: 10
          }} 
          showsVerticalScrollIndicator={false}
          className="flex-1"
        />
      </View>

      {/* Order Summary - Fixed at bottom */}
      <View className="bg-white border-t border-gray-200 px-4 py-2 pb-28">
        <View className="mb-2">
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-600 text-sm">{t('subtotal')}</Text>
            <Text className="font-medium text-sm">{currencySymbol} {convertPrice(calculateSubtotal()).toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-600 text-sm">Tax ({taxRate}%)</Text>
            <Text className="font-medium text-sm">{currencySymbol} {convertPrice(calculateTax()).toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-600 text-sm">Delivery Charge</Text>
            <Text className="font-medium text-sm">{currencySymbol} {convertPrice(deliveryCharge).toLocaleString()}</Text>
          </View>
          {/* <View className="flex-row justify-between mb-1">
            <Text className="text-gray-600 text-sm">{t('shipping')}</Text>
            <Text className="text-green-600 font-medium text-sm">
              {SHIPPING_FEE === 0 ? t('free') : `$${SHIPPING_FEE.toFixed(2)}`}
            </Text>
          </View> */}
          <View className="h-px bg-gray-200 my-2" />
          <View className="flex-row justify-between mb-2">
            <Text className="text-base font-bold">{t('total')}</Text>
            <Text className="text-base font-bold">{currencySymbol} {convertPrice(calculateTotal()).toLocaleString()}</Text>
          </View>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          onPress={navigateToBilling}
          className={`py-3 rounded-lg items-center justify-center mb-2 ${isCheckingOut ? 'bg-slate-400' : 'bg-[#0B051D]'}`}
          disabled={cartItems.length === 0 || isCheckingOut}
        >
          {isCheckingOut ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">
              {t('proceed_to_checkout')} {currencySymbol} {convertPrice(calculateTotal()).toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </View>
  );
};

export default CartScreen;
