import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker containers will use npm start instead of standalone
  // output: 'standalone',
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      'recharts', 
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'framer-motion',
      'date-fns'
    ],
  },
  
  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  
  // Bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle splitting
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Separate chunk for React/Next.js core
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // Separate chunk for UI libraries
          ui: {
            name: 'ui-lib',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|sonner)[\\/]/,
            priority: 30,
          },
          // Separate chunk for charts
          charts: {
            name: 'charts',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](recharts|d3|echarts)[\\/]/,
            priority: 25,
          },
          // Separate chunk for 3D libraries  
          three: {
            name: 'three',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            priority: 24,
          },
          // Maps and geo libraries
          maps: {
            name: 'maps',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](leaflet|react-leaflet|topojson|@turf)[\\/]/,
            priority: 23,
          },
          // Common vendor chunk
          lib: {
            test(module: any) {
              return module.size() > 160000 && /node_modules[/\\]/.test(module.identifier());
            },
            name: 'lib',
            priority: 20,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            chunks: 'initial',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    return config;
  },

  // Enable compression
  compress: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
};

export default nextConfig;
