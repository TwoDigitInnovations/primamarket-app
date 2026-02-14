import React from 'react';
import { View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, ShoppingBag, CreditCard, Box, Plus } from 'react-native-feather';

// Import seller screens
import SellerDashboardScreen from '../screens/seller/SellerDashboardScreen';
import SellerOrdersScreen from '../screens/seller/SellerOrdersScreen';
import SellerWalletScreen from '../screens/seller/SellerWalletScreen';
import AddProductScreen from '../screens/seller/AddProductScreen';
import AccountScreen from '../screens/app/Account';

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const OrdersStack = createNativeStackNavigator();
const WalletStack = createNativeStackNavigator();
const ProductsStack = createNativeStackNavigator();
const InventoryStack = createNativeStackNavigator();

// Inventory Stack
function InventoryStackScreen() {
  return (
    <InventoryStack.Navigator screenOptions={{ headerShown: false }}>
      <InventoryStack.Screen name="AddProduct" component={AddProductScreen} />
    </InventoryStack.Navigator>
  );
}

// Dashboard Stack
function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="SellerDashboard" component={SellerDashboardScreen} />
      <DashboardStack.Screen name="AddProduct" component={AddProductScreen} />
      <DashboardStack.Screen name="SellerProductDetail" component={SellerProductDetailScreen} />
      <DashboardStack.Screen name="Account" component={AccountScreen} />
      {/* Add more dashboard related screens here */}
    </DashboardStack.Navigator>
  );
}

// Orders Stack
function OrdersStackScreen() {
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen name="SellerOrders" component={SellerOrdersScreen} />
      <OrdersStack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <OrdersStack.Screen name="AddProduct" component={AddProductScreen} />
      {/* Add more orders related screens here */}
    </OrdersStack.Navigator>
  );
}

// Import remaining screens
import OrderDetailsScreen from '../screens/seller/OrderDetailsScreen';
import WithdrawalRequestScreen from '../screens/seller/WithdrawalRequestScreen';
import ProductScreen from '../screens/seller/ProductScreen';
import SellerProductDetailScreen from '../screens/seller/SellerProductDetailScreen';
import { COLORS } from '../config';

// Wallet Stack
function WalletStackScreen() {
  return (
    <WalletStack.Navigator screenOptions={{ headerShown: false }}>
      <WalletStack.Screen name="SellerWallet" component={SellerWalletScreen} />
      <WalletStack.Screen name="WithdrawalRequests" component={WithdrawalRequestScreen} />
      {/* Add more wallet related screens here */}
    </WalletStack.Navigator>
  );
}

// Products Stack
function ProductsStackScreen() {
  return (
    <ProductsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductsStack.Screen name="ProductsList" component={ProductScreen} />
      <ProductsStack.Screen name="SellerProductDetail" component={SellerProductDetailScreen} />
      <ProductsStack.Screen name="AddProduct" component={AddProductScreen} />
    </ProductsStack.Navigator>
  );
}

const SellerTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E58F14',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          minHeight: Platform?.OS === 'android' ? 70 : 95,
          paddingBottom: 8,
          paddingTop: 10,
          paddingHorizontal: 10,
          backgroundColor: COLORS.mainColor,
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
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStackScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Home width={size} height={size} color={color} fill="none" />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersStackScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <ShoppingBag width={size} height={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletStackScreen}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <CreditCard width={size} height={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProductsStack"
        component={ProductsStackScreen}
        options={{
          tabBarLabel: 'Products',
          tabBarIcon: ({ color, size }) => (
            <Box width={size} height={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryStackScreen}
        options={{
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color, size }) => (
            <Plus width={size} height={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default SellerTabNavigator;
