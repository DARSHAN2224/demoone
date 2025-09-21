# 🎨 Frontend Scripts

This folder contains utility scripts for the FoodApp React frontend.

## 📋 Available Scripts

### **Build Scripts**
- **Build Scripts** - Production build and optimization
- **Development Scripts** - Development server and hot reload
- **Deployment Scripts** - Build and deploy automation

### **Utility Scripts**
- **Code Generation** - Component and page scaffolding
- **Asset Management** - Image optimization and processing
- **Performance Analysis** - Bundle analysis and optimization

## 🚀 Usage

### **Development**
```bash
cd FoodFrontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run analyze      # Analyze bundle size
```

### **Testing**
```bash
npm test             # Run all tests
npm run test:unit    # Run unit tests
npm run test:e2e     # Run E2E tests
npm run test:coverage # Generate coverage report
```

### **Linting & Formatting**
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
```

## 🔧 Script Configuration

### **Environment Variables**
- **Development**: `.env.development`
- **Production**: `.env.production`
- **Testing**: `.env.test`

### **Build Configuration**
- **Vite Config**: `vite.config.js`
- **Tailwind Config**: `tailwind.config.js`
- **TypeScript Config**: `tsconfig.json`

## 📊 Build Output

### **Development Build**
- **Server**: `localhost:5173`
- **Hot Reload**: Enabled
- **Source Maps**: Full source mapping

### **Production Build**
- **Output**: `dist/` folder
- **Optimization**: Minified and optimized
- **Assets**: Compressed and hashed

## ⚠️ Important Notes

- **Node Version**: Requires Node.js 18+
- **Dependencies**: Run `npm install` before scripts
- **Environment**: Configure environment variables
- **Port Conflicts**: Ensure port 5173 is available

## 🐛 Troubleshooting

### **Common Issues**
- **Port Already in Use**: Change port in vite.config.js
- **Build Failures**: Check for TypeScript errors
- **Dependency Issues**: Clear node_modules and reinstall
- **Environment Variables**: Verify .env file configuration
