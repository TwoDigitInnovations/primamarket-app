import React, { useState, useEffect, useRef, useCallback } from 'react';

import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';
import FlashSale from '../../components/FlashSale';
import ProductGridCard from '../../components/ProductGridCard';
import { GetApi } from '../../Helper/Service';
import { useTranslation } from 'react-i18next';
import SwiperFlatList from 'react-native-swiper-flatlist';
import { useCurrency } from '../../context/CurrencyContext';
import { COLORS } from '../../config';


const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const [carouselImages, setCarouselImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // 
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { convertPrice, currencySymbol, formatPrice, userCurrency, exchangeRate, isLoading: currencyLoading } = useCurrency();
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef(null);

  const [bestSellingProducts, setBestSellingProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [topSoldProducts, setTopSoldProducts] = useState([]);
  const [loadingTopSold, setLoadingTopSold] = useState(true);
  const [exploreProducts, setExploreProducts] = useState([]);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [galleryData, setGalleryData] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);

  const handleProductPress = (product) => {
    console.log('Navigating to product:', product.id || product._id, product.name);
    // Use slug if available, otherwise use _id
    const productSlug = product.slug || product._id;
    navigation.navigate('ProductDetail', {
      productId: productSlug,
      productName: product.name,
      // Pass the entire product object for debugging
      _product: product
    });
  };
  const setCarouselRef = useCallback((ref) => {
    flatListRef.current = ref;
    console.log('ScrollView ref set:', ref !== null);
  }, []);


  useEffect(() => {
    let interval = null;

    if (carouselImages.length > 1) {
      interval = setInterval(() => {
        setCurrentImageIndex(prevIndex => (prevIndex + 1) % carouselImages.length);
      }, 2000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [carouselImages.length]);
  // Fetch best selling products
  const fetchBestSellingProducts = async () => {
    try {
      setLoadingProducts(true);
      setError(null);


      const response = await GetApi("getProduct");


      // Handle different response formats
      let productsData = response;

      // If response has data property, use that
      if (response && response.data) {
        productsData = response.data;
      }
      console.log('Best selling products response:', response);

      if (Array.isArray(productsData)) {
        // Filter only verified products
        const verifiedProducts = productsData.filter(product => product.is_verified === true);
        
        // Pass original product data with minimal processing - ProductGridCard will handle the rest
        const products = verifiedProducts.map((product, index) => ({
          ...product,
          id: product._id || `product-${index}`,
          slug: product.slug || product._id,
        }));


        setBestSellingProducts(products);
      } else {
        console.warn('Invalid response structure:', response);
        setBestSellingProducts([]);
        setError(t('no_products_found_invalid_format'));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setBestSellingProducts([]);

      const errorMessage = error.message || 'An error occurred';
      console.error('API Error:', errorMessage);

      if (errorMessage.includes('No internet connection')) {
        setError(t('no_internet_connection'));
      } else if (errorMessage.includes('Session expired') || errorMessage.includes('401')) {
        setError(t('session_expired'));
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        setError(t('request_timed_out'));
      } else if (errorMessage.includes('No response from server') || errorMessage.includes('Network Error')) {
        setError(t('unable_connect_server'));
      } else {
        setError(t('failed_load_products'));
      }
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await GetApi("getCategory");
      if (response && response.data && Array.isArray(response.data)) {
        // Take first 8 categories
        setCategories(response.data.slice(0, 8));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchBestSellingProducts();
    fetchCategories();
  }, []);





  useEffect(() => {
    const fetchBestSellingProducts = async () => {
      try {
        setLoadingProducts(true);
        setError(null);


        const response = await GetApi("getTopSoldProduct");


        // Handle different response formats
        let productsData = response;

        // If response has data property, use that
        if (response && response.data) {
          productsData = response.data;
        }


        if (Array.isArray(productsData)) {
          const products = productsData.map((product, index) => {
            // Image handling - check if it's base64 or URL
            let imageUrl = 'https://via.placeholder.com/300';

            if (product.varients?.[0]?.image?.[0]) {
              const imageData = product.varients[0].image[0];

              if (imageData.startsWith('data:image/')) {
                imageUrl = imageData;
              } else {
                imageUrl = imageData;
              }
            } else if (product.image) {
              imageUrl = product.image;
            }

            // Extract price with proper priority
            let regularPrice = 0;
            let offerPrice = 0;
            
            // Priority 1: price_slot
            if (product.price_slot && product.price_slot.length > 0 && product.price_slot[0].price) {
              regularPrice = product.price_slot[0].price;
              offerPrice = product.price_slot[0].Offerprice || regularPrice;
            }
            // Priority 2: varients
            else if (product.varients && product.varients.length > 0 && product.varients[0].price) {
              regularPrice = product.varients[0].price;
              offerPrice = product.varients[0].Offerprice || regularPrice;
            }
            // Priority 3: direct price
            else if (product.price) {
              regularPrice = product.price;
              offerPrice = product.price;
            }
            
            const displayPrice = offerPrice > 0 ? offerPrice : regularPrice;

            return {
              id: product._id || `product-${index}`,
              slug: product.slug || product._id,
              name: product.name || 'Unnamed Product',
              price: `${Math.round(displayPrice)}`,
              originalPrice: `${Math.round(regularPrice)}`,
              discount: (regularPrice && offerPrice && offerPrice < regularPrice)
                ? `${Math.round(((regularPrice - offerPrice) / regularPrice * 100))}% OFF`
                : '0% OFF',
              rating: 4.0,
              image: imageUrl,
              category: product.category?.name || 'Uncategorized',
              soldPieces: product.sold_pieces || 0
            };
          });

          console.log('Processed products:', products);
          setBestSellingProducts(products);
        } else {
          console.warn('Invalid response structure:', response);
          setBestSellingProducts([]);
          setError(t('no_products_found_invalid_format'));
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setBestSellingProducts([]);


        const errorMessage = error.message || 'An error occurred';
        console.error('API Error:', errorMessage);

        if (errorMessage.includes('No internet connection')) {
          setError('No internet connection. Please check your connection and try again.');
        } else if (errorMessage.includes('Session expired') || errorMessage.includes('401')) {
          setError('Your session has expired. Please login again.');
        } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          setError('Request timed out. The server is taking too long to respond.');
        } else if (errorMessage.includes('No response from server') || errorMessage.includes('Network Error')) {
          setError('Unable to connect to the server. Please try again later.');
        } else {
          setError(`Failed to load products: ${errorMessage}`);
        }
      } finally {
        setLoadingProducts(false);
      }
    };


  }, []);
  const fetchCarouselImages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await GetApi("getsetting");

      if (response && response.success !== false && response.setting && response.setting[0]?.carousel) {
        const carouselItems = response.setting[0].carousel;
        const images = carouselItems.map((item, index) => item.image);
        setCarouselImages(images);
      } else {
        console.warn('No carousel data found in response:', response);
        setCarouselImages([]);
        setError(t('no_carousel_images'));
      }
    } catch (error) {
      console.error('Error fetching carousel images:', error);
      setCarouselImages([]);
      setError(t('failed_load_carousel'));
    } finally {
      setLoading(false);
    }
  };

  const fetchGalleryImages = async () => {
    try {
      const response = await GetApi("gallery");
      console.log('Gallery API response:', response);
      
      if (response && response.status && response.data) {
        const newArrivalItems = response.data
          .filter(item => item.type === 'new_arrival' && item.isActive)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const arrivals = newArrivalItems.map((item, index) => ({
          id: item._id || index + 1,
          title: item.title || `Featured Product ${index + 1}`,
          subtitle: item.subtitle || item.description || 'Discover amazing products',
          image: item.image,
          link: item.link || null,
        }));
        
        setNewArrivals(arrivals);
        console.log('New arrivals set:', arrivals);
      } else {
        console.warn('No gallery data found');
        setNewArrivals([]);
      }
    } catch (error) {
      console.error('Error fetching gallery images:', error);
      setNewArrivals([]);
    }
  };

  useEffect(() => {
    fetchCarouselImages();
    fetchGalleryImages();
  }, []);

  const fetchExploreProducts = useCallback(async (retryCount = 0) => {
    try {
      setLoadingExplore(true);
      setError(null);
      console.log(`Fetching explore products (attempt ${retryCount + 1})...`);

      const response = await GetApi("getProduct");
      console.log('Explore products response:', response);

      let productsData = response;
      if (response && response.data) {
        productsData = response.data;
      }

      if (Array.isArray(productsData)) {
        const products = productsData.map((product, index) => {
          let imageUrl = 'https://via.placeholder.com/300';

          if (product.varients?.[0]?.image?.[0]) {
            const imageData = product.varients[0].image[0];

            if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
              imageUrl = imageData;
            } else if (typeof imageData === 'string') {
              imageUrl = imageData.replace(/^"|"$/g, '');
            }
          } else if (product.image) {
            imageUrl = typeof product.image === 'string' ?
              product.image.replace(/^"|"$/g, '') :
              'https://via.placeholder.com/300';
          }

          // Extract price with proper priority
          let regularPrice = 0;
          let offerPrice = 0;
          
          // Priority 1: price_slot
          if (product.price_slot && product.price_slot.length > 0 && product.price_slot[0].price) {
            regularPrice = product.price_slot[0].price;
            offerPrice = product.price_slot[0].Offerprice || regularPrice;
          }
          // Priority 2: varients
          else if (product.varients && product.varients.length > 0 && product.varients[0].price) {
            regularPrice = product.varients[0].price;
            offerPrice = product.varients[0].Offerprice || regularPrice;
          }
          // Priority 3: direct price
          else if (product.price) {
            regularPrice = product.price;
            offerPrice = product.price;
          }
          
          const displayPrice = offerPrice > 0 ? offerPrice : regularPrice;

          // Calculate discount percentage safely
          let discountText = '0% OFF';
          if (regularPrice && offerPrice && offerPrice < regularPrice && regularPrice > 0) {
            const discountPercent = Math.round(((regularPrice - offerPrice) / regularPrice) * 100);
            discountText = `${discountPercent}% OFF`;
          }

          return {
            id: product._id || `product-${index}`,
            slug: product.slug || product._id,
            name: product.name || 'Unnamed Product',
            price: `${Math.round(displayPrice)}`,
            originalPrice: `${Math.round(regularPrice)}`,
            discount: discountText,
            rating: 4.0,
            image: imageUrl,
            category: product.category?.name || 'Uncategorized',
            soldPieces: product.sold_pieces || 0
          };
        });

        console.log('Processed explore products:', products);
        setExploreProducts(products);
      } else {
        console.warn('Invalid response structure for explore products:', response);
        setExploreProducts([]);
        setError(t('no_explore_products_found'));
      }
    } catch (error) {
      console.error('Error fetching explore products:', error);
      setExploreProducts([]);

      const errorMessage = error.message || 'An error occurred';
      console.error('Explore Products API Error:', errorMessage);

      const isTimeoutError = errorMessage.includes('timeout') ||
        errorMessage.includes('timed out') ||
        error.code === 'ECONNABORTED';

      if (isTimeoutError && retryCount < 1) {
        console.log(`Retrying explore products fetch (attempt ${retryCount + 2})...`);
        return fetchExploreProducts(retryCount + 1);
      }

      if (errorMessage.includes('No internet connection')) {
        setError(t('no_internet_connection'));
      } else if (errorMessage.includes('Session expired') || errorMessage.includes('401')) {
        setError(t('session_expired'));
      } else if (isTimeoutError) {
        setError(t('server_taking_too_long'));
      } else if (errorMessage.includes('No response from server') || errorMessage.includes('Network Error')) {
        setError(t('unable_connect_server'));
      } else {
        setError(t('failed_load_products'));
      }
    } finally {
      setLoadingExplore(false);
    }
  }, []);

  // Fetch top sold products
  const fetchTopSoldProducts = useCallback(async () => {
    try {
      setLoadingTopSold(true);
      const response = await GetApi("getTopSoldProduct");
      console.log('Top sold products response:', response);
      
      // Handle response with data property
      const productsData = response?.data || response;
      
      if (Array.isArray(productsData)) {
        // Take only first 4 products for home page
        const products = productsData.slice(0, 4).map(product => ({
          id: product._id,
          name: product.name,
          price: (() => {
            // Priority 1: price_slot
            if (product.price_slot && product.price_slot.length > 0 && product.price_slot[0].price) {
              return `${Math.round(product.price_slot[0].Offerprice || product.price_slot[0].price)}`;
            }
            // Priority 2: varients
            if (product.varients && product.varients.length > 0 && product.varients[0].price) {
              return `${Math.round(product.varients[0].Offerprice || product.varients[0].price)}`;
            }
            // Priority 3: direct price
            return `${Math.round(product.price || 0)}`;
          })(),
          originalPrice: (() => {
            // Priority 1: price_slot
            if (product.price_slot && product.price_slot.length > 0 && product.price_slot[0].price) {
              return `${Math.round(product.price_slot[0].price)}`;
            }
            // Priority 2: varients
            if (product.varients && product.varients.length > 0 && product.varients[0].price) {
              return `${Math.round(product.varients[0].price)}`;
            }
            // Priority 3: direct price
            return `${Math.round(product.price || 0)}`;
          })(),
          image: product.varients?.[0]?.image?.[0] || product.images?.[0] || product.image || 'https://via.placeholder.com/300',
          rating: 4.5,
          slug: product.slug || product._id
        }));
        setTopSoldProducts(products);
      } else {
        setTopSoldProducts([]);
      }
    } catch (error) {
      console.error('Error fetching top sold products:', error);
      setTopSoldProducts([]);
    } finally {
      setLoadingTopSold(false);
    }
  }, []);

  useEffect(() => {
    fetchCarouselImages();
    fetchExploreProducts();
    fetchTopSoldProducts();
  }, [fetchExploreProducts, fetchTopSoldProducts]);



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
      <Text key={index} className="text-orange-400 text-sm">
        {star}
      </Text>
    ));
  };

  const renderCarouselItem = ({ item, index }) => (
    <TouchableOpacity
      key={`carousel-${index}`}
      style={{ width: width, height: 200, paddingHorizontal: 10 }}
      onPress={() => navigation.navigate('BestSellingProducts')}
      activeOpacity={0.8}
    >
      <View style={{
        flex: 1,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }}>
        <Image
          key={`carousel-img-${index}`}
          source={{ uri: item }}
          style={{
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
          }}
        />
      </View>
    </TouchableOpacity>
  );

  // Add this to handle initial scroll
  // useEffect(() => {
  //   if (flatListRef.current && carouselImages.length > 0) {
  //     flatListRef.current.scrollToIndex({ index: currentImageIndex, animated: false });
  //   }
  // }, []);

  const renderExploreProduct = ({ item }) => (
    <TouchableOpacity
      key={`explore-${item.id}`}
      onPress={() => handleProductPress(item)}
      className="w-40 mr-4 mb-4"
    >
      <View className="bg-gray-100 rounded-lg p-4 w-full">
        <Image
          source={{ uri: item.image }}
          className="w-full h-32 rounded-lg mb-3"
          resizeMode="contain"
        />
        <Text className="text-black font-medium text-sm mb-2" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-black font-bold text-lg">
          ${typeof item.price === 'string' ? item.price : (item.price || '0.00')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderBestSellingProduct = ({ item }) => (
    <ProductGridCard item={item} />
  );

  const renderProductItem = ({ item }) => {
    // Get price with comprehensive fallbacks (same logic as ProductGridCard)
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
      
      // Priority 2: Check variants for price
      if (price === 0 && item.varients && item.varients.length > 0) {
        const variant = item.varients[0];
        if (variant.price && parseFloat(variant.price) > 0) {
          price = parseFloat(variant.price) || 0;
          offerPrice = variant.Offerprice && parseFloat(variant.Offerprice) > 0 
            ? parseFloat(variant.Offerprice) 
            : price;
        } else if (variant.Offerprice && parseFloat(variant.Offerprice) > 0) {
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
      
      return { price, offerPrice };
    };

    // Get image
    const getImage = () => {
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

    const { price, offerPrice } = getPrice();
    const imageUri = getImage();
    const hasDiscount = offerPrice && offerPrice < price;

    return (
      <TouchableOpacity
        key={`explore-${item.id}`}
        onPress={() => handleProductPress(item)}
        className="w-40 mr-4 mb-4"
      >
        <View className="bg-gray-100 rounded-lg p-4 w-full">
          {hasDiscount && (
            <View className="absolute top-2 left-2 bg-[#0B051D] px-2 py-1 rounded z-10">
              <Text className="text-white text-xs font-bold">
                {Math.round(((price - offerPrice) / price) * 100)}% OFF
              </Text>
            </View>
          )}
          <Image
            source={{ uri: imageUri }}
            className="w-full h-32 rounded-lg mb-3"
            resizeMode="contain"
          />
          <Text className="text-black font-medium text-sm mb-2" numberOfLines={1}>
            {item.name}
          </Text>
          {hasDiscount ? (
            <View className="flex-row items-center">
              <Text className="text-black font-bold text-lg mr-2">
                ${offerPrice.toFixed(2)}
              </Text>
              <Text className="text-gray-400 line-through text-sm">
                ${price.toFixed(2)}
              </Text>
            </View>
          ) : (
            <Text className="text-black font-bold text-lg">
              ${(offerPrice || price).toFixed(2)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Carousel */}


        {/* Carousel */}
        <View style={{ marginVertical: 20 }}>
          {loading ? (
            <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          ) : error ? (
            <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: 'red' }}>{error}</Text>
            </View>
          ) : carouselImages && carouselImages?.length > 0 ? (
            <View>
              {/* Simple Image Display with Index Change */}
              <View style={{ width: width, alignItems: 'center', height: 200 }}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('BestSellingProducts')}
                  style={{
                    height: 180,
                    width: width - 20,
                    borderRadius: 20,
                    overflow: 'hidden',
                    alignSelf: 'center',
                  }}
                >
                  <Image
                    source={{ uri: carouselImages[currentImageIndex] }}
                    style={{
                      height: '100%',
                      width: '100%',
                    }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              </View>

              {/* Dots */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'center',
                paddingTop: 10
              }}>
                {carouselImages.map((_, index) => (
                  <View
                    key={index}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: index === currentImageIndex ? '#f97316' : '#d1d5db',
                      marginHorizontal: 4
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* Explore Categories */}
        <View className="px-4 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-1 h-6 bg-orange-500 rounded-full mr-2" />
              <Text className="text-black text-xl font-bold">{t('explore_categories')}</Text>
            </View>
            <TouchableOpacity style={{ backgroundColor: COLORS.mainColor }}
              onPress={() => navigation.navigate('Categories')}
              className=" px-4 py-1 rounded-full"
            >
              <Text className="text-white text-sm">{t('see_all')}</Text>
            </TouchableOpacity>
          </View>

          {loadingCategories ? (
            <View className="flex-row justify-center py-4">
              <ActivityIndicator size="small" color="#000" />
            </View>
          ) : categories.length > 0 ? (
            <View className="flex-row flex-wrap -mx-1">
              {categories.map((category, index) => (
                <TouchableOpacity
                  key={`category-${category._id || index}`}
                  className="w-1/4 p-1 mb-2"
                  onPress={() => {
                    navigation.navigate('CategoryProducts', {
                      categoryId: category._id || category.id,
                      categoryName: category.name
                    });
                  }}
                >
                  <View className="bg-gray-100 rounded-lg p-2 items-center">
                    <Image
                      source={{ uri: category.image }}
                      className="w-12 h-12 rounded-full mb-2"
                      resizeMode="cover"
                    />
                    <Text
                      className="text-xs text-center text-gray-800 font-medium h-10"
                      numberOfLines={2}
                    >
                      {category.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="py-4 items-center">
              <Text className="text-gray-500">{t('no_categories_found')}</Text>
            </View>
          )}
        </View>

        {/* Flash Sale Section */}
        <View className="px-4 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-4 h-6 bg-orange-500 rounded mr-3" />
            <Text className="text-orange-500 font-semibold">{t('todays')}</Text>
          </View>
          <Text className="text-2xl font-bold text-black mb-4">{t('flash_sales')}</Text>
          <FlashSale />
        </View>
  {/* Best Selling Products Section */}
        <View className="mb-6 px-4">
          <View className="flex-row items-center mb-4">
            <View className="w-4 h-6 bg-orange-500 rounded mr-3" />
            <Text className="text-orange-500 font-semibold">{t('this_month')}</Text>
          </View>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-black">{t('best_selling_products')}</Text>
            <TouchableOpacity style={{ backgroundColor: COLORS.mainColor }} 
              onPress={() => navigation.navigate('TopSellingProducts')}
              className=" px-6 py-2 rounded"
            >
              <Text className="text-white font-medium">{t('view_all')}</Text>
            </TouchableOpacity>
          </View>

          {loadingTopSold ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#f97316" />
              <Text className="text-gray-400 mt-2">{t('loading_products')}</Text>
            </View>
          ) : topSoldProducts.length > 0 ? (
            <FlatList
              data={topSoldProducts}
              renderItem={({ item }) => (
                <View style={{ marginRight: 2 }}>
                  <ProductGridCard item={item} />
                </View>
              )}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            />
          ) : (
            <View className="items-center py-8">
              <Text className="text-gray-400">{t('no_products_available')}</Text>
            </View>
          )}
        </View>
        {/* This Month - Best Selling Products */}
        <View className="px-4 mb-6">
          {/* <View className="flex-row items-center mb-4">
            <View className="w-4 h-6 bg-orange-500 rounded mr-3" />
            <Text className="text-orange-500 font-semibold">{t('this_month')}</Text>
          </View> */}

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-bold text-black">{t('explore_our_products')}</Text>
            <TouchableOpacity style={{ backgroundColor: COLORS.mainColor }}
              className=" px-6 py-2 rounded"
              onPress={() => navigation.navigate('BestSellingProducts', { products: bestSellingProducts })}
            >
              <Text className="text-white font-medium">{t('view_all')}</Text>
            </TouchableOpacity>
          </View>

          {loadingProducts ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#f97316" />
              <Text className="text-gray-400 mt-2">{t('loading_best_selling')}</Text>
            </View>
          ) : error ? (
            <View className="items-center py-8 bg-red-50 rounded-lg mx-4">
              <Text className="text-red-500 text-center mb-3">{error}</Text>
              <TouchableOpacity
                onPress={() => {
                  setError(null);
                  fetchBestSellingProducts();
                }}
                className="bg-orange-500 px-4 py-2 rounded"
              >
                <Text className="text-white font-medium">{t('retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : bestSellingProducts.length > 0 ? (
            <FlatList
              data={bestSellingProducts}
              renderItem={renderBestSellingProduct}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            />
          ) : (
            <View className="items-center py-8">
              <Text className="text-gray-400">{t('no_products_available')}</Text>
            </View>
          )}
        </View>

      

        {/* Explore Our Products - Temporarily Commented Out 
        <View className="mb-6 px-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold">Explore Our Products</Text>
            <TouchableOpacity>
              <Text className="text-orange-500">See All</Text>
            </TouchableOpacity>
          </View>

          {loadingExplore ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#f97316" />
              <Text className="text-gray-400 mt-2">Loading products...</Text>
            </View>
          ) : exploreProducts.length > 0 ? (
            <FlatList
              data={exploreProducts}
              renderItem={renderExploreProduct}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            />
          ) : (
            <View className="items-center py-8">
              <Text className="text-gray-400">{t('no_products_available')}</Text>
            </View>
          )}
        </View>
        */}

        {/* Featured - New Arrivals */}
        <View className="px-4 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-4 h-6 bg-orange-500 rounded mr-3" />
            <Text className="text-orange-500 font-semibold">{t('featured')}</Text>
          </View>
          <Text className="text-2xl font-bold text-black mb-4">{t('new_arrival')}</Text>

          {newArrivals.length > 0 ? (
            newArrivals.map((item) => (
              <View key={item.id} className="mb-4">
                <View className="relative">
                  <View className="relative">
                    <Image
                      source={{ uri: item.image }}
                      className="w-full h-48 rounded-lg"
                      resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-black opacity-40 rounded-lg" />
                  </View>
                  <View className="absolute bottom-4 left-4 right-4">
                    <Text className="text-white text-xl font-bold mb-1" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="text-white text-sm mb-3 opacity-80" numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('BestSellingProducts')}
                      activeOpacity={0.8}
                    >
                      <Text className="text-white text-sm underline">{t('shop_now')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center py-8">
              <Text className="text-gray-400">No Featured Products</Text>
            </View>
          )}
        </View>

        {/* Services */}
        <View className="px-4 pb-8">
          <View className="space-y-6">

            <View className="items-center">
              <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-3">
                <View className="w-10 h-10 bg-[#0B051D] rounded-full items-center justify-center">
                  <Text className="text-white text-lg">🚚</Text>
                </View>
              </View>
              <Text className="text-black font-bold text-lg mb-1">{t('free_fast_delivery')}</Text>
              <Text className="text-gray-600 text-center">{t('free_delivery_over_140')}</Text>
            </View>


            <View className="items-center">
              <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-3">
                <View className="w-10 h-10 bg-[#0B051D] rounded-full items-center justify-center">
                  <Text className="text-white text-lg">🎧</Text>
                </View>
              </View>
              <Text className="text-black font-bold text-lg mb-1">{t('customer_service_24_7')}</Text>
              <Text className="text-gray-600 text-center">{t('friendly_customer_support')}</Text>
            </View>

            <View className="items-center">
              <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-3">
                <View className="w-10 h-10 bg-[#0B051D] rounded-full items-center justify-center">
                  <Text className="text-white text-lg">✓</Text>
                </View>
              </View>
              <Text className="text-black font-bold text-lg mb-1">{t('money_back_guarantee')}</Text>
              <Text className="text-gray-600 text-center mb-2">{t('money_back_30_days')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;