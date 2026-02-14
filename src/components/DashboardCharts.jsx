import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { COLORS } from '../config';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#ffa726',
  },
};

export const SalesChart = ({ data, t }) => {
  // Ensure we have valid labels and data
  const defaultLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const defaultData = [0, 0, 0, 0, 0, 0];

  // Use provided data or fallback to defaults
  const chartData = {
    labels: data?.labels && data.labels.length > 0 ? data.labels : defaultLabels,
    datasets: [
      {
        data: data?.values && data.values.length > 0 ? data.values : defaultData,
        color: (opacity = 1) => `rgba(79, 70, 249, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Log the data being passed to the chart for debugging
  console.log('Chart data:', JSON.stringify(chartData, null, 2));

  return (
    <View style={{
      marginVertical: 8,
      padding: 16,
      backgroundColor: 'white',
      borderRadius: 8,
      alignItems: 'center',
      width: '100%',
    }}>
      <Text style={{
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        alignSelf: 'flex-start',
        paddingLeft: 8,
      }}>
        {t('sales_overview')}
      </Text>
      <View style={{ width: '100%', overflow: 'hidden' }}>
        <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            ...chartConfig,
            formatXLabel: (value) => {

              if (typeof value === 'number' && value >= 0 && value <= 11) {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return months[value];
              }

              if (typeof value === 'string') {
                return value.length > 3 ? value.substring(0, 3) : value;
              }
              return value || '';
            },
          }}
          bezier
          fromZero
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withShadow={false}
          withDots={true}
          withVerticalLabels={true}  // ye false se true karo
          withHorizontalLabels={true}
          segments={5}
          xLabelsOffset={-5}
          yLabelsOffset={10}
          verticalLabelRotation={0}
          horizontalLabelRotation={0}
          style={{
            marginVertical: 8,
            borderRadius: 16,
            paddingRight: 0,
            marginLeft: -10,
          }}
        />
      </View>
    </View>
  );
};

export const RevenuePieChart = ({ data, t }) => {
  return (
    <View style={{ marginVertical: 8, padding: 16, backgroundColor: 'white', borderRadius: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
        {t('revenue_distribution')}
      </Text>
      <PieChart
        data={data || [
          {
            name: 'Products',
            population: 68,
            color: '#4F46F5',
            legendFontColor: '#7F7F7F',
            legendFontSize: 13,
          },
          {
            name: 'Services',
            population: 32,
            color: '#10B981',
            legendFontColor: '#7F7F7F',
            legendFontSize: 13,
          },
        ]}
        width={screenWidth - 32}
        height={200}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
    </View>
  );
};

export const StatsCards = ({ stats, t }) => {
  const statItems = [
    { label: t('total_sales'), value: stats?.totalSales || '0', color: COLORS.mainColor },
    { label: t('total_orders'), value: stats?.totalOrders || '0', color: '#10B981' },
    { label: t('total_revenue'), value: `$${stats?.totalRevenue || '0'}`, color: '#F59E0B' },
  ];

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
      {statItems.map((item, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            backgroundColor: 'white',
            borderRadius: 8,
            padding: 16,
            marginHorizontal: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 14, color: '#6B7280' }}>{item.label}</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: item.color, marginTop: 4 }}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
};
