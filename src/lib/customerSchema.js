const isObjectRecord = (value) => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
);

const normalizeText = (value) => (typeof value === 'string' ? value : '');

const optionalCustomerTextFields = ['phone', 'gender', 'hand', 'style', 'createdAt'];

export const normalizeCustomer = (customer) => {
  if (!isObjectRecord(customer)) return null;

  const id = typeof customer.id === 'string' ? customer.id.trim() : '';
  const name = typeof customer.name === 'string' ? customer.name.trim() : '';
  if (!id || !name) return null;

  const normalized = { ...customer, id, name };

  for (const field of optionalCustomerTextFields) {
    if (customer[field] !== undefined) normalized[field] = normalizeText(customer[field]);
  }

  return normalized;
};

export const normalizeCustomers = (customers) => (
  Array.isArray(customers)
    ? customers.map(normalizeCustomer).filter(Boolean)
    : []
);

export const isLeftHandedCustomer = (customer = {}) => {
  const hand = normalizeText(customer.hand);
  return hand.includes('왼') || hand.includes('좌');
};

export const getCustomerHandedness = (customer = {}) => (
  isLeftHandedCustomer(customer) ? 'left' : 'right'
);

export const isThumblessCustomer = (customer = {}) => {
  const hand = normalizeText(customer.hand);
  const style = normalizeText(customer.style);
  return [hand, style].some((value) => value.includes('덤리스') || value.includes('투핸드'));
};

export const getCustomerChartProfile = (customer = {}) => ({
  handedness: getCustomerHandedness(customer),
  isThumbless: isThumblessCustomer(customer),
});
