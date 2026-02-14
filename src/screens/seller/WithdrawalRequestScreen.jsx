import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeftIcon, ArrowPathIcon, ChevronLeftIcon } from 'react-native-heroicons/outline';
import { Api, GetApi } from '../../Helper/Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

export default function WithdrawalRequestScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const navigation = useNavigation();
  const { t } = useTranslation();

  const fetchWithdrawals = async () => {
    try {
      const response = await GetApi('getWithdrawreqbyseller');
      console.log('Withdrawals Response:', JSON.stringify(response, null, 2));
      if (response && response.data) {
        console.log('First withdrawal item:', JSON.stringify(response.data[0], null, 2));
        setWithdrawals(response.data);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWithdrawals();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#10B981'; // green-500
      case 'pending':
        return '#F59E0B'; // amber-500
      case 'rejected':
        return '#EF4444'; // red-500
      default:
        return '#6B7280'; // gray-500
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
     <View className="bg-[#0B051D] px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <ChevronLeftIcon size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">{t('withdrawal_requests')}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {withdrawals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('no_withdrawal_requests')}</Text>
          </View>
        ) : (
          withdrawals.map((item, index) => (
            <View key={item._id || index} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.amount}>${parseFloat(item.amount || 0).toFixed(2)}</Text>
                <View 
                  style={[
                    styles.statusBadge, 
                    { backgroundColor: getStatusColor(item.settle || item.status) + '1A' }
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(item.settle || item.status) }]}>
                    {item.settle || item.status || t('pending')}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailsRow}>
                <Text style={styles.detailLabel}>{t('date')}:</Text>
                <Text style={styles.detailValue}>{formatDate(item.createdAt || item.date)}</Text>
              </View>
              
              {item.paymentMethod && (
                <View style={styles.detailsRow}>
                  <Text style={styles.detailLabel}>{t('method')}:</Text>
                  <Text style={styles.detailValue}>{item.paymentMethod}</Text>
                </View>
              )}
              
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>{t('notes')}:</Text>
                <Text style={styles.notesText}>
                  {item.notes || item.note || t('no_notes_provided')}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 66, // Add extra padding at the bottom
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    width: 80,
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  notesLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
});
