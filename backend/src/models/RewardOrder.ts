import mongoose, { Document, Schema } from 'mongoose';

export interface IRewardOrder extends Document {
  customer: mongoose.Types.ObjectId;
  rewardItem: mongoose.Types.ObjectId;
  coinsSpent: number;
  deliveryAddress?: {
    fullName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
  };
  status: 'Pending' | 'Approved' | 'Delivered' | 'Cancelled';
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
    deliveryAddress: {
      fullName: { type: String, trim: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      landmark: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Delivered', 'Cancelled'],
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
