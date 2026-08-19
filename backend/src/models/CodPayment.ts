import mongoose, { Document, Schema } from 'mongoose';

export interface ICodPayment extends Document {
  order: mongoose.Types.ObjectId;
  deliveryBoy: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  amount: number;
  collectionMethod: 'CASH' | 'QR_UPI';

  // QR-specific fields
  razorpayQrCodeId?: string;
  razorpayQrImageUrl?: string;
  razorpayPaymentId?: string;

  // Status
  status: 'Pending' | 'Collected' | 'Verified' | 'Failed' | 'Expired';
  collectedAt?: Date;
  verifiedAt?: Date;
  expiresAt?: Date;

  // Remark / notes
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const CodPaymentSchema = new Schema<ICodPayment>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order is required'],
      index: true,
    },
    deliveryBoy: {
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
      required: [true, 'Delivery partner is required'],
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    collectionMethod: {
      type: String,
      enum: ['CASH', 'QR_UPI'],
      required: [true, 'Collection method is required'],
    },
    razorpayQrCodeId: {
      type: String,
      trim: true,
    },
    razorpayQrImageUrl: {
      type: String,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Collected', 'Verified', 'Failed', 'Expired'],
      default: 'Pending',
    },
    collectedAt: {
      type: Date,
    },
    verifiedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound and sparse unique indexes
CodPaymentSchema.index({ order: 1, collectionMethod: 1 });
CodPaymentSchema.index({ deliveryBoy: 1, status: 1 });
CodPaymentSchema.index({ razorpayQrCodeId: 1 }, { unique: true, sparse: true });

const CodPayment = mongoose.models.CodPayment || mongoose.model<ICodPayment>('CodPayment', CodPaymentSchema);

export default CodPayment;
