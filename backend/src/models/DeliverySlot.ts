import mongoose, { Document, Schema } from "mongoose";

export interface IDeliverySlot extends Document {
  date: Date; // The specific date for this slot (e.g., 2023-10-27)
  startTime: string; // "07:00 AM"
  endTime: string; // "09:00 AM"
  maxCapacity: number;
  bookedCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySlotSchema = new Schema<IDeliverySlot>(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    maxCapacity: {
      type: Number,
      required: true,
      default: 20,
    },
    bookedCount: {
      type: Number,
      required: true,
      default: 0,
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

// Compound index to ensure unique slots per day
DeliverySlotSchema.index({ date: 1, startTime: 1, endTime: 1 }, { unique: true });

const DeliverySlot = mongoose.models.DeliverySlot || mongoose.model<IDeliverySlot>("DeliverySlot", DeliverySlotSchema);

export default DeliverySlot;
