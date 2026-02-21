import mongoose, { Schema, Document } from "mongoose";

export interface IPageConfig extends Document {
  page: string; // e.g., "NEXT_DAY"
  sections: mongoose.Types.ObjectId[]; // Ordered list of HomeSection IDs
}

const PageConfigSchema = new Schema<IPageConfig>(
  {
    page: { type: String, required: true, unique: true },
    sections: [{ type: Schema.Types.ObjectId, ref: "HomeSection" }],
  },
  { timestamps: true }
);

export default mongoose.model<IPageConfig>("PageConfig", PageConfigSchema);
