import mongoose, { Document, Schema } from 'mongoose';

export interface IRewardItem extends Document {
  name: string;
  description: string;
  coinsRequired: number;
  imageUrl?: string;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RewardItemSchema = new Schema<IRewardItem>(
  {
    name: {
      type: String,
      required: [true, 'Reward item name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    coinsRequired: {
      type: Number,
      required: [true, 'Coins required is required'],
      min: [1, 'Coins required must be at least 1'],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
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

const RewardItem = mongoose.models.RewardItem || mongoose.model<IRewardItem>('RewardItem', RewardItemSchema);

export default RewardItem;
