# 🛠️ Gemini-Powered Patch Registry Setup Instructions

## Overview
The Patch Registry system automatically detects software updates by:
1. Fetching installed software from your database
2. Using Google Gemini AI to find vendor websites for unknown software
3. Checking vendor sites for latest versions with AI-powered extraction
4. Creating alerts for software that needs updates

## Prerequisites

### 1. Google Gemini API Key Required 🤖
The Patch Registry uses Google Gemini AI for intelligent vendor discovery:
- Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Add it to your `.env` file
- Cost-effective: ~$0.50-1.00 for 100 software checks

### 2. Install Dependencies
```bash
npm install axios cheerio @google/generative-ai
```

## Setup Steps

### Step 1: Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key (starts with `AIza`)

### Step 2: Update Environment Variables
Add to your `.env` file:
```env
# Google Gemini Configuration (for Patch Registry)
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Restart Your Server
```bash
# Stop your current server (Ctrl+C)
# Then restart
npm start
```

### Step 3: Access Patch Registry
1. Open your browser to `http://localhost:3000`
2. Click on "Patch Registry" in the navigation
3. Click "Check for Software Updates" to start the first scan

## How It Works

### 1. Software Detection
- The system reads software information from your existing Asset database
- Uses the `software_info.software_list` field from each asset

### 2. AI-Powered Vendor Discovery
- For each software, the system checks a predefined vendor database first
- Uses Google Gemini AI to find vendor websites for unknown software
- Gets download URLs and version check pages with high accuracy

### 3. AI-Enhanced Version Scraping
- Scrapes vendor websites for latest version information
- Uses Gemini AI to extract versions from complex web pages
- Compares with installed versions using semantic versioning
- Only flags updates when current version is older than latest version

### 4. Alert Creation
- Creates alerts for software that needs updates
- Categorizes by priority (Critical, High, Medium, Low)
- Shows system name and software name

## Features

### Alert Management
- **Status Tracking**: New → Acknowledged → In Progress → Resolved
- **Priority Levels**: Critical, High, Medium, Low
- **Filtering**: By status, priority, search terms
- **Bulk Actions**: Acknowledge or resolve multiple alerts

### Statistics Dashboard
- Total alerts count
- Critical and high priority alerts
- Recent alerts (last 7 days)
- Status breakdown

### Integration
- Works with existing asset monitoring
- Shows patch alerts in main dashboard
- Integrates with existing alert system

## API Endpoints

### Check for Updates
```bash
POST /api/patch-registry/check-updates
```

### Get Alerts
```bash
GET /api/patch-registry/alerts
GET /api/patch-registry/alerts?status=New&priority=Critical
```

### Update Alert Status
```bash
PUT /api/patch-registry/alerts/:id
{
  "status": "Acknowledged",
  "notes": "Working on this update"
}
```

### Get Statistics
```bash
GET /api/patch-registry/statistics
```

## Troubleshooting

### Gemini API Issues
- Check your API key is correct and has sufficient quota
- Ensure the API key is in your `.env` file
- Monitor API usage in Google AI Studio

### Web Scraping Issues
- Some websites may block scraping
- The system will skip those and continue with others
- Check console logs for specific errors

### No Software Found
- Ensure your assets have software information
- Check that `software_info.software_list` is populated
- Run the agent to collect software data first

## Cost Considerations

### Gemini API Costs (Very Affordable!) 🎉
- **Input**: $0.00025 per 1K characters
- **Output**: $0.0005 per 1K characters
- **100 software checks**: ~$0.50-1.00
- **Daily checks**: ~$15-30/month
- **Much cheaper than OpenAI** (80-90% cost reduction)

### Optimization Tips
- Run checks during off-peak hours
- Limit to essential software only
- Use cached vendor information when possible

## Security Notes

### API Key Security
- Store your Gemini API key securely in environment variables
- Never commit API keys to version control
- Monitor API usage and set limits

### Web Scraping
- Respect robots.txt files
- Use reasonable delays between requests
- Don't overload vendor servers

## Customization

### Adding Custom Software
The system automatically detects software from your database. To add custom software:

1. Add software to your asset's `software_info.software_list`
2. Include `name`, `version`, and optionally `vendor`
3. Run the patch registry check

### Custom Vendor Detection
You can modify the `vendorDatabase` in `PatchRegistryService.js` to add custom vendor mappings for specific software.

### Version Comparison Logic
The system uses semantic versioning comparison:
- **1.2.3 < 1.2.4** → Update needed (patch)
- **1.2.3 < 1.3.0** → Update needed (minor)
- **1.2.3 < 2.0.0** → Update needed (major)
- **1.2.3 = 1.2.3** → Up to date
- **1.2.4 > 1.2.3** → Current is newer (no update needed)

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review server logs for Gemini API and web scraping errors
3. Ensure your database has software information
4. Check internet connectivity for web scraping
5. Verify your Gemini API key is working

## Next Steps

After setup, consider:
1. Setting up automated daily checks
2. Integrating with your existing alert system
3. Adding email notifications for critical updates
4. Creating deployment workflows for updates
