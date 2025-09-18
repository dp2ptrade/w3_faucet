'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Header } from '@/components/layout/Header';
import FaucetCard from '@/components/faucet/FaucetCard';
import TokenStats from '@/components/stats/TokenStats';
import RecentClaimsCard from '@/components/RecentClaimsCard';
import QueueStatusCard from '@/components/QueueStatusCard';
import { CTACard } from '@/components/ui/CTACard';
import { CommunityCard } from '@/components/ui/CommunityCard';
import { 
  Droplets, 
  Globe, 
  UserPlus, 
  BookOpen, 
  FileText,
  Code,
  TestTube,
  Lightbulb,
  Building,
  Eye,
  PenTool,
  MessageCircle,
  Twitter,
  Mail,
  ArrowRight,
  Star,
  Heart,
  Shield
} from '../components/ui/ClientIcon';

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const [cooldownPeriod, setCooldownPeriod] = useState('1-minute'); // Default fallback

  // Fetch actual cooldown period from API
  useEffect(() => {
    const fetchCooldownPeriod = async () => {
      try {
        const response = await fetch('/api/faucet/stats');
        if (response.ok) {
          const data = await response.json();
          const cooldownMs = data.cooldownPeriod || 1 * 60 * 1000; // Default to 1 minute if not available
          const cooldownMinutes = Math.ceil(cooldownMs / (60 * 1000));
          
          if (cooldownMinutes >= 60) {
            const hours = Math.ceil(cooldownMinutes / 60);
            setCooldownPeriod(`${hours}-hour`);
          } else {
            setCooldownPeriod(`${cooldownMinutes}-minute`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch cooldown period:', error);
      }
    };
    
    fetchCooldownPeriod();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Faucet is online and ready</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Get Free Testnet Tokens
          </h2>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Claim free testnet tokens for Ethereum development. No registration required,
            just connect your wallet and start building.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{cooldownPeriod} cooldown</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Multiple tokens supported</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Secure and reliable</span>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className={`grid grid-cols-1 gap-8 ${isConnected ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          {/* Left Column - Faucet */}
          <div className={`space-y-8 ${isConnected ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
            <FaucetCard />
          </div>

          {/* Right Column - Stats (only when connected) */}
          {isConnected && (
            <div className="lg:col-span-1 space-y-8">
              <QueueStatusCard userAddress={address} />
              <TokenStats userAddress={address} />
              <RecentClaimsCard userAddress={address} />
            </div>
          )}
        </div>

        {/* Queue Status for non-connected users */}
        {!isConnected && (
          <div className="mt-12">
            <QueueStatusCard />
          </div>
        )}

        {/* Features Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Why Use Our Faucet?
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl w-fit mb-4">
                <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Fast & Reliable
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Get your testnet tokens instantly with our high-performance infrastructure.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl w-fit mb-4">
                <Globe className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Multiple Tokens
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Support various eth sepolia testnet tokens including W3E, USDT, USDC, LINK, etc.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="w-fit mb-4">
                <img 
                  src="/w3-logo.png" 
                  alt="W3 Energy Logo" 
                  className="w-12 h-12 object-contain"
                />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Powered by W3 Energy
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Access institutional-grade renewable energy investments, advanced analytics, and direct project funding through the world's most sophisticated energy finance platform.
              </p>
            </div>
          </div>
        </div>

        {/* Whitelist CTA Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-800 dark:text-blue-200 px-6 py-3 rounded-full text-sm font-medium mb-6">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>Get Started with W3 Energy</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Need W3E Tokens to Start Minting?
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Join our whitelist to get priority access to W3E tokens and explore our comprehensive documentation.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <CTACard
              title="Get Whitelisted"
              description="Join our exclusive whitelist to get priority access to W3E tokens and early access to new features."
              icon={UserPlus}
              href="https://w3-energy.org/waitlist.html"
              variant="primary"
              external
            />
            <CTACard
              title="Read Documentation"
              description="Explore our comprehensive guides, API references, and learn how to integrate with W3 Energy ecosystem."
              icon={BookOpen}
              href="https://docs.w3-energy.org"
              variant="secondary"
              external
            />
          </div>
        </div>

        {/* Build with W3-Energy Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Build with W3-Energy
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Everything you need to get started building on the world's most sophisticated energy finance platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CTACard
              title="Learn Our Ecosystem"
              description="Discover smart contracts, energy systems, and everything you need to understand our revolutionary platform."
              icon={Lightbulb}
              href="https://w3-energy.org/ecosystem"
              external
            />
            <CTACard
              title="W3 Energy Documentation"
              description="Comprehensive technical documentation, API references, and integration guides for developers."
              icon={FileText}
              href="https://docs.w3-energy.org"
              external
            />
            <CTACard
              title="Explore Testnet Environment"
              description="Test our applications in the W3 Energy testnet environment with full access to testnet tokens and features."
              icon={TestTube}
              href="https://testnet.w3-energy.org"
              external
            />
          </div>
        </div>

        {/* Integration & Ecosystem Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Integration & Ecosystem
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Connect with our ecosystem, explore real-time experiences, and access valuable resources.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CTACard
              title="Speak to an Expert"
              description="Looking to integrate with your apps or ecosystem? List your projects on our platform? Get in touch with our team."
              icon={Building}
              href="/contact"
            />
            <CTACard
              title="Experience Ecosystem Real-time"
              description="Explore our live ecosystem dashboard and see real-time energy trading, analytics, and market data."
              icon={Eye}
              href="https://app.w3-energy.org"
              external
            />
            <CTACard
              title="Insights, Research & Resources"
              description="Stay updated with the latest insights, research papers, and resources from our energy finance experts."
              icon={PenTool}
              href="https://blog.w3-energy.org"
              external
            />
          </div>
        </div>

        {/* Community Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Join Our Community
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Connect with developers, energy experts, and innovators building the future of sustainable finance.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <CommunityCard
              name="Telegram"
              description="Join our active community for real-time discussions, support, and updates."
              icon={MessageCircle}
              href="https://t.me/w3energy_org"
              color="blue"
              members="5,000+ members"
            />
            <CommunityCard
              name="Twitter"
              description="Follow us for the latest news, announcements, and industry insights."
              icon={Twitter}
              href="https://x.com/w3energy_org"
              color="purple"
              members="10,000+ followers"
            />
            <CommunityCard
              name="Contact Us"
              description="Have questions or need support? Reach out to our team directly."
              icon={Mail}
              href="mailto:contact@w3-energy.org"
              color="green"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="p-2 flex items-center justify-center">
                <img 
                  src="/w3-logo.png" 
                  alt="W3 Energy Logo" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                W3 Energy Faucet
              </span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Support
              </a>
              <span>© 2024 W3 Energy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}