const {
    createBrand,
    getBrandsByUserId,
    getBrandById,
    updateBrand,
    deleteBrand
} = require('./authStorage');

/**
 * Setup a new brand for a user
 */
async function setupBrand(userId, brandData) {
    const { name, description, industry, website, targetAudience, brandVoice } = brandData;

    if (!name) {
        throw new Error('Brand name is required');
    }

    const brandId = await createBrand(
        userId,
        name,
        brandData
    );

    return {
        success: true,
        message: 'Brand created successfully',
        brandId
    };
}

/**
 * Get all brands for a user
 */
async function getUserBrands(userId) {
    const brands = await getBrandsByUserId(userId);
    return {
        success: true,
        brands
    };
}

/**
 * Get a specific brand's details
 */
async function getBrandDetails(userId, brandId) {
    const brand = await getBrandById(brandId);

    if (!brand) {
        throw new Error('Brand not found');
    }

    if (brand.user_id !== userId) {
        throw new Error('Access denied. You do not own this brand.');
    }

    return {
        success: true,
        brand
    };
}

/**
 * Update brand details
 */
async function updateBrandDetails(userId, brandId, updates) {
    const brand = await getBrandById(brandId);

    if (!brand) {
        throw new Error('Brand not found');
    }

    if (brand.user_id !== userId) {
        throw new Error('Access denied. You do not own this brand.');
    }

    const success = await updateBrand(brandId, updates);

    return {
        success,
        message: success ? 'Brand updated successfully' : 'No changes made'
    };
}

/**
 * Remove a brand
 */
async function removeBrand(userId, brandId) {
    const brand = await getBrandById(brandId);

    if (!brand) {
        throw new Error('Brand not found');
    }

    if (brand.user_id !== userId) {
        throw new Error('Access denied. You do not own this brand.');
    }

    const success = await deleteBrand(brandId);

    return {
        success,
        message: success ? 'Brand deleted successfully' : 'Brand not found'
    };
}

module.exports = {
    setupBrand,
    getUserBrands,
    getBrandDetails,
    updateBrandDetails,
    removeBrand
};
