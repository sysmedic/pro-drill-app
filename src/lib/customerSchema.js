export const isLeftHandedCustomer = (customer = {}) => {
  const hand = customer.hand || '';
  return hand.includes('왼') || hand.includes('좌');
};

export const getCustomerHandedness = (customer = {}) => (
  isLeftHandedCustomer(customer) ? 'left' : 'right'
);

export const isThumblessCustomer = (customer = {}) => {
  const hand = customer.hand || '';
  const style = customer.style || '';
  return [hand, style].some((value) => value.includes('덤리스') || value.includes('투핸드'));
};

export const getCustomerChartProfile = (customer = {}) => ({
  handedness: getCustomerHandedness(customer),
  isThumbless: isThumblessCustomer(customer),
});
