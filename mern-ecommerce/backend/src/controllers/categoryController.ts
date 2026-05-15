import { Request, Response } from 'express';
import Category from '../models/Category';

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try { const categories = await Category.find({ isActive: true }).populate('parent', 'name slug').sort({ order: 1, name: 1 }); res.json({ success: true, categories }); }
  catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};
export const getCategory = async (req: Request, res: Response): Promise<void> => {
  try { const cat = await Category.findOne({ $or: [{ _id: req.params.id }, { slug: req.params.id }] }); if (!cat) { res.status(404).json({ success: false, message: 'Not found' }); return; } res.json({ success: true, category: cat }); }
  catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = {
      ...req.body,
      parent: req.body.parent ? req.body.parent : null,
      discount: req.body.discount === '' || req.body.discount === undefined || req.body.discount === null ? 0 : Number(req.body.discount),
    };
    const cat = await Category.create(payload);
    res.status(201).json({ success: true, category: cat });
  }
  catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = {
      ...req.body,
      parent: req.body.parent ? req.body.parent : null,
      discount: req.body.discount === '' || req.body.discount === undefined || req.body.discount === null ? 0 : Number(req.body.discount),
    };
    const cat = await Category.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.json({ success: true, category: cat });
  }
  catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try { await Category.findByIdAndUpdate(req.params.id, { isActive: false }); res.json({ success: true, message: 'Deleted' }); }
  catch (error) { res.status(500).json({ success: false, message: (error as Error).message }); }
};
