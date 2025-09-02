import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE = 'http://localhost:5000/api';
const TEST_ADMIN_TOKEN = 'your-admin-token-here'; // Replace with actual admin token

// Test data
const testBannerData = {
    title: 'Test Banner with Media',
    subtitle: 'A test banner with image or video',
    cta: 'Click Here',
    link: '/test-link',
    textPosition: 'center',
    altText: 'Test banner media'
};

/**
 * Create a test image file
 */
function createTestImage() {
    const canvas = `<svg width="1200" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="400" fill="linear-gradient(45deg, #ff6b6b, #4ecdc4)"/>
        <text x="600" y="200" text-anchor="middle" fill="white" font-size="48" font-family="Arial">TEST BANNER</text>
        <text x="600" y="250" text-anchor="middle" fill="white" font-size="24" font-family="Arial">Image Media</text>
    </svg>`;
    
    const imagePath = path.join(__dirname, 'test-banner-image.svg');
    fs.writeFileSync(imagePath, canvas);
    return imagePath;
}

/**
 * Create a test video file (simple text file for testing)
 */
function createTestVideo() {
    const videoContent = 'This is a test video file content for banner testing';
    const videoPath = path.join(__dirname, 'test-banner-video.mp4');
    fs.writeFileSync(videoPath, videoContent);
    return videoPath;
}

/**
 * Test adding a banner with image
 */
