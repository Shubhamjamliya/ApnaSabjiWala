import Customer from "../models/Customer";
import Referral from "../models/Referral";
import CoinTransaction from "../models/CoinTransaction";

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

export const fulfillPendingReferral = async (customerId: string) => {
  try {
    const pendingReferral = await Referral.findOne({
      referee: customerId,
      status: "Pending",
    });

    if (!pendingReferral) return;

    const [referee, referrer] = await Promise.all([
      Customer.findById(customerId),
      Customer.findById(pendingReferral.referrer),
    ]);

    if (referee && referrer) {
      referee.rewardCoins = (referee.rewardCoins || 0) + pendingReferral.refereeCoins;
      referrer.rewardCoins = (referrer.rewardCoins || 0) + pendingReferral.referrerCoins;

      pendingReferral.status = "Completed";
      pendingReferral.completedAt = new Date();

      await Promise.all([
        referee.save(),
        referrer.save(),
        pendingReferral.save(),
        CoinTransaction.create({
          customer: referee._id,
          type: "Earned",
          amount: pendingReferral.refereeCoins,
          description: `Referral Welcome Reward on First Order (Code: ${pendingReferral.referralCode})`,
        }),
        CoinTransaction.create({
          customer: referrer._id,
          type: "Earned",
          amount: pendingReferral.referrerCoins,
          description: `Referral Reward for ${referee.name || "friend"}'s First Order`,
        }),
      ]);
      console.log(`Fulfilled referral reward for customer ${customerId}`);
    }
  } catch (error) {
    console.error("Error fulfilling pending referral:", error);
  }
};

