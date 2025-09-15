# 🚀 Fergbutcher Deployment Guide

This guide will walk you through deploying your Fergbutcher Pre-Order Management System step by step.

## 📋 Prerequisites

Before we start, make sure you have:
- A modern web browser
- Internet connection
- Google account (for Sheets integration)

## 🎯 Deployment Options

### Option 1: Netlify (Recommended - Free & Easy)
### Option 2: Vercel (Alternative - Also Free)
### Option 3: Traditional Web Hosting

---

## 🌐 Option 1: Netlify Deployment (Recommended)

### Step 1: Prepare Your Files
1. Download all your project files to a folder on your computer
2. Make sure you have the `Fergbutcher_vector-01.png` logo in the `public` folder

### Step 2: Create Netlify Account
1. Go to [netlify.com](https://netlify.com)
2. Click "Sign up" and create a free account
3. Verify your email address

### Step 3: Deploy Your Site
1. In Netlify dashboard, click "Add new site" → "Deploy manually"
2. Drag and drop your entire project folder onto the deployment area
3. Wait for deployment to complete (usually 1-2 minutes)
4. Your site will be live at a URL like: `https://amazing-name-123456.netlify.app`

### Step 4: Custom Domain (Optional)
**FREE OPTIONS:**
1. **Use the free Netlify subdomain** (e.g., `fergbutcher-orders.netlify.app`)
2. **Customize your site name**: In Site settings → Site details → Change site name
   - Change from `amazing-name-123456` to `fergbutcher-orders`
   - Your URL becomes: `https://fergbutcher-orders.netlify.app`

**PAID OPTION ($19/month):**
- Custom domain like `orders.fergbutcher.com` requires Netlify Pro plan

**FREE ALTERNATIVES:**
- **GitHub Pages** (free custom domains with your own domain)
- **Vercel** (free custom domains on hobby plan)
- **Firebase Hosting** (free custom domains)

**RECOMMENDATION:** Start with the free Netlify subdomain. You can always upgrade later if needed.

---

## ⚙️ Google Sheets Integration Setup

**NOTE:** This is completely optional! The system works perfectly without Google Sheets integration.

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "New Project"
3. Name it "Fergbutcher Orders"
4. Click "Create"

### Step 2: Enable Google Sheets API
1. In the Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it and press "Enable"

### Step 3: Create API Key
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key and save it securely
4. Click "Restrict Key" and select "Google Sheets API"

### Step 4: Create OAuth Credentials
1. Still in "Credentials", click "Create Credentials" → "OAuth client ID"
2. If prompted, configure OAuth consent screen:
   - Choose "External"
   - App name: "Fergbutcher Orders"
   - User support email: your email
   - Developer contact: your email
   - Save and continue through all steps
3. Choose "Web application"
4. Name: "Fergbutcher Web App"
5. Add your site URL to "Authorized redirect URIs":
   - `https://your-site-url.netlify.app` (replace with your actual URL)
   - `http://localhost:5173` (for local testing)
6. Click "Create"
7. Copy both Client ID and Client Secret

### Step 5: Create Your Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it "Fergbutcher Orders"
4. Copy the Spreadsheet ID from the URL (the long string between `/d/` and `/edit`)

### Step 6: Configure in the App
1. Open your deployed site
2. Go to Settings → Google Sheets
3. Click "Setup Integration"
4. Enter your credentials from the previous steps
5. The app will save them securely in your browser

---

## 🧪 STEP 4: Test Everything

**👤 YOUR ACTION NEEDED:**
1. Open your deployed site
2. Try adding a customer
3. Create a test order
4. Check the calendar view
5. Test keyboard shortcuts (Ctrl+N, Ctrl+C, etc.)

### Step 2: Google Sheets Integration Test
1. Go to Settings → Google Sheets
2. Click "Setup Integration"
3. Follow the setup wizard
4. Test syncing data
5. Check your Google Sheet for data

### Step 3: Print Test
1. Go to Calendar view
2. Click on a day with orders
3. Click "Print Schedule"
4. Test printing to ensure formatting is correct

---

## 🔧 Troubleshooting

### Common Issues:

**"Site not loading"**
- Check if all files were uploaded correctly
- Verify the build completed successfully

**"Google Sheets not connecting"**
- Verify all environment variables are set correctly
- Check that your redirect URI matches exactly
- Ensure Google Sheets API is enabled

**"Keyboard shortcuts not working"**
- Make sure you're not typing in an input field
- Try refreshing the page

**"Print formatting issues"**
- Use Chrome or Firefox for best print results
- Check print preview before printing

---

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set
3. Test with a fresh browser session
4. Check that your Google Cloud project is properly configured

---

## 🚀 **Ready to Deploy!**

**COMPLETELY FREE DEPLOYMENT:**
1. ✅ Works on Netlify free plan
2. ✅ No environment variables needed
3. ✅ No custom domain required
4. ✅ Professional subdomain (e.g., `fergbutcher-orders.netlify.app`)
5. ✅ All features work perfectly

**WHAT YOU GET FOR FREE:**
- Professional order management system
- Automatic daily backups
- Print-friendly schedules  
- Keyboard shortcuts
- Undo functionality
- Optional Google Sheets sync
- Mobile-responsive design
- Secure data storage

## 🎉 STEP 5: You're Live!

Your system is now fully deployed and functional!

### Next Steps:
1. Add your real customers and orders
2. Train your staff on the system
3. Set up regular backups
4. Customize email templates in Settings

Enjoy your new order management system! 🥩📦