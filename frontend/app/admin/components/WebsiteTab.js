"use client";

import React, { useState } from 'react';

export default function WebsiteTab() {
    const [seo, setSeo] = useState({ title: 'Patna #1 Sports Turf', description: 'Play Elite indoor cricket & football in Patna' });
    const [testimonials, setTestimonials] = useState([
        { id: 1, author: 'Ravi Ranjan', quote: 'The best turf experience in Patna! Very premium and well maintained.' },
        { id: 2, author: 'Shashi Shekhar', quote: 'Excellent coaching staff at Khelo Patna Football academy.' }
    ]);
    const [newTestimonial, setNewTestimonial] = useState({ author: '', quote: '' });

    const handleAddTestimonial = (e) => {
        e.preventDefault();
        if (!newTestimonial.author || !newTestimonial.quote) return;
        setTestimonials([...testimonials, { id: Date.now(), ...newTestimonial }]);
        setNewTestimonial({ author: '', quote: '' });
        alert('Testimonial saved locally! Click Save Site Content to publish.');
    };

    return (
        <div className="card-premium animate-fade-in">
            <h3 className="mb-4">Website Builder & Content Management</h3>

            <div className="row g-4">
                <div className="col-md-6">
                    <h4>1. SEO Settings</h4>
                    <div className="d-flex flex-column gap-3 mt-3">
                        <div>
                            <label className="d-block mb-1">Meta Title Tag</label>
                            <input type="text" className="input-premium w-100" value={seo.title} onChange={(e) => setSeo({...seo, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="d-block mb-1">Meta Description</label>
                            <textarea className="input-premium w-100" rows="3" value={seo.description} onChange={(e) => setSeo({...seo, description: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="col-md-6">
                    <h4>2. Customer Testimonials</h4>
                    <div className="d-flex flex-column gap-2 mt-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {testimonials.map(t => (
                            <div key={t.id} className="border p-2 rounded bg-opacity-10 bg-white">
                                <strong>{t.author}</strong>: <span style={{ fontSize: '0.85rem' }}>"{t.quote}"</span>
                            </div>
                        ))}
                    </div>
                    
                    <form onSubmit={handleAddTestimonial} className="d-flex flex-column gap-2 mt-3">
                        <input type="text" placeholder="Author name" required className="input-premium w-100" value={newTestimonial.author} onChange={(e) => setNewTestimonial({...newTestimonial, author: e.target.value})} />
                        <input type="text" placeholder="Testimonial quote text" required className="input-premium w-100" value={newTestimonial.quote} onChange={(e) => setNewTestimonial({...newTestimonial, quote: e.target.value})} />
                        <button type="submit" className="btn-primary-stripe">Add Testimonial</button>
                    </form>
                </div>
            </div>

            <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                <button className="btn-primary-stripe" onClick={() => alert('Website configuration successfully updated!')}>💾 Save & Publish Site Content</button>
            </div>
        </div>
    );
}
