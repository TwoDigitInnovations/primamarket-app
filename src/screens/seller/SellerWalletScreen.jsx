import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeftIcon, CreditCardIcon, BanknotesIcon, ArrowUpTrayIcon, ListBulletIcon, ArrowDownTrayIcon, XMarkIcon, ChevronLeftIcon } from 'react-native-heroicons/outline';
import { Api, GetApi, Post } from '../../Helper/Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config';

const styles = {};

export default function SellerWalletScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [walletData, setWalletData] = React.useState({
    balance: '0.00',
    pending: '0.00',
    total_earned: '0.00',
    total_withdrawn: '0.00',
    transactions: [],
  });

  const [withdrawModalVisible, setWithdrawModalVisible] = React.useState(false);
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [withdrawDescription, setWithdrawDescription] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchSellerProfile = async () => {
    try {
      const profileResponse = await GetApi('auth/getProfile');
      if (profileResponse && profileResponse.data) {
        return profileResponse.data;
      }
      throw new Error('Failed to fetch profile');
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  };

  const fetchWalletData = async () => {
    try {
      setLoading(true);

      // First fetch seller profile to get seller ID
      const profile = await fetchSellerProfile();
      const sellerId = profile._id;

      console.log('Seller ID:', sellerId); // Debug line

      if (!sellerId) {
        throw new Error('Seller ID not found');
      }

      // Fetch wallet summary and withdrawal requests in parallel
      const [walletRes, withdrawRes] = await Promise.all([
        GetApi(`sellerWalletSummary?sellerId=${sellerId}`),
        GetApi(`getWithdrawreqbyseller?sellerId=${sellerId}`)
      ]);

      // Format transactions from both endpoints
      const creditTransactions = (walletRes?.data?.transactions || []).map(tx => {

        return {
          id: tx._id || Date.now().toString(),
          type: 'credit',
          amount: parseFloat(tx.sellerEarnings || 0).toFixed(2),
          description: tx.description || `Order #${tx.orderId || 'N/A'}`,
          date: tx.createdAt || new Date().toISOString(),
          status: tx.status || 'Completed',
          reference_id: tx.orderId || tx.referenceId || '',
          transaction_type: tx.transactionType || 'order_credit',
          notes: tx.notes || ''
        };
      });

      const debitTransactions = (withdrawRes?.data || []).map(wd => {

        return {
          id: wd._id || `wd-${Date.now()}`,
          type: 'debit',
          amount: parseFloat(wd.amount || 0).toFixed(2),
          description: wd.description || `Withdrawal - ${wd.paymentMethod || 'Bank Transfer'}`,
          date: wd.createdAt || wd.date || new Date().toISOString(),
          status: wd.settle || wd.status || 'Pending',
          reference_id: wd.referenceId || '',
          transaction_type: wd.transactionType || 'withdrawal',
          bank_details: {
            account_number: wd.accountNumber || '',
            bank_name: wd.bankName || '',
            ifsc: wd.ifscCode || ''
          },
          notes: wd.notes || ''
        };
      });

      // Combine and sort all transactions by date (newest first)
      const allTransactions = [...creditTransactions, ...debitTransactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      // Update wallet data
      const formattedData = {
        balance: walletRes?.data?.wallet?.toString() || '0.00',
        pending: walletRes?.data?.pendingAmount?.toString() || '0.00',
        total_earned: walletRes?.data?.totalEarnings?.toString() || '0.00',
        total_withdrawn: walletRes?.data?.totalWithdrawn?.toString() || '0.00',
        transactions: allTransactions
      };

      setWalletData(formattedData);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      Alert.alert('Error', 'Failed to fetch wallet data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchWalletData();
  }, []);

  const handleWithdraw = async () => {
    // Validation
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const numericBalance = parseFloat(walletData.balance.replace(/,/g, ''));
    const numericAmount = parseFloat(withdrawAmount);

    if (numericAmount > numericBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      setIsSubmitting(true);

      // Get seller profile for ID
      const profile = await fetchSellerProfile();
      const sellerId = profile._id;

      if (!sellerId) {
        throw new Error('Seller ID not found');
      }

      // Call the withdrawal API with correct endpoint and format
      const response = await Post('createWithdrawreq', {
        seller_id: sellerId,
        amount: numericAmount,
        paymentMethod: 'bank_transfer',
        notes: withdrawDescription || 'Withdrawal request',
        status: 'pending'
      });

      console.log('Withdrawal response:', response); // Debug line

      if (response && (response.success || response.data || response.status === 'success')) {
        // Refresh wallet data after successful withdrawal request
        await fetchWalletData();

        Alert.alert('Success', 'Withdrawal request submitted successfully');

        // Reset form and close modal
        setWithdrawAmount('');
        setWithdrawDescription('');
        setWithdrawModalVisible(false);
      } else {
        console.log('Response error:', response);
        throw new Error(response?.message || 'Failed to process withdrawal request');
      }

    } catch (error) {
      console.error('Error processing withdrawal:', error);
      Alert.alert('Error', `Failed to process withdrawal: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawButtonPress = () => {
    console.log('Withdraw button pressed - modal state:', withdrawModalVisible);
    setWithdrawModalVisible(true);
    console.log('Modal state set to true');
  };

  const handleViewRequestsPress = () => {
    console.log('View Requests button pressed');
    try {
      navigation.navigate('WithdrawalRequests');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to open withdrawal requests');
    }
  };

  const closeModal = () => {
    console.log('Closing modal');
    setWithdrawModalVisible(false);
    setWithdrawAmount('');
    setWithdrawDescription('');
  };

  React.useEffect(() => {
    fetchWalletData();
  }, []);

  // Debug effect to monitor modal state
  React.useEffect(() => {
    console.log('Modal visibility changed:', withdrawModalVisible);
  }, [withdrawModalVisible]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#4F46F5" />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
       <View className="bg-[#0B051D] px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <ChevronLeftIcon size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">Wallet</Text>
        </View>
      </View>
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text className="text-2xl font-bold text-gray-900 mb-6">{t('my_wallet')}</Text>

        {/* Balance Summary */}
        <View className="space-y-4 mb-6">
          <View className="bg-white rounded-xl p-5 shadow-sm">
            <Text className="text-gray-500 text-sm mb-1">{t('available_balance')}</Text>
            <Text className="text-3xl font-bold text-gray-900">${parseFloat(walletData.balance).toFixed(2)}</Text>

            <View className="mt-4 flex-row justify-between items-center">
              {/* <View>
                <Text className="text-gray-500 text-xs">Total Earned</Text>
                <Text className="text-green-600 font-semibold">${walletData.total_earned}</Text>
              </View> */}
              {/* <View className="h-8 w-px bg-gray-200" /> */}
              {/* <View>
                <Text className="text-gray-500 text-xs">Total Withdrawn</Text>
                <Text className="text-red-600 font-semibold">${walletData.total_withdrawn}</Text>
              </View> */}
            </View>

            <View className="flex-row justify-between mt-4" style={{ gap: 12 }}>
              {/* Withdraw Button - Left side */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 24,
                  paddingVertical: 8,
                  backgroundColor: isSubmitting ? '#9CA3AF' : '#E58F14',
                  borderRadius: 8,
                  minWidth: 120,
                  flex: 1
                }}
                onPress={handleWithdrawButtonPress}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <ArrowUpTrayIcon size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '500', fontSize: 14, marginLeft: 8 }}>
                  {isSubmitting ? t('processing') + '...' : t('withdraw')}
                </Text>
              </TouchableOpacity>

              {/* View Requests Button - Right side */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 24,
                  paddingVertical: 8,
                  backgroundColor: COLORS.mainColor,
                  borderColor: '#C7D2FE',
                  borderWidth: 1,
                  borderRadius: 8,
                  minWidth: 130,
                  flex: 1
                }}
                onPress={handleViewRequestsPress}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Text style={{ color: 'white', fontWeight: '500', fontSize: 14, marginLeft: 8 }}>{t('view_requests')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900">{t('recent_transactions')}</Text>
            <TouchableOpacity>
              <Text className="text-blue-600 text-sm">{t('view_all')}</Text>
            </TouchableOpacity>
          </View>

          {walletData.transactions.length === 0 ? (
            <View className="bg-white rounded-xl p-5 items-center justify-center">
              <Text className="text-gray-500">{t('no_transactions_yet')}</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {walletData.transactions.map((txn) => (
                <View key={txn.id} className="bg-white rounded-xl p-4 border-b border-gray-100">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-row items-start flex-1 pr-2">
                      <View className={`w-10 h-10 rounded-full ${txn.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                        } items-center justify-center mr-3 mt-1 flex-shrink-0`}>
                        {txn.type === 'credit' ? (
                          <ArrowDownTrayIcon size={16} color="#10B981" />
                        ) : (
                          <ArrowUpTrayIcon size={16} color="#EF4444" />
                        )}
                      </View>
                      <View className="flex-1">
                        <View className="flex-row flex-wrap items-center">
                          <View className={`px-2 py-0.5 rounded-full mr-2 ${txn.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                            <Text className={`text-xs font-medium ${txn.type === 'credit' ? 'text-green-800' : 'text-red-800'
                              }`}>
                              {txn.type === 'credit' ? t('credit') : t('debit')}
                            </Text>
                          </View>
                          <Text className="font-medium text-gray-900 flex-1" numberOfLines={1}>
                            {txn.description}
                          </Text>
                        </View>
                        {txn.reference_id && (
                          <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
                            {t('ref')}: {txn.reference_id}
                          </Text>
                        )}
                        <Text className="text-xs text-gray-500 mt-1">
                          {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                        {txn.bank_details && (
                          <View className="mt-1">
                            <Text className="text-xs text-gray-500" numberOfLines={1}>
                              {txn.bank_details.bank_name} ••••{txn.bank_details.account_number?.slice(-4) || ''}
                            </Text>
                          </View>
                        )}
                        {txn.notes && (
                          <Text className="text-xs text-gray-500 mt-1 italic" numberOfLines={2}>
                            {txn.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View className="items-end ml-2 flex-shrink-0">
                      <Text
                        className={`font-semibold text-right ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}
                        numberOfLines={1}
                      >
                        {txn.type === 'credit' ? '+' : '-'}${parseFloat(txn.amount).toLocaleString('en-IN')}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
                        {txn.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={withdrawModalVisible}
        onRequestClose={closeModal}
      >
        <View className="flex-1 justify-center bg-black/50 p-4">
          <View className="bg-white rounded-xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900">{t('common:withdraw_funds')}</Text>
              <TouchableOpacity onPress={closeModal}>
                <XMarkIcon size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">{t('common:amount_usd')}</Text>
              <View className="relative">
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white"
                  placeholder={t('common:enter_amount')}
                  keyboardType="decimal-pad"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                />
                <Text className="absolute right-3 top-3.5 text-gray-500">$</Text>
              </View>
              <Text className="text-xs text-gray-500 mt-1">{t('common:available')}: ${parseFloat(walletData.balance).toFixed(2)}</Text>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-1">{t('common:description_optional')}</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white h-20"
                style={{ textAlignVertical: 'top' }}
                placeholder={t('common:withdrawal_note_placeholder')}
                multiline
                numberOfLines={3}
                value={withdrawDescription}
                onChangeText={setWithdrawDescription}
              />
            </View>

            <View className="flex-row justify-between">
              <TouchableOpacity
                className="flex-1 border border-gray-300 py-3 rounded-lg mr-3"
                onPress={closeModal}
                disabled={isSubmitting}
              >
                <Text className="text-center font-medium text-gray-700">{t('common:cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 bg-[#E58F14] py-3 rounded-lg ${isSubmitting ? 'opacity-70' : ''}`}
                onPress={handleWithdraw}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center font-medium text-white">{t('common:withdraw')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}