import React from 'react';
import { View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, CommonActions } from '@react-navigation/native-stack';
import { Home, ShoppingBag, Heart, ShoppingCart, User } from 'react-native-feather';
import { useAuth } from '../context/AuthContext';
// import COLORS from '../constants/colors';


import HomeScreen from '../screens/app/Home';
import CategoriesScreen from '../screens/app/Categories';
import FavoritesScreen from '../screens/app/Favorites';
import CartScreen from '../screens/app/Cart';
import AccountScreen from '../screens/app/Account';
import OrdersScreen from '../screens/app/Orders';
import OrderDetails from '../screens/app/OrderDetails';
import ProductDetails from '../screens/app/ProductDetail';
import BillingDetails from '../screens/app/BillingDetails';
import OrderConfirmation from '../screens/app/OrderConfirmation';
import PayPalPayment from '../screens/app/PayPalPayment';
import BestSellingProducts from '../screens/app/BestSellingProducts';
import TopSellingProducts from '../screens/app/TopSellingProducts';
import CategoryProducts from '../screens/app/CategoryProducts';
import FlashSaleDetail from '../screens/app/FlashSaleDetail';
import SearchResultScreen from '../screens/SearchResultScreen';
import HelpCenter from '../screens/app/HelpCenter';
import COLORS from '../constants/colors';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const CategoriesStack = createNativeStackNavigator();
const CartStack = createNativeStackNavigator();
const AccountStack = createNativeStackNavigator();

// Create a stack navigator for the Home tab
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
      <HomeStack.Screen
        name="ProductDetail"
        component={ProductDetails}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <HomeStack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <HomeStack.Screen
        name="BestSellingProducts"
        component={BestSellingProducts}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <HomeStack.Screen
        name="TopSellingProducts"
        component={TopSellingProducts}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <HomeStack.Screen
        name="CategoryProducts"
        component={CategoryProducts}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <HomeStack.Screen
        name="FlashSaleDetail"
        component={FlashSaleDetail}
        options={{
          animation: 'slide_from_right',
          title: 'Flash Sale'
        }}
      />
      <HomeStack.Screen
        name="SearchResult"
        component={SearchResultScreen}
        options={{
          animation: 'slide_from_right',
          title: 'Search Results'
        }}
      />
    </HomeStack.Navigator>
  );
}

// Create a stack navigator for the Categories tab
function CategoriesStackScreen() {
  return (
    <CategoriesStack.Navigator screenOptions={{ headerShown: false }}>
      <CategoriesStack.Screen name="CategoriesScreen" component={CategoriesScreen} />
      <CategoriesStack.Screen
        name="CategoryProducts"
        component={CategoryProducts}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <CategoriesStack.Screen
        name="ProductDetail"
        component={ProductDetails}
        options={{
          animation: 'slide_from_right',
        }}
      />
    </CategoriesStack.Navigator>
  );
}

// Create a stack navigator for the Cart tab
function CartStackScreen() {
  return (
    <CartStack.Navigator screenOptions={{ headerShown: false }}>
      <CartStack.Screen name="CartScreen" component={CartScreen} />
      <CartStack.Screen
        name="BillingDetails"
        component={BillingDetails}
        options={{
          animation: 'slide_from_right',
          title: 'Billing Details',
          headerShown: false,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#1F2937',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <CartStack.Screen
        name="PayPalPayment"
        component={PayPalPayment}
        options={{
          animation: 'slide_from_right',
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <CartStack.Screen
        name="OrderConfirmation"
        component={OrderConfirmation}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </CartStack.Navigator>
  );
}

// Create a stack navigator for the Account tab
function AccountStackScreen() {
  return (
    <AccountStack.Navigator
      initialRouteName="AccountScreen"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <AccountStack.Screen
        name="AccountScreen"
        component={AccountScreen}
        options={{
          headerShown: false,
        }}
      />
      <AccountStack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          headerShown: false,
        }}
      />
      <AccountStack.Screen
        name="OrderDetails"
        component={OrderDetails}
        options={{
          headerShown: false,
        }}
      />
      <AccountStack.Screen
        name="HelpCenter"
        component={HelpCenter}
        options={{
          headerShown: false,
        }}
      />
    </AccountStack.Navigator>
  );
}

const TabNavigator = () => {
  const { cartCount, favoritesCount } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.lightPink,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          minHeight: Platform?.OS === 'android' ? 70 : 95,
          paddingBottom: 8,
          paddingTop: 10,
          paddingHorizontal: 10,
          backgroundColor: COLORS.dark,
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: 'absolute',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home width={size} height={size} fill={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CategoriesTab"
        component={CategoriesStackScreen}
        options={{
          tabBarLabel: 'Categories',
          tabBarIcon: ({ color, size }) => (
            <ShoppingBag width={size} height={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Favorites',
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <Heart width={size} height={size} color={color} />
              {favoritesCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  backgroundColor: '#E58F14',
                  borderRadius: 10,
                  width: 20,
                  height: 20,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}>
                    {favoritesCount > 99 ? '99+' : favoritesCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="CartStack"
        component={CartStackScreen}
        options={{
          tabBarLabel: 'Cart',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <ShoppingCart width={size} height={size} color={color} />
              {cartCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  backgroundColor: '#E58F14',
                  borderRadius: 10,
                  width: 20,
                  height: 20,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountStackScreen}
        options={{
          tabBarLabel: 'Account',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <User width={size} height={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
