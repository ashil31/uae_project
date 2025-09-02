import Product from "../../models/product.js";
import fs from 'fs';
import mongoose from "mongoose";
import path from 'path';

const deleteProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        // Find the product with all its data
        const product = await Product.findById(id).session(session);
        if (!product) {
            await session.abortTransaction();
            return res.status(404).json({ 
                success: false,
                message: 'Product not found' 
            });
        }

        // Collect all image paths to delete
        const imagesToDelete = [];
        
        // Main product images
        if (product.images && product.images.length > 0) {
            product.images.forEach(image => {
                if (image.url && image.url.startsWith('/uploads/')) {
                    imagesToDelete.push(image.url);
                }
            });
        }

        // Variant images (if your schema has variants)
        if (product.variants && product.variants.length > 0) {
            product.variants.forEach(variant => {
                if (variant.images && variant.images.length > 0) {
                    variant.images.forEach(image => {
                        if (image.url && image.url.startsWith('/uploads/')) {
                            imagesToDelete.push(image.url);
                        }
                    });
                }
            });
        }

        // Delete the product first (within transaction)
        const deletedProduct = await Product.findByIdAndDelete(id).session(session);

        // If we got here, the DB operation was successful - commit the transaction
        await session.commitTransaction();

        // Now delete the files (outside transaction since this is filesystem operation)
        if (imagesToDelete.length > 0) {
            imagesToDelete.forEach(imagePath => {
                try {
                    const filename = imagePath.split('/uploads/')[1];
                    if (filename) {
                        const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                } catch (err) {
                    console.error(`Error deleting image ${imagePath}:`, err);
                    // Don't fail the request if image deletion fails
                }
            });
        }

        res.status(200).json({ 
            success: true,
            message: 'Product and associated images deleted successfully',
            deletedProduct
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error deleting product:', error);
        
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete product', 
            error: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    } finally {
        session.endSession();
    }
};

export default deleteProduct;