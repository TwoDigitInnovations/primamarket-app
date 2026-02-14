import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { GetApi } from '../Helper/Service';
import Header from '../components/Header';
import ProductGridCard from '../components/ProductGridCard';
import { SafeAreaView } from 'react-native-safe-area-context';

const SearchResultScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [searchData, setSearchData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(route.params?.query || '');

  useEffect(() => {
    console.log('Search query changed:', searchQuery);
    if (searchQuery) {
      getProductBySearchCategory(searchQuery);
    } else {
      setSearchData([]);
      setLoading(false);
    }
  }, [searchQuery]);


  useEffect(() => {
    console.log('Route params:', route.params);
    if (route.params?.query !== undefined) {
      setSearchQuery(route.params.query);
    }
  }, [route.params]);

  const getProductBySearchCategory = (query) => {
    if (!query.trim()) {
      setSearchData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    GetApi(`productsearch?key=${encodeURIComponent(query)}&is_verified=true`, null).then(
      (res) => {
        setLoading(false);
        console.log('Search results:', res);
        setSearchData(res?.data || []);
      },
      (error) => {
        setLoading(false);
        console.log('Search error:', error);
        console.log('Error details:', {
          message: error.message,
          response: error.response,
          request: error.request
        });
        setSearchData([]);
      }
    );
  };

  const renderProductItem = ({ item }) => {
    return <ProductGridCard item={item} />;
  };

  return (
    <View style={styles.container}>
      <Header />

      {/* Search Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      ) : searchData.length > 0 ? (
        <FlatList
          data={searchData}
          renderItem={renderProductItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
     contentContainerStyle={[styles.productList, { paddingBottom: 80 }]}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No products found. Try a different search term.
          </Text>
        </View>
      )}
    </View>
  );
};

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / 2 - 16;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  productList: {
    padding: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
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
    backgroundColor: '#1f2937',
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  star: {
    color: '#fbbf24',
    fontSize: 12,
    marginRight: 1,
  },
  soldText: {
    fontSize: 10,
    color: '#9ca3af',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default SearchResultScreen;
