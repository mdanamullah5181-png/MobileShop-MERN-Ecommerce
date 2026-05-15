"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const Category_1 = __importDefault(require("../models/Category"));
const Product_1 = __importDefault(require("../models/Product"));
async function main() {
    await mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sayem_ecom_db');
    await Category_1.default.deleteMany({});
    const cats = await Category_1.default.insertMany([
        { name: 'Smartphones' }, { name: 'Feature Phones' }, { name: 'Phone Cases & Covers' },
        { name: 'Chargers & Cables' }, { name: 'Earbuds & Headphones' }, { name: 'Power Banks' },
        { name: 'Smartwatches' }, { name: 'Mobile Accessories' },
    ]);
    await Product_1.default.deleteMany({});
    await Product_1.default.insertMany([
        { name: 'Xiaomi Redmi Note 13 (8/256)', description: '6.67-inch AMOLED display with 120Hz refresh rate and 108MP camera.', shortDescription: 'Best value smartphone for daily use', price: 28999, discountPrice: 26999, category: cats[0]._id, brand: 'Xiaomi', stock: 40, isTrending: true, isFeatured: true, ratings: 4.6, numReviews: 112, tags: ['smartphone', 'xiaomi'], images: [{ url: 'https://placehold.co/500x500?text=Redmi+Note+13', public_id: 'm1' }] },
        { name: 'Nokia 2660 Flip', description: 'Reliable feature phone with long battery life and classic flip design.', shortDescription: 'Simple and dependable feature phone', price: 7499, discountPrice: 6999, category: cats[1]._id, brand: 'Nokia', stock: 65, isTrending: true, ratings: 4.2, numReviews: 39, tags: ['feature-phone', 'nokia'], images: [{ url: 'https://placehold.co/500x500?text=Nokia+2660', public_id: 'm2' }] },
        { name: 'Shockproof Silicone Case - iPhone 13', description: 'Slim anti-drop case with raised edges for camera and screen protection.', price: 790, discountPrice: 650, category: cats[2]._id, brand: 'CasePro', stock: 180, isFeatured: true, ratings: 4.4, numReviews: 57, tags: ['case', 'iphone'], images: [{ url: 'https://placehold.co/500x500?text=iPhone+13+Case', public_id: 'm3' }] },
        { name: '65W Fast Charger + Type-C Cable', description: 'Original quality fast charger combo compatible with Android devices.', shortDescription: 'Charge faster with safe power delivery', price: 1299, discountPrice: 1099, category: cats[3]._id, brand: 'VoltX', stock: 120, isTrending: true, ratings: 4.5, numReviews: 76, tags: ['charger', 'cable', 'type-c'], images: [{ url: 'https://placehold.co/500x500?text=65W+Charger', public_id: 'm4' }] },
        { name: 'TWS Bluetooth Earbuds Pro', description: 'Noise-isolating earbuds with touch controls and up to 24h playback.', shortDescription: 'Crystal clear calls and deep bass', price: 2499, discountPrice: 1999, category: cats[4]._id, brand: 'SoundBeat', stock: 85, isFeatured: true, ratings: 4.3, numReviews: 64, tags: ['earbuds', 'bluetooth'], images: [{ url: 'https://placehold.co/500x500?text=TWS+Earbuds', public_id: 'm5' }] },
        { name: '20000mAh Fast Charging Power Bank', description: 'Dual output power bank with LED indicator and multi-layer protection.', price: 2199, discountPrice: 1899, category: cats[5]._id, brand: 'PowerUp', stock: 95, isTrending: true, ratings: 4.5, numReviews: 88, tags: ['power-bank', 'fast-charging'], images: [{ url: 'https://placehold.co/500x500?text=Power+Bank', public_id: 'm6' }] },
    ]);
    console.log('Seed complete! 8 categories + 6 mobile products created.');
    process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
//# sourceMappingURL=seedData.js.map