import mongoose, { Document, Schema } from 'mongoose';

export interface IRewardRule extends Document {
  minAmount: number;
  maxAmount: number;
  coins: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RewardRuleSchema = new Schema<IRewardRule>(
  {
    minAmount: {
      type: Number,
      required: [true, 'Minimum amount is required'],
      min: [0, 'Minimum amount cannot be negative'],
    },
    maxAmount: {
      type: Number,
      required: [true, 'Maximum amount is required'],
      min: [0, 'Maximum amount cannot be negative'],
    },
    coins: {
      type: Number,
      required: [true, 'Coins are required'],
      min: [1, 'Coins must be at least 1'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const RewardRule = mongoose.models.RewardRule || mongoose.model<IRewardRule>('RewardRule', RewardRuleSchema);

export default RewardRule;
