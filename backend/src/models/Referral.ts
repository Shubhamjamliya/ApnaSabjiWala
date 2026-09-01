import mongoose, { Document, Schema } from 'mongoose';

export interface IReferral extends Document {
  referrer: mongoose.Types.ObjectId;
  referee: mongoose.Types.ObjectId;
  referralCode: string;
  referrerCoins: number;
  refereeCoins: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  rewardTrigger: 'signup' | 'first_order_delivered';
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Referrer is required'],
    },
    referee: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Referee is required'],
      unique: true, // Each new user can only be referred once
    },
    referralCode: {
      type: String,
      required: [true, 'Referral code is required'],
      trim: true,
      uppercase: true,
    },
    referrerCoins: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    refereeCoins: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Cancelled'],
      default: 'Completed',
    },
    rewardTrigger: {
      type: String,
      enum: ['signup', 'first_order_delivered'],
      default: 'signup',
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ReferralSchema.index({ referrer: 1 });
ReferralSchema.index({ referee: 1 });
ReferralSchema.index({ referralCode: 1 });

const Referral = mongoose.models.Referral || mongoose.model<IReferral>('Referral', ReferralSchema);

export default Referral;
