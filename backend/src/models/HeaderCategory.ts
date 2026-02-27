import mongoose, { Schema, Document } from 'mongoose';

export interface IHeaderCategory extends Document {
    name: string;
    image?: string; // Cloudinary URL for the logo
    iconLibrary?: string;
    iconName?: string;
    slug: string;
    theme?: string; // Theme key for colors
    relatedCategory?: string; // Links to a product category
    order: number;
    status: 'Published' | 'Unpublished';
    createdAt: Date;
    updatedAt: Date;
}

const HeaderCategorySchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        image: { type: String, required: false }, // Cloudinary URL
        iconLibrary: { type: String, required: false },
        iconName: { type: String, required: false },
        slug: { type: String, required: true, unique: true },
        theme: { type: String, required: false },
        relatedCategory: { type: String, required: false },
        order: { type: Number, default: 0 },
        status: { type: String, enum: ['Published', 'Unpublished'], default: 'Published' },
    },
    { timestamps: true }
);

export default mongoose.model<IHeaderCategory>('HeaderCategory', HeaderCategorySchema);
