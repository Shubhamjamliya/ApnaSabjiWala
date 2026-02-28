import mongoose, { Document, Schema } from "mongoose";

export interface INextDayOrderItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  image: string;
  price: number;
  quantity: number;
  unit: string;
  pack: string;
  seller: mongoose.Types.ObjectId;
}

export interface INextDayOrder extends Document {
  orderNumber: string;
  customer: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  address: {
    address: string;
    city: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  slot: mongoose.Types.ObjectId;
  deliveryDate: Date;
  timeRange: string;
  items: INextDayOrderItem[];
  subtotal: number;
  total: number;
  status: "Pending" | "Confirmed" | "OutForDelivery" | "Delivered" | "Cancelled";
  paymentMethod: string;
  paymentStatus: "Pending" | "Paid" | "Failed";
  sellers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const NextDayOrderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String },
  pack: { type: String },
  seller: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
});

const NextDayOrderSchema = new Schema<INextDayOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    address: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
      latitude: Number,
      longitude: Number,
    },
    slot: { type: Schema.Types.ObjectId, ref: "DeliverySlot", required: true },
    deliveryDate: { type: Date, required: true },
    timeRange: { type: String, required: true },
    items: [NextDayOrderItemSchema],
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "OutForDelivery", "Delivered", "Cancelled"],
      default: "Pending",
    },
    paymentMethod: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    sellers: [{ type: Schema.Types.ObjectId, ref: "Seller" }],
  },
  { timestamps: true }
);

NextDayOrderSchema.index({ customer: 1 });
NextDayOrderSchema.index({ sellers: 1 });
NextDayOrderSchema.index({ deliveryDate: 1 });
NextDayOrderSchema.index({ status: 1 });

const NextDayOrder = mongoose.models.NextDayOrder || mongoose.model<INextDayOrder>("NextDayOrder", NextDayOrderSchema);

export default NextDayOrder;
