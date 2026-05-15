"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.cancelOrder = exports.updateOrderStatus = exports.getAllOrders = exports.getOrder = exports.getMyOrders = exports.createOrder = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const Discount_1 = __importDefault(require("../models/Discount"));
const email_1 = require("../utils/email");
const createOrder = async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod, couponCode, note } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ success: false, message: 'No order items provided' });
            return;
        }
        let itemsPrice = 0;
        let isPreOrder = false;
        const orderItems = [];
        for (const item of items) {
            if (!item.quantity || Number(item.quantity) < 1) {
                res.status(400).json({ success: false, message: 'Invalid item quantity' });
                return;
            }
            const product = await Product_1.default.findById(item.product);
            if (!product) {
                res.status(404).json({ success: false, message: `Product not found` });
                return;
            }
            const price = product.discountPrice > 0 ? product.discountPrice : product.price;
            const hasSufficientStock = product.stock >= item.quantity;
            // Only allow pre-order if the product is marked as pre-orderable.
            const itemIsPreOrder = Boolean(product.isPreOrder) && !hasSufficientStock;
            // If product is NOT pre-orderable, block order when stock is insufficient.
            if (!itemIsPreOrder && !hasSufficientStock) {
                res.status(400).json({
                    success: false,
                    message: `This item is not available for pre-order, so your order cannot be placed right now. ` +
                        `Product: "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}. ` +
                        `Please reduce quantity or wait until stock is updated.`,
                });
                return;
            }
            if (itemIsPreOrder)
                isPreOrder = true;
            orderItems.push({ product: product._id, name: product.name, image: product.images[0]?.url || '', price, quantity: item.quantity, size: item.size, color: item.color, isPreOrder: itemIsPreOrder });
            itemsPrice += price * item.quantity;
            if (!itemIsPreOrder) {
                const updated = await Product_1.default.findOneAndUpdate({ _id: product._id, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { new: true });
                if (!updated) {
                    res.status(400).json({
                        success: false,
                        message: `Stock changed while placing the order for "${product.name}". ` +
                            `Please try again or reduce quantity.`,
                    });
                    return;
                }
            }
        }
        const shippingPrice = itemsPrice >= 1000 ? 0 : 80;
        let discountAmount = 0;
        if (couponCode) {
            const discount = await Discount_1.default.findOne({ code: couponCode.toUpperCase(), isActive: true });
            if (discount && discount.endDate > new Date()) {
                if (discount.type === 'percentage')
                    discountAmount = Math.min((itemsPrice * discount.value) / 100, discount.maxDiscountAmount || Infinity);
                else
                    discountAmount = discount.value;
                await Discount_1.default.findByIdAndUpdate(discount._id, { $inc: { usageCount: 1 } });
            }
        }
        const totalPrice = itemsPrice + shippingPrice - discountAmount;
        const order = await Order_1.default.create({ user: req.user._id, items: orderItems, shippingAddress, paymentMethod, paymentStatus: 'pending', itemsPrice, discountAmount, shippingPrice, taxPrice: 0, totalPrice, couponCode, note, isPreOrder, statusHistory: [{ status: 'pending', note: 'Order placed' }] });
        try {
            const { subject, html } = email_1.emailTemplates.orderSubmitted(req.user.name, order);
            await (0, email_1.sendEmail)({ to: req.user.email, subject, html });
        }
        catch (e) {
            console.error('Email error:', e);
        }
        const populated = await Order_1.default.findById(order._id).populate('user', 'name email');
        res.status(201).json({ success: true, order: populated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createOrder = createOrder;
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order_1.default.find({ user: req.user._id }).populate('items.product', 'name images').sort({ createdAt: -1 });
        res.json({ success: true, orders });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyOrders = getMyOrders;
const getOrder = async (req, res) => {
    try {
        const order = await Order_1.default.findById(req.params.id).populate('user', 'name email phone').populate('items.product', 'name images');
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            res.status(403).json({ success: false, message: 'Not authorized' });
            return;
        }
        res.json({ success: true, order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getOrder = getOrder;
const getAllOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search } = req.query;
        const query = {};
        if (status)
            query.orderStatus = status;
        if (search)
            query.orderNumber = { $regex: search, $options: 'i' };
        const total = await Order_1.default.countDocuments(query);
        const orders = await Order_1.default.find(query).populate('user', 'name email').sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
        res.json({ success: true, orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllOrders = getAllOrders;
const updateOrderStatus = async (req, res) => {
    try {
        const { status, note, trackingNumber } = req.body;
        const order = await Order_1.default.findById(req.params.id).populate('user', 'name email');
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        if (['shipped', 'delivered'].includes(status)) {
            const preorderItems = order.items.filter(item => item.isPreOrder);
            for (const item of preorderItems) {
                const product = await Product_1.default.findById(item.product);
                if (!product || product.stock < item.quantity) {
                    const availableStock = product?.stock ?? 0;
                    res.status(400).json({
                        success: false,
                        message: `Cannot mark this order as "${status}". Stock is not available for pre-order item "${item.name}". ` +
                            `Required: ${item.quantity}, Available: ${availableStock}. ` +
                            `Please update the product stock and try again.`,
                    });
                    return;
                }
            }
            // Reserve stock for pre-order items once shipment/delivery starts.
            for (const item of preorderItems) {
                const updated = await Product_1.default.findOneAndUpdate({ _id: item.product, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { new: true });
                if (!updated) {
                    res.status(400).json({
                        success: false,
                        message: `${item.name} stock is insufficient for shipment.`,
                    });
                    return;
                }
                item.isPreOrder = false;
            }
            order.isPreOrder = order.items.some(item => item.isPreOrder);
        }
        order.orderStatus = status;
        order.statusHistory.push({ status, note: note || `Status updated to ${status}`, updatedAt: new Date() });
        if (status === 'delivered')
            order.deliveredAt = new Date();
        if (status === 'cancelled') {
            order.cancelledAt = new Date();
            order.cancelReason = note;
            for (const item of order.items) {
                if (!item.isPreOrder)
                    await Product_1.default.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
            }
        }
        await order.save();
        try {
            const user = order.user;
            if (status === 'pending') {
                const { subject, html } = email_1.emailTemplates.orderSubmitted(user.name, order);
                await (0, email_1.sendEmail)({ to: user.email, subject, html });
            }
            else if (status === 'confirmed') {
                const { subject, html } = email_1.emailTemplates.orderConfirmed(user.name, order);
                await (0, email_1.sendEmail)({ to: user.email, subject, html });
            }
            else if (status === 'processing') {
                const { subject, html } = email_1.emailTemplates.orderApproved(user.name, order);
                await (0, email_1.sendEmail)({ to: user.email, subject, html });
            }
            else if (status === 'shipped') {
                const { subject, html } = email_1.emailTemplates.orderShipped(user.name, order, trackingNumber);
                await (0, email_1.sendEmail)({ to: user.email, subject, html });
            }
            else if (status === 'delivered') {
                const { subject, html } = email_1.emailTemplates.orderDelivered(user.name, order);
                await (0, email_1.sendEmail)({ to: user.email, subject, html });
            }
            else if (status === 'cancelled') {
                const { subject, html } = email_1.emailTemplates.orderCancelled(user.name, order, note);
                await (0, email_1.sendEmail)({ to: user.email, subject, html });
            }
        }
        catch (e) {
            console.error('Email error:', e);
        }
        res.json({ success: true, order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const cancelOrder = async (req, res) => {
    try {
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        if (order.user.toString() !== req.user._id.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized' });
            return;
        }
        if (!['pending', 'confirmed'].includes(order.orderStatus)) {
            res.status(400).json({ success: false, message: 'Cannot cancel this order' });
            return;
        }
        order.orderStatus = 'cancelled';
        order.cancelledAt = new Date();
        order.cancelReason = req.body.reason;
        order.statusHistory.push({ status: 'cancelled', note: req.body.reason || 'Cancelled by user', updatedAt: new Date() });
        for (const item of order.items) {
            if (!item.isPreOrder)
                await Product_1.default.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        }
        await order.save();
        try {
            const user = req.user;
            const { subject, html } = email_1.emailTemplates.orderCancelled(user.name, order, req.body.reason);
            await (0, email_1.sendEmail)({ to: user.email, subject, html });
        }
        catch (e) {
            console.error('Email error:', e);
        }
        res.json({ success: true, order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.cancelOrder = cancelOrder;
const deleteOrder = async (req, res) => {
    try {
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        const isOwner = order.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            res.status(403).json({ success: false, message: 'Not authorized' });
            return;
        }
        if (order.orderStatus !== 'cancelled') {
            res.status(400).json({ success: false, message: 'Only cancelled orders can be deleted' });
            return;
        }
        await order.deleteOne();
        res.json({ success: true, message: 'Order deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteOrder = deleteOrder;
//# sourceMappingURL=orderController.js.map