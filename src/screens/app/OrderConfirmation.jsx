import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const OrderConfirmation = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { orderId, paymentMethod } = route.params || {};

  useEffect(() => {
    // Auto-navigate to Home after 4 seconds
    const timer = setTimeout(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'HomeTab' }],
        })
      );
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Success Animation */}
      <View style={styles.successCircle}>
        <Text style={styles.checkmark}>✓</Text>
      </View>

      {/* Success Message */}
      <Text style={styles.title}>{t('order_placed_successfully')}</Text>
      <Text style={styles.subtitle}>{t('thank_you_for_order')}</Text>

      {/* Order Details Card */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('order_id')}</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {orderId || 'N/A'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('payment_method')}</Text>
          <Text style={styles.detailValue}>{paymentMethod || 'Online'}</Text>
        </View>
      </View>

      {/* Info Text */}
      <Text style={styles.infoText}>
        {t('order_confirmation_sent')}
      </Text>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Orders')}
      >
        <Text style={styles.primaryButtonText}>{t('view_orders')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'HomeTab' }],
            })
          );
        }}
      >
        <Text style={styles.secondaryButtonText}>{t('continue_shopping')}</Text>
      </TouchableOpacity>

      {/* Auto-redirect message */}
      <Text style={styles.autoRedirectText}>
        {t('redirecting_home_in_4_seconds')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkmark: {
    fontSize: 60,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e293b',
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
  autoRedirectText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default OrderConfirmation;
