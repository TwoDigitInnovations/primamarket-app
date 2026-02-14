import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GetApi } from '../../Helper/Service';
import Header from '../../components/Header';
import ProductGridCard from '../../components/ProductGridCard';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';

const TopSellingProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { convertPrice, currencySymbol } = useCurrency();

  const fetchTopSellingProducts = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const response = await GetApi("getTopSoldProduct");
      console.log('Top selling products response:', response);
      
      // Handle response with data property
      const productsArray = response?.data || response;
      
      if (Array.isArray(productsArray)) {
        
        setProducts(productsArray);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching top selling products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTopSellingProducts(true);
  };

  useEffect(() => {
    fetchTopSellingProducts();
  }, []);

  const renderProduct = ({ item }) => (
    <View style={styles.productContainer}>
      <ProductGridCard item={item} />
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <Header title={t('best_selling_products')} showBack={true} />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f97316" />
          <Text className="text-gray-400 mt-2">{t('loading_products')}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => (item._id || item.id || '').toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#f97316']}
              tintColor="#f97316"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-10">
              <Text className="text-gray-500">{t('no_products_available')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  productContainer: {
    width: '48%',
    marginBottom: 16,
  },
});

export default TopSellingProducts;
