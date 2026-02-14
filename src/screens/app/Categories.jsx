import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StyleSheet
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GetApi } from '../../Helper/Service';
import Header from '../../components/Header';
import ProductCard from '../../components/ProductCard';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';


const { width } = Dimensions.get('window');

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { t } = useTranslation();

  const fetchCategories = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const response = await GetApi("getCategory");
      if (response && response.data && Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories(true);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const renderCategoryItem = ({ item, index }) => (
    <TouchableOpacity
      key={`category-${item._id || index}`}
      className="w-1/4 p-2"
      onPress={() => {
        // Navigate to CategoryProducts within CategoriesTab stack
        navigation.navigate('CategoryProducts', {
          categoryId: item._id,
          categoryName: item.name.trim()
        });
      }}
    >
      <View className="bg-gray-50 rounded-lg p-3 items-center border border-gray-100">
        <Image
          source={{ uri: item.image }}
          className="w-16 h-16 rounded-full mb-2"
          resizeMode="cover"
        />
        <Text
          className="text-xs text-center text-gray-800 font-medium"
          numberOfLines={2}
        >
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <Header title={t('all_categories')} showBack={true} />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item, index) => `category-${item._id || index}`}
          numColumns={4}
          contentContainerStyle={{ padding: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#000000']}
              tintColor="#000000"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-10">
              <Text className="text-gray-500">{t('no_categories_found')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default Categories;
