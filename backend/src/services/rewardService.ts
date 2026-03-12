import Customer from "../models/Customer";

export const addRewardCoin = async (customerId: string) => {
  try {
    const customer = await Customer.findById(customerId);
    if (customer) {
      if (typeof customer.rewardCoins !== 'number') {
        customer.rewardCoins = 0;
      }
      customer.rewardCoins += 1;
      await customer.save();
      console.log(`Added 1 reward coin to customer ${customerId}. Total: ${customer.rewardCoins}`);
    }
  } catch (error) {
    console.error("Error adding reward coin:", error);
  }
};
