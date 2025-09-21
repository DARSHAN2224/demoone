import express from 'express';
import { verifyJWT } from '../middlewares/authMiddleware.js';
import {
    comprehensiveSearch,
    getSearchSuggestions,
    getSearchFacets,
    getTrendingSearches
} from '../controllers/searchController.js';

const router = express.Router();

// ==================== SEARCH ROUTES ====================
// Most search routes are public, some require authentication for analytics

// Comprehensive search across all entities
router.get('/comprehensive', comprehensiveSearch);

// Get search suggestions and autocomplete
router.get('/suggestions', getSearchSuggestions);

// Get search facets for filtering
router.get('/facets', getSearchFacets);

// Get trending searches
router.get('/trending', getTrendingSearches);

// ==================== ENTITY-SPECIFIC SEARCH ====================

// Search products only
router.get('/products', comprehensiveSearch);

// Search shops only
router.get('/shops', comprehensiveSearch);

// ==================== ADVANCED SEARCH FEATURES ====================

// Search with advanced filters (requires authentication for analytics)
router.get('/advanced', verifyJWT, comprehensiveSearch);

// Search with location-based filtering
router.get('/nearby', comprehensiveSearch);

// Search with price range filtering
router.get('/price-range', comprehensiveSearch);

// Search with rating filtering
router.get('/by-rating', comprehensiveSearch);

export default router;


