import mongoose, { Document, Schema } from "mongoose";

export interface IInventory extends Document {
  product: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;

  // Stock Levels
  currentStock: number;
  reservedStock: number; // Stock reserved for pending orders
  availableStock: number; // currentStock - reservedStock

  // Thresholds
  lowStockThreshold: number;
  reorderLevel: number;

  // Location
  warehouse?: string;
  location?: string;

  // Tracking
  lastRestockedAt?: Date;
  lastSoldAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
      unique: true, // One inventory record per product
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: [true, "Seller is required"],
    },

    // Stock Levels
    currentStock: {
      type: Number,
      required: [true, "Current stock is required"],
      default: 0,
      min: [0, "Current stock cannot be negative"],
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, "Reserved stock cannot be negative"],
    },
    availableStock: {
      type: Number,
      default: 0,
      min: [0, "Available stock cannot be negative"],
    },

    // Thresholds
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [0, "Low stock threshold cannot be negative"],
    },
    reorderLevel: {
      type: Number,
      default: 5,
      min: [0, "Reorder level cannot be negative"],
    },

    // Location
    warehouse: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },

    // Tracking
    lastRestockedAt: {
      type: Date,
    },
    lastSoldAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate available stock before saving
InventorySchema.pre("save", function (next) {
  this.availableStock = Math.max(0, this.currentStock - this.reservedStock);
  next();
});

// Post-save hook for low stock notification
InventorySchema.post("save", async function (doc) {
  if (doc.availableStock <= doc.lowStockThreshold) {
    try {
      // Avoid circular dependency by using dynamic import
      const { sendNotification } = await import("../services/notificationService");
      const Product = mongoose.model("Product");
      const product = await Product.findById(doc.product);

      if (product) {
        await sendNotification(
          "Seller",
          doc.seller.toString(),
          "Stock Alert",
          `Product "${product.productName}" is low on stock (${doc.availableStock} left).`,
          {
            type: "Info",
            idempotencyKey: `low_stock_${doc._id}_${Math.floor(doc.availableStock)}`
          }
        );
      }
    } catch (pushErr: any) {
      // Log error but don't crash
      console.error("Error in low stock notification hook:", pushErr.message);
    }
  }
});

// Indexes for faster queries
// Index already created by unique: true
InventorySchema.index({ seller: 1 });
InventorySchema.index({ currentStock: 1 });

const Inventory = mongoose.models.Inventory || mongoose.model<IInventory>("Inventory", InventorySchema);

export default Inventory;
