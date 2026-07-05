const express = require('express');
const router = express.Router();
const InventoryItem = require('../models/InventoryItem');
const POSSale = require('../models/POSSale');
const Staff = require('../models/Staff');
const AuditLog = require('../models/AuditLog');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { sendWhatsAppMessage } = require('../services/whatsapp');

// 1. List Inventory Items
router.get('/inventory', authenticateToken, async (req, res) => {
    const { category } = req.query;
    const query = { tenantId: req.user.tenantId };
    if (category) query.category = category;

    try {
        const items = await InventoryItem.find(query).sort({ itemName: 1 });
        res.json(items);
    } catch (err) {
        console.error('Error loading inventory items:', err);
        res.status(500).json({ error: 'Server error loading inventory.' });
    }
});

// 2. Add/Update Inventory Item
router.post('/inventory', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER'), async (req, res) => {
    const { id, itemName, category, totalQuantity, availableQuantity, condition } = req.body;
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;

    if (!itemName || !category || totalQuantity === undefined || availableQuantity === undefined) {
        return res.status(400).json({ error: 'Missing required inventory fields.' });
    }

    try {
        let item;
        const oldData = id ? await InventoryItem.findOne({ _id: id, tenantId }) : null;

        if (id) {
            // Update
            item = await InventoryItem.findOneAndUpdate(
                { _id: id, tenantId },
                { itemName, category, totalQuantity: Number(totalQuantity), availableQuantity: Number(availableQuantity), condition },
                { new: true }
            );
        } else {
            // Create
            item = new InventoryItem({
                tenantId,
                branchId,
                itemName,
                category,
                totalQuantity: Number(totalQuantity),
                availableQuantity: Number(availableQuantity),
                condition
            });
            await item.save();
        }

        // Audit Log
        await new AuditLog({
            tenantId,
            userId: req.user.username,
            module: 'Inventory',
            action: id ? 'UPDATE_INVENTORY' : 'CREATE_INVENTORY',
            oldData,
            newData: item
        }).save();

        res.json({
            success: true,
            message: 'Inventory item successfully saved.',
            item
        });
    } catch (err) {
        console.error('Error saving inventory item:', err);
        res.status(500).json({ error: 'Server error saving inventory item.' });
    }
});

// 3. Record POS Sale & Decrement Inventory
router.post('/pos/sell', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'), async (req, res) => {
    const { bookingId, itemId, quantity, totalPrice } = req.body;
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;

    if (!itemId || !quantity || !totalPrice) {
        return res.status(400).json({ error: 'Item ID, quantity, and total price are required.' });
    }

    try {
        const item = await InventoryItem.findOne({ _id: itemId, tenantId });
        if (!item) {
            return res.status(404).json({ error: 'Inventory item not found.' });
        }

        if (item.availableQuantity < quantity) {
            return res.status(400).json({ error: `Insufficient stock. Only ${item.availableQuantity} units available.` });
        }

        // Deduct quantity
        item.availableQuantity -= quantity;
        await item.save();

        // Create POS Sale record
        const newSale = new POSSale({
            tenantId,
            branchId,
            bookingId: bookingId || undefined,
            itemId,
            quantity: Number(quantity),
            totalPrice: Number(totalPrice)
        });
        await newSale.save();

        // Check for low stock warning (threshold <= 3)
        if (item.availableQuantity <= 3) {
            console.log(`Low stock alert for ${item.itemName} (${item.availableQuantity} units left)`);
            const alertMsg = `⚠️ *LOW STOCK ALERT* ⚠️\n\nThe inventory item *${item.itemName}* is running low on stock!\n*   Remaining Units: ${item.availableQuantity}\n*   Category: ${item.category.toUpperCase()}\n\nPlease restock this item soon.`;
            
            sendWhatsAppMessage('9709701400', alertMsg).catch(e => console.error('Low stock alert error:', e));
        }

        res.json({
            success: true,
            message: `Sale recorded. Inventory updated.`,
            sale: newSale,
            item_remaining: item.availableQuantity
        });

    } catch (err) {
        console.error('Error processing POS transaction:', err);
        res.status(500).json({ error: 'Server error logging sale transaction.' });
    }
});

module.exports = router;
