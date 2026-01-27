import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: Array, required: true },
        price: { type: Number, required: true },
        // Stored in DB as `offerprice` but exposed/accepted as `offerPrice`
        // NOTE: `alias` is implemented as a virtual; enable virtuals in toJSON/toObject.
        offerprice: { type: Number, required: true, alias: 'offerPrice' },
        image: { type: Array, required: true },
        category: { type: String, required: true },
        inStock: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

const Product = mongoose.models.product || mongoose.model('product', productSchema);

export default Product;