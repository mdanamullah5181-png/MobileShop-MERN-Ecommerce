"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrands = exports.getRelatedProducts = exports.getTrendingProducts = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProduct = exports.getProducts = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = __importDefault(require("../models/Product"));
const getProducts = async (req, res) => {
    try {
        const { keyword, category, brand, minPrice, maxPrice, sort, page = 1, limit = 12, featured, trending, inStock } = req.query;
        const categoryValue = Array.isArray(category) ? category[0] : category;
        const brandValue = Array.isArray(brand) ? brand[0] : brand;
        const keywordValue = Array.isArray(keyword) ? keyword[0] : keyword;
        const sortValue = Array.isArray(sort) ? sort[0] : sort;
        const match = { isActive: true };
        if (keywordValue)
            match.$text = { $search: keywordValue };
        if (categoryValue)
            match.category = categoryValue;
        if (brandValue)
            match.brand = { $regex: brandValue, $options: 'i' };
        if (inStock === 'true')
            match.stock = { $gt: 0 };
        if (featured === 'true')
            match.isFeatured = true;
        if (trending === 'true')
            match.isTrending = true;
        const parsedMin = minPrice !== undefined && String(minPrice).trim() !== '' ? Number(minPrice) : undefined;
        const parsedMax = maxPrice !== undefined && String(maxPrice).trim() !== '' ? Number(maxPrice) : undefined;
        // Effective price = discountPrice (if >0) else price.
        // This makes price filter/sort match the price users actually see.
        const sortKey = String(sortValue || 'newest');
        const sortMap = {
            price_asc: { effectivePrice: 1 },
            price_desc: { effectivePrice: -1 },
            rating: { ratings: -1 },
            popular: { numReviews: -1 },
            newest: { createdAt: -1 },
        };
        const sortOption = sortMap[sortKey] || { createdAt: -1 };
        const skip = (Number(page) - 1) * Number(limit);
        const pipeline = [
            { $match: match },
            {
                $addFields: {
                    effectivePrice: {
                        $cond: [{ $gt: ['$discountPrice', 0] }, '$discountPrice', '$price'],
                    },
                },
            },
        ];
        if (parsedMin !== undefined || parsedMax !== undefined) {
            const priceMatch = {};
            if (parsedMin !== undefined && !Number.isNaN(parsedMin))
                priceMatch.$gte = parsedMin;
            if (parsedMax !== undefined && !Number.isNaN(parsedMax))
                priceMatch.$lte = parsedMax;
            if (Object.keys(priceMatch).length > 0)
                pipeline.push({ $match: { effectivePrice: priceMatch } });
        }
        pipeline.push({ $sort: sortOption }, {
            $facet: {
                items: [
                    { $skip: skip },
                    { $limit: Number(limit) },
                    {
                        $lookup: {
                            from: 'categories',
                            localField: 'category',
                            foreignField: '_id',
                            as: 'category',
                        },
                    },
                    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            effectivePrice: 0,
                            'category.__v': 0,
                        },
                    },
                ],
                totalCount: [{ $count: 'count' }],
            },
        });
        const agg = await Product_1.default.aggregate(pipeline);
        const products = agg?.[0]?.items || [];
        const total = agg?.[0]?.totalCount?.[0]?.count || 0;
        res.json({
            success: true,
            products,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getProducts = getProducts;
const getProduct = async (req, res) => {
    try {
        const identifier = String(req.params.id);
        const searchConditions = [{ slug: identifier }];
        if (mongoose_1.default.Types.ObjectId.isValid(identifier)) {
            searchConditions.push({ _id: identifier });
        }
        const product = await Product_1.default.findOne({ $or: searchConditions, isActive: true }).populate('category', 'name slug');
        if (!product) {
            res.status(404).json({ success: false, message: 'Product not found' });
            return;
        }
        res.json({ success: true, product });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getProduct = getProduct;
const createProduct = async (req, res) => {
    try {
        const product = await Product_1.default.create(req.body);
        res.status(201).json({ success: true, product });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const product = await Product_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!product) {
            res.status(404).json({ success: false, message: 'Product not found' });
            return;
        }
        res.json({ success: true, product });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        await Product_1.default.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Product deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteProduct = deleteProduct;
const getTrendingProducts = async (_req, res) => {
    try {
        const products = await Product_1.default.find({ isTrending: true, isActive: true }).populate('category', 'name').limit(5);
        res.json({ success: true, products });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTrendingProducts = getTrendingProducts;
const getRelatedProducts = async (req, res) => {
    try {
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            res.status(404).json({ success: false, message: 'Not found' });
            return;
        }
        const related = await Product_1.default.find({ category: product.category, _id: { $ne: product._id }, isActive: true }).limit(8).populate('category', 'name');
        res.json({ success: true, products: related });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getRelatedProducts = getRelatedProducts;
const getBrands = async (_req, res) => {
    try {
        const brands = await Product_1.default.distinct('brand', { isActive: true, brand: { $ne: '' } });
        res.json({ success: true, brands });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getBrands = getBrands;
//# sourceMappingURL=productController.js.map