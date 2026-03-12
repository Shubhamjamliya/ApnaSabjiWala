import mongoose, { Document, Schema } from 'mongoose';

export interface IRewardOrder extends Document {
  customer: mongoose.Types.ObjectId;
  rewardItem: mongoose.Types.ObjectId;
  coinsSpent: number;
  status: 'Pending' | 'Fulfilled' | 'Cancelled';
  orderDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RewardOrderSchema = new Schema<IRewardOrder>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    rewardItem: {
      type: Schema.Types.ObjectId,
      ref: 'RewardItem',
      required: [true, 'Reward item is required'],
    },
    coinsSpent: {
      type: Number,
      required: [true, 'Coins spent is required'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Fulfilled', 'Cancelled'],
      default: 'Pending',
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const RewardOrder = mongoose.models.RewardOrder || mongoose.model<IRewardOrder>('RewardOrder', RewardOrderSchema);

export default RewardOrder;
