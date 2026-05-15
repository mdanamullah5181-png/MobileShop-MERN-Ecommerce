import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { keyword, category, brand, minPrice, maxPrice, sort, page = 1, limit = 12, featured, trending, inStock } = req.query;
    const categoryValue = Array.isArray(category) ? category[0] : category;
    const brandValue = Array.isArray(brand) ? brand[0] : brand;
    const keywordValue = Array.isArray(keyword) ? keyword[0] : keyword;
    const sortValue = Array.isArray(sort) ? sort[0] : sort;
    const minPriceValue = Array.isArray(minPrice) ? minPrice[0] : minPrice;
    const maxPriceValue = Array.isArray(maxPrice) ? maxPrice[0] : maxPrice;

    const match: Record<string, unknown> = { isActive: true };
    if (keywordValue) match.$text = { $search: keywordValue };
    if (categoryValue) {
      match.category = mongoose.Types.ObjectId.isValid(String(categoryValue))
        ? new mongoose.Types.ObjectId(String(categoryValue))
        : categoryValue;
    }
    if (brandValue) match.brand = { $regex: brandValue, $options: 'i' };
    if (inStock === 'true') match.stock = { $gt: 0 };
    if (featured === 'true') match.isFeatured = true;
    if (trending === 'true') match.isTrending = true;

    const parsedMin = minPriceValue !== undefined && String(minPriceValue).trim() !== '' ? Number(minPriceValue) : undefined;
    const parsedMax = maxPriceValue !== undefined && String(maxPriceValue).trim() !== '' ? Number(maxPriceValue) : undefined;

    // Effective price = discountPrice (if >0) else price.
    // This makes price filter/sort match the price users actually see.
    const sortKey = String(sortValue || 'newest');
    const sortMap: Record<string, Record<string, 1 | -1>> = {
      price_asc: { effectivePrice: 1 },
      price_desc: { effectivePrice: -1 },
      rating: { ratings: -1 },
      popular: { numReviews: -1 },
      newest: { createdAt: -1 },
    };
    const sortOption = sortMap[sortKey] || { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const pipeline: mongoose.PipelineStage[] = [
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
      const priceMatch: Record<string, number> = {};
      if (parsedMin !== undefined && !Number.isNaN(parsedMin)) priceMatch.$gte = parsedMin;
      if (parsedMax !== undefined && !Number.isNaN(parsedMax)) priceMatch.$lte = parsedMax;
      if (Object.keys(priceMatch).length > 0) pipeline.push({ $match: { effectivePrice: priceMatch } });
    }

    pipeline.push(
      { $sort: sortOption },
      {
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
      }
    );

    const agg = await Product.aggregate(pipeline);
    const products = agg?.[0]?.items || [];
    const total = agg?.[0]?.totalCount?.[0]?.count || 0;

    res.json({
      success: true,
      products,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const identifier = String(req.params.id);
    const searchConditions: Record<string, unknown>[] = [{ slug: identifier }];
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      searchConditions.push({ _id: identifier });
    }
    const product = await Product.findOne({ $or: searchConditions, isActive: true }).populate('category', 'name slug');
    if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }
    res.json({ success: true, product });
  } catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try { const product = await Product.create(req.body); res.status(201).json({ success: true, product }); }
  catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }
    res.json({ success: true, product });
  } catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};

export const getTrendingProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({ isTrending: true, isActive: true }).populate('category', 'name').limit(5);
    res.json({ success: true, products });
  } catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};

export const getRelatedProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    const related = await Product.find({ category: product.category, _id: { $ne: product._id }, isActive: true }).limit(8).populate('category', 'name');
    res.json({ success: true, products: related });
  } catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};

export const getBrands = async (_req: Request, res: Response): Promise<void> => {
  try { const brands = await Product.distinct('brand', { isActive: true, brand: { $ne: '' } }); res.json({ success: true, brands }); }
  catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};
