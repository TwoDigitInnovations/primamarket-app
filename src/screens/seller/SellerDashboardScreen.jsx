import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, CommonActions } from '@react-navigation/native';
import { ArrowRightOnRectangleIcon, ExclamationTriangleIcon, UserGroupIcon } from 'react-native-heroicons/outline';
import { Api } from '../../Helper/Service';
import { AuthContext } from '../../context/AuthContext';
import DashboardCharts from '../../components/DashboardCharts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { GetApi } from '../../Helper/Service';
import { SalesChart, RevenuePieChart, StatsCards } from '../../components/DashboardCharts';

const SellerDashboardScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    recentOrders: [],
    topSellingProducts: [],
    salesData: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      values: [20, 45, 28, 80, 99, 43]
    },
    revenueData: [
      {
        name: 'Products',
        population: 68,
        color: '#1B293D',
        legendFontColor: '#7F7F7F',
        legendFontSize: 13,
      },
      {
        name: 'Services',
        population: 32,
        color: '#FF9D00',
        legendFontColor: '#7F7F7F',
        legendFontSize: 13,
      }
    ]
  });
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  const verifySellerStatus = async () => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('userInfo'));

      if (!userData) {
        setError('User data not found. Please login again.');
        return false;
      }

      // Set user data to state
      setUser({
        ...userData,
        firstName: userData.firstName || userData.name?.split(' ')[0] || 'Seller',
        lastName: userData.lastName || userData.name?.split(' ').slice(1).join(' ') || ''
      });

      if (userData?.role !== 'seller') {
        setError('Access restricted to sellers only');
        return false;
      }

      if (userData.status !== 'Verified') {
        setError('Your seller account is pending verification');
        return false;
      }

      setIsVerified(true);
      return true;
    } catch (error) {
      console.error('Error verifying seller status:', error);
      setError('Error verifying your account status');
      return false;
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const isSellerVerified = await verifySellerStatus();
      if (!isSellerVerified) {
        setLoading(false);
        return;
      }

      // Fetch dashboard stats
      const [statsRes, salesRes] = await Promise.all([
        GetApi('getDashboardStats'),
        GetApi('getSalesStats')
      ]);

      // Extract data from the actual API response format
      const statsData = statsRes?.data || {};
      const salesData = salesRes?.data || {};

      // Extract totals from the stats response
      const totalSales = parseInt(statsData.transactions?.total) || 0;
      const totalOrders = parseInt(statsData.orders?.total) || 0;
      const totalProducts = parseInt(statsData.products?.total) || 0;
      const totalCustomers = parseInt(statsData.users?.total) || 0;

      // Process sales data from the series
      let labels = Array.isArray(salesData.categories) ?
        salesData.categories.map(m => m || '') : [];

      let values = [];
      if (Array.isArray(salesData.series) && salesData.series[0]?.data) {
        values = salesData.series[0].data.map(val => parseInt(val) || 0);
      } else {
        // Fallback to empty array if data structure is unexpected
        values = new Array(labels.length).fill(0);
      }

      // For pie chart, we'll use a simple distribution based on available data
      const productRevenue = Math.round(totalSales * 0.7); // 70% of total sales
      const serviceRevenue = Math.round(totalSales * 0.3); // 30% of total sales

      const pieData = [
        {
          name: t('products'),
          population: productRevenue,
          color: '#1B293D',
          legendFontColor: '#7F7F7F',
          legendFontSize: 13,
        },
        {
          name: t('services'),
          population: serviceRevenue,
          color: '#FF9D00',
          legendFontColor: '#7F7F7F',
          legendFontSize: 13,
        }
      ];

      setStats({
        totalSales: totalSales,
        totalOrders: totalOrders,
        totalProducts: totalProducts,
        totalCustomers: totalCustomers,
        totalRevenue: totalSales, // Using totalSales as revenue since that's what we have
        salesData: {
          labels: labels.length > 0 ? labels : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          values: values.length > 0 ? values : [0, 0, 0, 0, 0, 0]
        },
        revenueData: pieData,
        recentOrders: statsRes?.data?.recentOrders || [],
        topSellingProducts: statsRes?.data?.topProducts || []
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');

      // Fallback to mock data if API fails
      setStats({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalCustomers: 0,
        totalRevenue: 0,
        salesData: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          values: [0, 0, 0, 0, 0, 0]
        },
        revenueData: [
          {
            name: 'Products',
            population: 0,
            color: '#1B293D',
            legendFontColor: '#7F7F7F',
            legendFontSize: 13,
          },
          {
            name: 'Services',
            population: 0,
            color: '#FF9D00',
            legendFontColor: '#7F7F7F',
            legendFontSize: 13,
          }
        ],
        recentOrders: [],
        topSellingProducts: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  useEffect(() => {
    if (isFocused) {
      fetchDashboardData();
    }
  }, [isFocused]);

  const { logout } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      // Call the logout function from AuthContext
      await logout();

      // After logout, navigate to the Login screen
      // Using a small timeout to ensure the state is properly updated
      setTimeout(() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      }, 100);
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback to simple navigation if reset fails
      navigation.dispatch(CommonActions.navigate('Login'));
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#4F46F5" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 p-4 items-center justify-center">
        <View className="bg-white p-6 rounded-lg shadow-sm items-center w-full max-w-md">
          <View className="bg-red-100 p-3 rounded-full mb-4">
            <ExclamationTriangleIcon size={32} color="#EF4444" />
          </View>
          <Text className="text-lg font-semibold text-gray-800 mb-2 text-center">
            {error}
          </Text>
          <Text className="text-gray-600 mb-6 text-center">
            {!isVerified ? 'Please contact support if you believe this is an error.' : ''}
          </Text>
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-blue-600 py-3 px-6 rounded-lg w-full items-center"
          >
            <Text className="text-white font-medium">Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="p-4 bg-[#0B051D] shadow-sm">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-white">{t('dashboard')}</Text>
              <Text className="text-gray-500">
                {user?.firstName
                  ? t('welcome_back_seller', { name: user.firstName })
                  : t('welcome_back_seller', { name: 'Seller' })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Account')}
              className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"
            >
              <UserGroupIcon size={20} color="#4F46F5" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View className="p-4">
          <StatsCards stats={stats} t={t} />

          {/* Sales Chart */}
          <SalesChart data={stats.salesData} t={t} />

          {/* Revenue Pie Chart */}
          <RevenuePieChart data={stats.revenueData} t={t} />
        </View>




      </ScrollView>
    </View>
  );
};

export default SellerDashboardScreen;
