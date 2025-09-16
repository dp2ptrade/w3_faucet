'use client';

import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Copy,
  Settings,
  DollarSign,
  Clock,
  Users
} from 'lucide-react';

interface Token {
  id: string;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  amount: string;
  cooldownPeriod: number;
  isActive: boolean;
  totalClaimed?: string;
  claimCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface TokenFormData {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  amount: string;
  cooldownPeriod: number;
  isActive: boolean;
}

export function TokenManagement() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [formData, setFormData] = useState<TokenFormData>({
    name: '',
    symbol: '',
    address: '',
    decimals: 18,
    amount: '',
    cooldownPeriod: 24,
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      setIsLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${apiUrl}/api/v1/admin/tokens`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }

      const data = await response.json();
      setTokens(data.tokens || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token');
      }

      const url = editingToken 
        ? `${apiUrl}/api/v1/admin/tokens/${editingToken.id}`
        : `${apiUrl}/api/v1/admin/tokens`;
      
      const method = editingToken ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingToken ? 'update' : 'create'} token`);
      }

      // Reset form and close modal
      setFormData({
        name: '',
        symbol: '',
        address: '',
        decimals: 18,
        amount: '',
        cooldownPeriod: 24,
        isActive: true
      });
      setShowAddModal(false);
      setEditingToken(null);
      
      // Refresh tokens list
      fetchTokens();
    } catch (error) {
      console.error('Error submitting token:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit token');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (token: Token) => {
    setEditingToken(token);
    setFormData({
      name: token.name,
      symbol: token.symbol,
      address: token.address,
      decimals: token.decimals,
      amount: token.amount,
      cooldownPeriod: token.cooldownPeriod,
      isActive: token.isActive
    });
    setShowAddModal(true);
  };

  const handleDelete = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${apiUrl}/api/v1/admin/tokens/${tokenId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete token');
      }

      // Refresh tokens list
      fetchTokens();
    } catch (error) {
      console.error('Error deleting token:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete token');
    }
  };

  const toggleTokenStatus = async (tokenId: string, currentStatus: boolean) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${apiUrl}/api/v1/admin/tokens/${tokenId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update token status');
      }

      // Refresh tokens list
      fetchTokens();
    } catch (error) {
      console.error('Error updating token status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update token status');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredTokens = tokens.filter(token => 
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatAmount = (amount: string, decimals: number) => {
    const value = parseFloat(amount) / Math.pow(10, decimals);
    return value.toLocaleString();
  };

  const formatCooldown = (hours: number) => {
    if (hours < 24) {
      return `${hours}h`;
    }
    return `${Math.floor(hours / 24)}d`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Token Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Configure faucet tokens, amounts, and cooldown periods
            </p>
          </div>
          
          <button
            onClick={() => {
              setEditingToken(null);
              setFormData({
                name: '',
                symbol: '',
                address: '',
                decimals: 18,
                amount: '',
                cooldownPeriod: 24,
                isActive: true
              });
              setShowAddModal(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Token
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search tokens by name, symbol, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Tokens Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTokens.map((token) => (
          <div key={token.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{token.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{token.symbol}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {token.isActive ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Token Details */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Address:</span>
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-mono text-gray-900 dark:text-white">
                    {token.address.slice(0, 6)}...{token.address.slice(-4)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(token.address)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                <div className="flex items-center space-x-1">
                  <DollarSign className="w-3 h-3 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatAmount(token.amount, token.decimals)} {token.symbol}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cooldown:</span>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCooldown(token.cooldownPeriod)}
                  </span>
                </div>
              </div>
              
              {token.claimCount !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Claims:</span>
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {token.claimCount}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(token)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  <Edit className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => handleDelete(token.id)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <a
                  href={`https://etherscan.io/address/${token.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              
              <button
                onClick={() => toggleTokenStatus(token.id, token.isActive)}
                className={`text-sm font-medium ${
                  token.isActive
                    ? 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'
                    : 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300'
                }`}
              >
                {token.isActive ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTokens.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <Coins className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No tokens found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm 
              ? 'Try adjusting your search criteria.'
              : 'Get started by adding your first token to the faucet.'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setEditingToken(null);
                setFormData({
                  name: '',
                  symbol: '',
                  address: '',
                  decimals: 18,
                  amount: '',
                  cooldownPeriod: 24,
                  isActive: true
                });
                setShowAddModal(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Token
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Token Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingToken ? 'Edit Token' : 'Add New Token'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Token Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Ethereum"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., ETH"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contract Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="0x..."
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Decimals
                  </label>
                  <input
                    type="number"
                    value={formData.decimals}
                    onChange={(e) => setFormData({ ...formData, decimals: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="18"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cooldown (hours)
                  </label>
                  <input
                    type="number"
                    value={formData.cooldownPeriod}
                    onChange={(e) => setFormData({ ...formData, cooldownPeriod: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (in wei/smallest unit)
                </label>
                <input
                  type="text"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 1000000000000000000 (1 ETH)"
                  required
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Active (available for claiming)
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingToken(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Saving...' : (editingToken ? 'Update' : 'Add Token')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}