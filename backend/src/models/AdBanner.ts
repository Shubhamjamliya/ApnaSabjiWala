import mongoose, { Document, Schema } from "mongoose";

export interface IAdBanner extends Document {
  imageUrl: string;
  linkUrl: string;
  title?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const AdBannerSchema = new Schema<IAdBanner>(
  {
    imageUrl: {
      type: String,
      required: [true, "Banner image is required"],
      trim: true,
      maxlength: [2048, "Banner image URL is too long"],
    },
    linkUrl: {
      type: String,
      required: [true, "Banner link is required"],
      trim: true,
      maxlength: [2048, "Banner link is too long"],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [120, "Banner title is too long"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
      min: [0, "Banner order cannot be negative"],
    },
  },
  { timestamps: true }
);

AdBannerSchema.index({ isActive: 1, order: 1, createdAt: 1 });

export default mongoose.models.AdBanner ||
  mongoose.model<IAdBanner>("AdBanner", AdBannerSchema);
