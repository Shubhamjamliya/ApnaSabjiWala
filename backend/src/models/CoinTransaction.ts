import mongoose, { Document, Schema } from 'mongoose';

export interface ICoinTransaction extends Document {
  customer: mongoose.Types.ObjectId;
  type: 'Earned' | 'Redeemed';
  amount: number;
  description: string;
  orderId?: mongoose.Types.ObjectId;
  rewardOrderId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CoinTransactionSchema = new Schema<ICoinTransaction>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    type: {
      type: String,
      enum: ['Earned', 'Redeemed'],
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    rewardOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'RewardOrder',
    },
  },
  {
    timestamps: true,
  }
);

const CoinTransaction = mongoose.models.CoinTransaction || mongoose.model<ICoinTransaction>('CoinTransaction', CoinTransactionSchema);

export default CoinTransaction;
