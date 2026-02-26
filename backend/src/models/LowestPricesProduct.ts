import mongoose, { Schema, Document } from "mongoose";

export interface ILowestPricesProduct extends Document {
    product: mongoose.Types.ObjectId;
    headerCategoryId?: mongoose.Types.ObjectId;
    order: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const LowestPricesProductSchema = new Schema<ILowestPricesProduct>(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: [true, "Product is required"],
        },
        headerCategoryId: {
            type: Schema.Types.ObjectId,
            ref: "HeaderCategory",
            required: false,
        },
        order: {
            type: Number,
            required: [true, "Display order is required"],
            default: 0,
            min: [0, "Order cannot be negative"],
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

// Indexes for better query performance
LowestPricesProductSchema.index({ order: 1, isActive: 1 });
LowestPricesProductSchema.index({ isActive: 1 });
// Prevent duplicate products within the same header category
LowestPricesProductSchema.index({ product: 1, headerCategoryId: 1 }, { unique: true });

const LowestPricesProduct = mongoose.model<ILowestPricesProduct>("LowestPricesProduct", LowestPricesProductSchema);

export default LowestPricesProduct;

