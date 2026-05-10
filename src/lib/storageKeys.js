export const CUSTOMERS_KEY = 'bowling_customers';

export const CHART_HISTORY_PREFIX = 'chart_history_v8_';
export const LEGACY_CHART_HISTORY_PREFIX = 'chart_history_v7_';
export const PRE_V7_CHART_HISTORY_PREFIX = 'chart_history_';

export const chartHistoryKey = (customerId) => `${CHART_HISTORY_PREFIX}${customerId}`;
export const legacyChartHistoryKey = (customerName) => `${LEGACY_CHART_HISTORY_PREFIX}${customerName}`;
export const preV7ChartHistoryKey = (customerName) => `${PRE_V7_CHART_HISTORY_PREFIX}${customerName}`;

export const chartHistoryKeysForCustomer = (customer, extraNames = []) => {
  const keys = [];
  const names = [customer?.name, ...extraNames].filter(Boolean);

  if (customer?.id) keys.push(chartHistoryKey(customer.id));

  for (const name of names) {
    keys.push(legacyChartHistoryKey(name));
    keys.push(preV7ChartHistoryKey(name));
  }

  return [...new Set(keys)];
};