async function testAddBannerWithImage() {
    console.log('\n=== Testing Add Banner with Image ===');
    
    try {
        const imagePath = createTestImage();
        
        const formData = new FormData();
        
        // Add banner data
        Object.keys(testBannerData).forEach(key => {
            formData.append(key, testBannerData[key]);
        });
        
        // Add image file
        formData.append('media', fs.createReadStream(imagePath));
        
        const response = await axios.post(
            `${API_BASE}/banner/addBanner`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`
                }
            }
        );
        
        console.log('✅ Banner with image added successfully');
        console.log('Banner ID:', response.data.banner._id);
        console.log('Media Type:', response.data.banner.media?.type);
        console.log('Media URL:', response.data.banner.media?.url);
        
        if (response.data.warnings && response.data.warnings.length > 0) {
            console.log('⚠️ Warnings:', response.data.warnings);
        }
        
        // Clean up test files
        fs.unlinkSync(imagePath);
        
        return response.data.banner._id;
        
    } catch (error) {
        console.error('❌ Error adding banner with image:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Test adding a banner with video
 */
async function testAddBannerWithVideo() {
    console.log('\n=== Testing Add Banner with Video ===');
    
    try {
        const videoPath = createTestVideo();
        
        const formData = new FormData();
        
        // Add banner data
        formData.append('title', 'Test Video Banner');
        formData.append('subtitle', 'A test banner with video media');
        formData.append('cta', 'Watch Now');
        formData.append('link', '/video-link');
        formData.append('textPosition', 'right');
        formData.append('altText', 'Test video banner');
        
        // Add video file
        formData.append('media', fs.createReadStream(videoPath));
        
        const response = await axios.post(
            `${API_BASE}/banner/addBanner`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`
                }
            }
        );
        
        console.log('✅ Banner with video added successfully');
        console.log('Banner ID:', response.data.banner._id);
        console.log('Media Type:', response.data.banner.media?.type);
        console.log('Media URL:', response.data.banner.media?.url);
        console.log('Video Duration:', response.data.banner.media?.duration || 'N/A');
        
        if (response.data.warnings && response.data.warnings.length > 0) {
            console.log('⚠️ Warnings:', response.data.warnings);
        }
        
        // Clean up test files
        fs.unlinkSync(videoPath);
        
        return response.data.banner._id;
        
    } catch (error) {
        console.error('❌ Error adding banner with video:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Test updating a banner
 */
async function testUpdateBanner(bannerId) {
    console.log('\n=== Testing Update Banner ===');
    
    if (!bannerId) {
        console.log('❌ No banner ID provided for update test');
        return;
    }
    
    try {
        const newImagePath = createTestImage();
        
        const formData = new FormData();
        
        // Update banner data
        formData.append('title', 'Updated Test Banner');
        formData.append('subtitle', 'Updated subtitle for banner');
        formData.append('cta', 'Updated CTA');
        formData.append('link', '/updated-link');
        formData.append('textPosition', 'center');
        formData.append('altText', 'Updated banner image');
        
        // Add new image
        formData.append('media', fs.createReadStream(newImagePath));
        
        const response = await axios.put(
            `${API_BASE}/banner/${bannerId}`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`
                }
            }
        );
        
        console.log('✅ Banner updated successfully');
        console.log('Updated title:', response.data.banner.title);
        console.log('Media Type:', response.data.banner.media?.type);
        console.log('Media URL:', response.data.banner.media?.url);
        
        if (response.data.warnings && response.data.warnings.length > 0) {
            console.log('⚠️ Warnings:', response.data.warnings);
        }
        
        // Clean up test files
        fs.unlinkSync(newImagePath);
        
    } catch (error) {
        console.error('❌ Error updating banner:', error.response?.data || error.message);
    }
}

/**
 * Test viewing a single banner
 */
async function testViewBanner(bannerId) {
    console.log('\n=== Testing View Single Banner ===');
    
    if (!bannerId) {
        console.log('❌ No banner ID provided for view test');
        return;
    }
    
    try {
        const response = await axios.get(`${API_BASE}/banner/${bannerId}`);
        
        console.log('✅ Banner retrieved successfully');
        console.log('Banner title:', response.data.banner.title);
        console.log('Media type:', response.data.banner.media?.type || 'N/A');
        console.log('Media URL:', response.data.banner.media?.url || 'N/A');
        
        if (response.data.banner.media) {
            const media = response.data.banner.media;
            console.log('Media details:');
            console.log('  - Format:', media.format || 'N/A');
            console.log('  - Size:', media.formattedSize || (media.size ? `${Math.round(media.size / 1024)} KB` : 'N/A'));
            
            if (media.type === 'video') {
                console.log('  - Duration:', media.formattedDuration || 'N/A');
                console.log('  - Dimensions:', media.width && media.height 
                    ? `${media.width}x${media.height}` 
                    : 'N/A');
            }
        }
        
    } catch (error) {
        console.error('❌ Error viewing banner:', error.response?.data || error.message);
    }
}

/**
 * Test viewing all banners
 */
async function testViewAllBanners() {
    console.log('\n=== Testing View All Banners ===');
    
    try {
        const response = await axios.get(`${API_BASE}/banner/banners`);
        
        console.log('✅ All banners retrieved successfully');
        console.log('Total banners:', response.data.count);
        
        if (response.data.banners && response.data.banners.length > 0) {
            console.log('Banners:');
            response.data.banners.forEach((banner, index) => {
                console.log(`  ${index + 1}. ${banner.title} (${banner.media?.type || 'image'})`);
                console.log(`     - Order: ${banner.order}`);
                console.log(`     - Active: ${banner.isActive}`);
                console.log(`     - Media: ${banner.media?.url || 'N/A'}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error viewing all banners:', error.response?.data || error.message);
    }
}

/**
 * Test deleting a banner
 */
async function testDeleteBanner(bannerId) {
    console.log('\n=== Testing Delete Banner ===');
    
    if (!bannerId) {
        console.log('❌ No banner ID provided for delete test');
        return;
    }
    
    try {
        const response = await axios.delete(
            `${API_BASE}/banner/${bannerId}`,
            {
                headers: {
                    'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`
                }
            }
        );
        
        console.log('✅ Banner deleted successfully');
        console.log('Deleted banner:', response.data.deletedBanner.title);
        console.log('Files deleted:', response.data.filesDeleted);
        
    } catch (error) {
        console.error('❌ Error deleting banner:', error.response?.data || error.message);
    }
}

/**
 * Run all tests
 */
async function runBannerTests() {
    console.log('🚀 Starting Banner Media Tests...');
    console.log('Note: Make sure your server is running and you have a valid admin token');
    
    // Test 1: Add banner with image
    const imageBannerId = await testAddBannerWithImage();
    
    // Test 2: Add banner with video
    const videoBannerId = await testAddBannerWithVideo();
    
    // Test 3: View all banners
    await testViewAllBanners();
    
    if (imageBannerId) {
        // Test 4: View single banner
        await testViewBanner(imageBannerId);
        
        // Test 5: Update banner
        await testUpdateBanner(imageBannerId);
        
        // Test 6: Delete banner
        await testDeleteBanner(imageBannerId);
    }
    
    if (videoBannerId) {
        // Test 7: View video banner
        await testViewBanner(videoBannerId);
        
        // Test 8: Delete video banner
        await testDeleteBanner(videoBannerId);
    }
    
    console.log('\n✨ Banner tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runBannerTests().catch(console.error);
}

export { 
    testAddBannerWithImage, 
    testAddBannerWithVideo, 
    testUpdateBanner, 
    testViewBanner, 
    testViewAllBanners,
    testDeleteBanner,
    runBannerTests 
};