import React from 'react';

export default function InventoryTab(props) {
    const { 
        activeSidebarKey = 'equipment-stock', 
        inventoryItems = [], 
        setSuccessMessage = () => {}, 
        handlePOSCheckout = () => {}, 
        posSale = {}, 
        setPosSale = () => {}, 
        posItems = [] 
    } = props || {};
        if (activeSidebarKey === 'stock-alerts') {
            const lowStock = inventoryItems.filter(item => item.availableQuantity <= 5);
            return (
                <div className="card-premium animate-fade-in">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-icons-outlined" style={{ color: 'var(--danger)' }}>warning</span> Inventory Stock Alerts
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>The following items are low in stock (5 units or less) and require ordering.</p>
                    <div className="table-responsive">
                        <table className="table-premium">
                            <thead>
                                <tr><th>Item Name</th><th>Category</th><th>Current Stock</th><th>Condition</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {lowStock.length === 0 ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--success)', padding: '24px 0', fontWeight: 600 }}>All inventory items are fully stocked!</td></tr>
                                ) : (
                                    lowStock.map(item => (
                                        <tr key={item._id}>
                                            <td><strong>{item.itemName}</strong></td>
                                            <td style={{ textTransform: 'capitalize' }}>{item.category.replace('_', ' ')}</td>
                                            <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{item.availableQuantity} / {item.totalQuantity} qty</td>
                                            <td><span className={`badge-stripe badge-danger`}>{item.condition}</span></td>
                                            <td>
                                                <button className="btn-secondary-stripe py-1 px-2" style={{ fontSize: '0.8rem' }} onClick={() => setSuccessMessage(`Restock request for "${item.itemName}" submitted to vendor successfully.`)}>Request Restock</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        if (activeSidebarKey === 'vendors') {
            const patnaVendors = [
                { name: 'Patna Sports Syndicate', contact: 'Anil Kumar', phone: '+91 94310 12345', email: 'orders@patnasports.com', address: 'Fraser Road, Patna', category: 'Nets, Bats & Leather Balls' },
                { name: 'Elite Sports Wear & Turf Care', contact: 'Suresh Singh', phone: '+91 99340 56789', email: 'suresh@eliteturfcare.in', address: 'Bailey Road, Patna', category: 'Turf grooming, cones, training bibs' },
                { name: 'Nalanda Athletic Supplies', contact: 'Rajesh Ranjan', phone: '+91 91220 88899', email: 'sales@nalandasupplies.com', address: 'Kankarbagh, Patna', category: 'First-aid kits, training equipment, chalk' }
            ];
            return (
                <div className="card-premium animate-fade-in">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 15px 0' }}>📦 Patna Local Sports Vendors Directory</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Contact suppliers directly for purchase orders, maintenance machinery, or custom academy uniforms.</p>
                    <div className="table-responsive">
                        <table className="table-premium">
                            <thead>
                                <tr><th>Vendor Name</th><th>Primary Supplies</th><th>Representative</th><th>Phone / Mobile</th><th>Email Address</th><th>Office Location</th></tr>
                            </thead>
                            <tbody>
                                {patnaVendors.map((v, i) => (
                                    <tr key={i}>
                                        <td><strong>{v.name}</strong></td>
                                        <td style={{ fontSize: '0.82rem' }}>{v.category}</td>
                                        <td>{v.contact}</td>
                                        <td><a href={`tel:${v.phone}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{v.phone}</a></td>
                                        <td><a href={`mailto:${v.email}`} style={{ color: 'var(--text-muted)' }}>{v.email}</a></td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.address}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        return (
            <div className="animate-fade-in">
                <div className="row g-4">
                    <div className="col-lg-7">
                        <div className="card-premium">
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 15px 0' }}>Equipment Stock Inventory</h3>
                            <table className="table-premium">
                                <thead>
                                    <tr><th>Item Name</th><th>Category</th><th>Stock</th><th>Condition</th></tr>
                                </thead>
                                <tbody>
                                    {inventoryItems.map(item => (
                                        <tr key={item._id}>
                                            <td><strong>{item.itemName}</strong></td>
                                            <td style={{ textTransform: 'capitalize' }}>{item.category.replace('_', ' ')}</td>
                                            <td>{item.availableQuantity} / {item.totalQuantity} qty</td>
                                            <td><span className={`badge-stripe ${item.condition === 'GOOD' ? 'badge-success' : 'badge-danger'}`}>{item.condition}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="col-lg-5">
                        <div className="card-premium">
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 15px 0' }}>🛒 POS Drinks & Equipment Register</h3>
                            <form onSubmit={handlePOSCheckout}>
                                <div className="mb-3">
                                    <label className="form-label">Select Item *</label>
                                    <select 
                                        className="input-premium w-100"
                                        value={posSale.itemId}
                                        onChange={(e) => setPosSale({ ...posSale, itemId: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose item...</option>
                                        {posItems.map(item => (
                                            <option key={item._id} value={item._id}>
                                                {item.itemName} (Stock: {item.availableQuantity})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Quantity *</label>
                                    <input 
                                        type="number" 
                                        className="input-premium w-100" 
                                        min="1"
                                        value={posSale.quantity}
                                        onChange={(e) => setPosSale({ ...posSale, quantity: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label">Associate Booking ID (Optional)</label>
                                    <input 
                                        type="text" 
                                        className="input-premium w-100" 
                                        placeholder="Enter Booking ID" 
                                        value={posSale.bookingId}
                                        onChange={(e) => setPosSale({ ...posSale, bookingId: e.target.value })}
                                    />
                                </div>
                                <button type="submit" className="btn-primary-stripe w-100">Record Sale</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
}
