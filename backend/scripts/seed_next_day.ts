import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../src/models/Product";
import DeliverySlot from "../src/models/DeliverySlot";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const seedNextDay = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB");

    // 1. Create Slots for Tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const timeSlots = [
      { startTime: "06:00 AM", endTime: "08:00 AM" },
      { startTime: "08:00 AM", endTime: "10:00 AM" },
      { startTime: "10:00 AM", endTime: "12:00 PM" },
    ];

    // Clear existing slots for tomorrow to avoid dupes
    const nextDay = new Date(tomorrow);
    nextDay.setDate(tomorrow.getDate() + 1);
    await DeliverySlot.deleteMany({ date: { $gte: tomorrow, $lt: nextDay } });

    const slots = timeSlots.map(ts => ({
      date: tomorrow,
      startTime: ts.startTime,
      endTime: ts.endTime,
      maxCapacity: 20,
      bookedCount: 0,
      isActive: true
    }));

    await DeliverySlot.insertMany(slots);
    console.log(`Created ${slots.length} delivery slots for ${tomorrow.toDateString()}`);

    // 2. Enable Next Day for Random Products
    // Reset all first
    await Product.updateMany({}, { "nextDay.enabled": false });

    const products = await Product.find({ status: "Active", publish: true }).limit(10);

    if (products.length === 0) {
      console.log("No active products found to enable.");
    } else {
      const updates = products.map(p => {
        return Product.findByIdAndUpdate(p._id, {
          nextDay: {
            enabled: true,
            price: Math.floor(p.price * 0.9), // 10% cheaper for next day
            stock: 50
          }
        });
      });
      await Promise.all(updates);
      console.log(`Enabled Next Day for ${products.length} products.`);
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedNextDay();
