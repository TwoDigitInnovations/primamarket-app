import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import axios from 'axios';
import { GetApi } from '../Helper/Service';
import { CommonActions } from '@react-navigation/native';

export const AuthContext = createContext();

export const cartContext = createContext([[], () => {}]);
export const userContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  // Check for existing token on app load
  useEffect(() => {
    const checkToken = async () => {
      try {
        console.log('Checking for existing token...');
        const token = await AsyncStorage.getItem('userToken');
        console.log('Token found in AsyncStorage:', token ? 'Yes' : 'No');
        setUserToken(token);
        
        if (token) {
          const userData = await AsyncStorage.getItem('userInfo');
          setUserInfo(userData ? JSON.parse(userData) : null);
        }
      } catch (error) {
        console.error('Error checking token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  const login = async (email, password, navigation) => {
    console.log('AuthContext: Starting login process...');
    setIsLoading(true);
    
    try {
      console.log('1. Making login request to:', `${API_BASE_URL}auth/login`);
      
      console.log('2. Sending login request...');
      const response = await axios({
        method: 'post',
        url: `${API_BASE_URL}auth/login`,
        data: { email, password },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('4. Login response received:', {
        status: response.status,
        hasData: !!response.data,
        hasToken: !!response.data?.token
      });
      
      if (response.status !== 200) {
        const errorMsg = response.data?.message || `Login failed with status ${response.status}`;
        console.error('Login error:', {
          status: response.status,
          message: errorMsg,
          responseData: response.data
        });
        throw new Error(errorMsg);
      }
      
      if (!response.data.token || !response.data.user) {
        console.error('Invalid response format:', response.data);
        throw new Error('Invalid response from server');
      }
      
      const { token, user } = response.data;
      console.log('5. Login successful, token received:', token ? 'Yes' : 'No');
      
      // Store token and user info with verification
      console.log('6. Storing token and user data...');
      
      // Store new token and user info
      await Promise.all([
        AsyncStorage.setItem('userToken', token),
        AsyncStorage.setItem('userInfo', JSON.stringify(user))
      ]);
      
      // Verify storage
      const [storedToken] = await Promise.all([
        AsyncStorage.getItem('userToken'),
        AsyncStorage.getItem('userInfo')
      ]);
      
      console.log('7. Token verification - stored:', storedToken ? 'Success' : 'Failed');
      
      if (!storedToken) {
        throw new Error('Failed to store authentication token');
      }
      
      // Update context state
      setUserToken(token);
      setUserInfo(user);
      
      console.log('Token and user data stored successfully');
      
      // Check if user is a seller and needs to create a store
      if (user.role === 'seller' && !user.storeId) {
        console.log('Seller detected without store, will redirect to CreateStoreScreen');
        // The navigation will be handled by the RootNavigator based on isSellerWithoutStore
      }
      
      return { 
        success: true, 
        data: response.data,
        user: user,
        requiresStoreSetup: user.role === 'seller' && !user.storeId
      };
      
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error:', error.message);
        errorMessage = error.message || 'An error occurred during login';
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userInfo');
      setUserToken(null);
      setUserInfo(null);
      setIsLoading(false);
    } catch (e) {
      console.log('Logout error:', e);
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      console.log('Registering with data:', userData);
      const url = `${API_BASE_URL}auth/register`;
      
      const response = await axios.post(url, userData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });
      
      console.log('Registration response:', response.data);
      
      // If registration is successful but doesn't return a token,
      // just return success and let the user login manually
      return { 
        success: true, 
        data: response.data,
        message: 'Registration successful! Please login with your credentials.'
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response) {
        // Server responded with an error status code (4xx, 5xx)
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        if (error.response.status === 422 && error.response.data.errors) {
          // Handle validation errors
          const errors = Object.values(error.response.data.errors).flat();
          errorMessage = errors.join('\n');
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check your internet connection.';
      } else {
        // Something went wrong in setting up the request
        console.error('Error:', error.message);
        errorMessage = error.message || errorMessage;
      }
      
      return { 
        success: false, 
        error: errorMessage,
        status: error.response?.status
      };
    } finally {
      setIsLoading(false);
    }
  };

  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const user = await AsyncStorage.getItem('userInfo');
      
      if (user) {
        setUserToken(token);
        setUserInfo(JSON.parse(user));
      }
      setIsLoading(false);
    } catch (e) {
      console.log('isLoggedIn error:', e);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wrap async function calls properly
    const initializeAuth = async () => {
      await isLoggedIn();
      await updateFavoritesCount();
      await updateCartCount();
    };
    initializeAuth();
  }, []);

  const [cart, setCart] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  // Update favorites count from AsyncStorage
  const updateFavoritesCount = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favorites');
      if (favorites) {
        const favArray = JSON.parse(favorites);
        setFavoritesCount(favArray.length);
      } else {
        setFavoritesCount(0);
      }
    } catch (error) {
      console.error('Error updating favorites count:', error);
      setFavoritesCount(0);
    }
  };

  // Update cart count from localStorage
  const updateCartCount = async () => {
    try {
      const cartData = await AsyncStorage.getItem('cartData');
      if (cartData) {
        const parsedCart = JSON.parse(cartData);
        if (Array.isArray(parsedCart)) {
          // Count unique items instead of summing quantities
          const uniqueItemsCount = parsedCart.length;
          setCartCount(uniqueItemsCount);
        }
      } else {
        setCartCount(0);
      }
    } catch (error) {
      console.error('Error updating cart count:', error);
      setCartCount(0);
    }
  };

  // Add item to cart (localStorage)
  const addToCart = async (product, selectedVariant = 0, quantity = 1, selectedSize = null, selectedPrice = null) => {
    try {
      const cartData = await AsyncStorage.getItem('cartData');
      let cart = cartData ? JSON.parse(cartData) : [];
      
      // Get price from selected variant if available, otherwise use price_slot
      const variant = product.varients?.[selectedVariant];
      
      // Determine price with multiple fallbacks
      let variantPrice = 0;
      let variantOriginalPrice = 0;
      
      if (selectedPrice && selectedPrice.Offerprice) {
        // Use provided price from size/variant selection
        variantPrice = selectedPrice.Offerprice;
        variantOriginalPrice = selectedPrice.price || selectedPrice.Offerprice;
      } else if (variant) {
        // Use variant price
        variantPrice = variant.Offerprice || variant.price || 0;
        variantOriginalPrice = variant.price || variantPrice;
      } else if (product.price_slot && product.price_slot.length > 0) {
        // Use price_slot
        variantPrice = product.price_slot[0].Offerprice || product.price_slot[0].price || 0;
        variantOriginalPrice = product.price_slot[0].price || variantPrice;
      } else {
        // Use direct product price
        variantPrice = product.Offerprice || product.price || 0;
        variantOriginalPrice = product.price || variantPrice;
      }
      
      // Ensure price is greater than 0
      if (variantPrice === 0 && variantOriginalPrice > 0) {
        variantPrice = variantOriginalPrice;
      }
      
      // Determine image with multiple fallbacks
      let productImage = 'https://via.placeholder.com/300';
      if (variant?.image && variant.image.length > 0) {
        productImage = variant.image[0];
      } else if (product.varients?.[selectedVariant]?.image && product.varients[selectedVariant].image.length > 0) {
        productImage = product.varients[selectedVariant].image[0];
      } else if (product.images && product.images.length > 0) {
        productImage = product.images[0];
      } else if (product.image) {
        productImage = product.image;
      }
      
      // Use provided size or get from variant's selected array
      const variantSize = selectedSize || variant?.selected?.[0]?.value || variant?.size || null;
      
      // Create unique ID including size if available
      const cartItemId = selectedSize 
        ? `${product._id}_${selectedVariant}_${selectedSize}`
        : `${product._id}_${selectedVariant}`;
      
      const cartItem = {
        _id: cartItemId,
        product_id: product._id,
        name: product.name,
        price: variantPrice,
        originalPrice: variantOriginalPrice,
        qty: quantity,
        total: variantPrice * quantity,
        image: productImage,
        selectedVariant: selectedVariant,
        selectedVariantName: variant?.name || '',
        selectedColor: variant?.color || null,
        selectedSize: variantSize,
        userid: userInfo?._id || 'guest'
      };

      // Check if item already exists
      const existingIndex = cart.findIndex(item => item._id === cartItem._id);
      
      if (existingIndex >= 0) {
        // Update quantity
        cart[existingIndex].qty += quantity;
        cart[existingIndex].total = cart[existingIndex].price * cart[existingIndex].qty;
      } else {
        // Add new item
        cart.push(cartItem);
      }

      await AsyncStorage.setItem('cartData', JSON.stringify(cart));
      await updateCartCount();
      return { success: true };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { success: false, error: error.message };
    }
  };

  // Initialize cart count on app load
  useEffect(() => {
    // Wrap async function call properly
    const initializeCart = async () => {
      await updateCartCount();
    };
    initializeCart();
  }, [userInfo]);

  const authContextValue = {
    isLoading,
    userToken,
    userInfo,
    login,
    logout,
    register,
    cartCount,
    updateCartCount,
    updateFavoritesCount,
    favoritesCount,
    addToCart,
    updateUserInfo: (userData) => {
      setUserInfo(userData);
      AsyncStorage.setItem('userInfo', JSON.stringify(userData));
    }
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <userContext.Provider value={[currentUser, setCurrentUser]}>
        <cartContext.Provider value={[cart, setCart]}>
          {children}
        </cartContext.Provider>
      </userContext.Provider>
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
