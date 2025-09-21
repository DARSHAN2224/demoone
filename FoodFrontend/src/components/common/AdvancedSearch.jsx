import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, TrendingUp, MapPin, Star, DollarSign, Package, Store, Clock, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-hot-toast';

const AdvancedSearch = ({ onSearchResults, placeholder = "Search for products, shops, and more..." }) => {
    const { accessToken } = useAuthStore();
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [trendingSearches, setTrendingSearches] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    const [entityType, setEntityType] = useState('all');
    const [filters, setFilters] = useState({
        category: '',
        minPrice: '',
        maxPrice: '',
        rating: '',
        location: '',
        radius: '10',
        availability: '',
        shopStatus: 'active'
    });
    const [facets, setFacets] = useState({});
    const [sortBy, setSortBy] = useState('relevance');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const searchInputRef = useRef(null);
    const suggestionsRef = useRef(null);

    // Fetch search suggestions
    const fetchSuggestions = async (searchQuery) => {
        if (searchQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        try {
            const response = await fetch(`/api/v1/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
            if (response.ok) {
                const data = await response.json();
                setSuggestions(data.data.suggestions || []);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    };

    // Fetch trending searches
    const fetchTrendingSearches = async () => {
        try {
            const response = await fetch('/api/v1/search/trending');
            if (response.ok) {
                const data = await response.json();
                setTrendingSearches(data.data.searches || []);
            }
        } catch (error) {
            console.error('Error fetching trending searches:', error);
        }
    };

    // Fetch search facets
    const fetchFacets = async () => {
        try {
            const response = await fetch('/api/v1/search/facets');
            if (response.ok) {
                const data = await response.json();
                setFacets(data.data.facets || {});
            }
        } catch (error) {
            console.error('Error fetching facets:', error);
        }
    };

    // Perform search
    const performSearch = async (searchQuery = query, searchPage = 1, reset = false) => {
        if (!searchQuery.trim()) return;

        try {
            setLoading(true);
            
            const queryParams = new URLSearchParams({
                query: searchQuery.trim(),
                entityType,
                page: searchPage,
                sort: sortBy,
                ...filters
            });

            const response = await fetch(`/api/v1/search/comprehensive?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to perform search');

            const data = await response.json();
            const results = data.data.results || {};

            if (reset) {
                setSearchResults(results);
                setPage(1);
            } else {
                setSearchResults(prev => ({
                    products: [...(prev?.products || []), ...(results.products || [])],
                    shops: [...(prev?.shops || []), ...(results.shops || [])]
                }));
            }

            setHasMore((results.products?.length || 0) + (results.shops?.length || 0) >= 20);
            
            // Add to search history
            if (searchQuery.trim() && !searchHistory.includes(searchQuery.trim())) {
                setSearchHistory(prev => [searchQuery.trim(), ...prev.slice(0, 9)]);
            }

            // Call parent callback if provided
            if (onSearchResults) {
                onSearchResults(results);
            }

            // Hide suggestions
            setSuggestions([]);
        } catch (error) {
            console.error('Error performing search:', error);
            toast.error('Search failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle search input change
    const handleInputChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        fetchSuggestions(value);
    };

    // Handle search submission
    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            performSearch(query, 1, true);
        }
    };

    // Handle suggestion click
    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion);
        performSearch(suggestion, 1, true);
    };

    // Handle trending search click
    const handleTrendingClick = (trend) => {
        setQuery(trend);
        performSearch(trend, 1, true);
    };

    // Handle history click
    const handleHistoryClick = (historyItem) => {
        setQuery(historyItem);
        performSearch(historyItem, 1, true);
    };

    // Load more results
    const loadMore = () => {
        if (hasMore && !loading) {
            performSearch(query, page + 1, false);
            setPage(prev => prev + 1);
        }
    };

    // Apply filters
    const applyFilters = () => {
        performSearch(query, 1, true);
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            category: '',
            minPrice: '',
            maxPrice: '',
            rating: '',
            location: '',
            radius: '10',
            availability: '',
            shopStatus: 'active'
        });
        performSearch(query, 1, true);
    };

    // Clear search
    const clearSearch = () => {
        setQuery('');
        setSearchResults(null);
        setSuggestions([]);
        setPage(1);
        setHasMore(true);
    };

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setSuggestions([]);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load trending searches and facets on mount
    useEffect(() => {
        fetchTrendingSearches();
        fetchFacets();
    }, []);

    return (
        <div className="w-full">
            {/* Search Input */}
            <div className="relative">
                <form onSubmit={handleSearch} className="relative">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={query}
                            onChange={handleInputChange}
                            placeholder={placeholder}
                            className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-16 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Search
                        </button>
                    </div>
                </form>

                {/* Search Suggestions */}
                {suggestions.length > 0 && (
                    <div
                        ref={suggestionsRef}
                        className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 max-h-96 overflow-y-auto"
                    >
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                            >
                                <Search className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-700">{suggestion}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Search History & Trending */}
                {!query && !searchResults && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 p-4">
                        {/* Search History */}
                        {searchHistory.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Searches</h4>
                                <div className="flex flex-wrap gap-2">
                                    {searchHistory.map((item, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleHistoryClick(item)}
                                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trending Searches */}
                        {trendingSearches.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                    Trending Searches
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {trendingSearches.map((trend, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleTrendingClick(trend)}
                                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200"
                                        >
                                            {trend}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Search Controls */}
            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4">
                    <select
                        value={entityType}
                        onChange={(e) => setEntityType(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm"
                    >
                        <option value="all">All</option>
                        <option value="products">Products</option>
                        <option value="shops">Shops</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm"
                    >
                        <option value="relevance">Relevance</option>
                        <option value="newest">Newest</option>
                        <option value="price_low">Price: Low to High</option>
                        <option value="price_high">Price: High to Low</option>
                        <option value="rating">Rating</option>
                        <option value="popular">Popular</option>
                    </select>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center space-x-2"
                    >
                        <Filter className="w-4 h-4" />
                        <span>Filters</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {searchResults && (
                    <div className="text-sm text-gray-600">
                        {((searchResults.products?.length || 0) + (searchResults.shops?.length || 0))} results
                    </div>
                )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
                <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            >
                                <option value="">All Categories</option>
                                {facets.categories?.map(cat => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                            <input
                                type="number"
                                value={filters.minPrice}
                                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                                placeholder="0"
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                            <input
                                type="number"
                                value={filters.maxPrice}
                                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                                placeholder="1000"
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                            <select
                                value={filters.rating}
                                onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            >
                                <option value="">Any Rating</option>
                                <option value="4">4+ Stars</option>
                                <option value="3">3+ Stars</option>
                                <option value="2">2+ Stars</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                                type="text"
                                value={filters.location}
                                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="City, State"
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Radius (km)</label>
                            <select
                                value={filters.radius}
                                onChange={(e) => setFilters(prev => ({ ...prev, radius: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            >
                                <option value="5">5 km</option>
                                <option value="10">10 km</option>
                                <option value="25">25 km</option>
                                <option value="50">50 km</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                            <select
                                value={filters.availability}
                                onChange={(e) => setFilters(prev => ({ ...prev, availability: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            >
                                <option value="">Any</option>
                                <option value="in_stock">In Stock</option>
                                <option value="out_of_stock">Out of Stock</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Status</label>
                            <select
                                value={filters.shopStatus}
                                onChange={(e) => setFilters(prev => ({ ...prev, shopStatus: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            >
                                <option value="active">Active</option>
                                <option value="verified">Verified</option>
                                <option value="premium">Premium</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={applyFilters}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Search Results */}
            {searchResults && (
                <div className="mt-6">
                    {/* Products Results */}
                    {searchResults.products && searchResults.products.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                                <Package className="w-5 h-5 mr-2" />
                                Products ({searchResults.products.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {searchResults.products.map(product => (
                                    <ProductCard key={product._id} product={product} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Shops Results */}
                    {searchResults.shops && searchResults.shops.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                                <Store className="w-5 h-5 mr-2" />
                                Shops ({searchResults.shops.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {searchResults.shops.map(shop => (
                                    <ShopCard key={shop._id} shop={shop} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No Results */}
                    {(!searchResults.products || searchResults.products.length === 0) &&
                     (!searchResults.shops || searchResults.shops.length === 0) && (
                        <div className="text-center py-12">
                            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                            <p className="text-gray-600">Try adjusting your search terms or filters</p>
                        </div>
                    )}

                    {/* Load More */}
                    {hasMore && (
                        <div className="text-center mt-8">
                            <button
                                onClick={loadMore}
                                disabled={loading}
                                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                            >
                                {loading ? 'Loading...' : 'Load More Results'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Product Card Component
const ProductCard = ({ product }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <img
            src={product.image || '/default-product.png'}
            alt={product.name}
            className="w-full h-32 object-cover rounded-lg mb-3"
        />
        <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{product.name}</h4>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
        
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600">{product.rating || 'N/A'}</span>
            </div>
            <span className="font-semibold text-gray-900">${product.price}</span>
        </div>
    </div>
);

// Shop Card Component
const ShopCard = ({ shop }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-3 mb-3">
            <img
                src={shop.logo || '/default-shop.png'}
                alt={shop.name}
                className="w-12 h-12 rounded-full object-cover"
            />
            <div>
                <h4 className="font-medium text-gray-900">{shop.name}</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{shop.location}</span>
                </div>
            </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{shop.description}</p>
        
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600">{shop.rating || 'N/A'}</span>
            </div>
            <span className="text-sm text-gray-500">{shop.category}</span>
        </div>
    </div>
);

export default AdvancedSearch;
