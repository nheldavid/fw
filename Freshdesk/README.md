# Fleurop Freshdesk App - Order Information Sidebar

A Freshworks App that displays SAP order information in the Freshdesk ticket sidebar, built with the Crayons Design System for Platform 3.0.

## 🚀 Quick Start Guide

### 1. Install FDK CLI

```bash
npm install -g https://cdn.freshdev.io/fdk/latest.tgz
```

### 2. Enable Global Apps Support

```bash
fdk config set global_apps.enabled true
```

### 3. Run the App Locally

```bash
# Navigate to this project folder
cd /path/to/this/app

# Start the development server
fdk run
```

The app will start on `http://localhost:10001`

### 4. Test in Freshdesk

1. **Open your Freshdesk instance** in a web browser
2. **Navigate to any ticket** (create one if needed)
3. **Add `?dev=true` to the URL**
   - Example: `https://your-domain.freshdesk.com/a/tickets/123?dev=true`
4. **Look at the right sidebar** - you should see the Fleurop app

### 5. Test with Mock Data (Optional)

To test the app with sample data without Freshdesk:

```bash
# Open in browser with development mode
http://localhost:10001/index.html?dev=true
```

## 📋 Custom Fields Setup (Required for Live Data)

For the app to work with real ticket data, configure these custom fields in Freshdesk:

1. Go to **Admin > Ticket Fields** in your Freshdesk
2. Create these custom fields:

| Field Name | Field Key | Type | Options |
|------------|-----------|------|---------|
| Customer Name | `cf_customer_name` | Single line text | - |
| Order Number | `cf_order_number` | Single line text | - |
| Delivery Date | `cf_delivery_date` | Date | - |
| Order Status | `cf_order_status` | Dropdown | Pending, Processing, Shipped, Delivered, Cancelled |

## 🎯 What You'll See

The app displays:
- **Customer Name** (from custom field or ticket requester)
- **Order Number** (from custom field or ticket ID)
- **Delivery Date** (from custom field)
- **Order Status** (from custom field with color coding)

## 🔧 Development Mode

- **With `?dev=true`**: Shows mock data for testing
- **Without `?dev=true`**: Uses real Freshdesk ticket data

## 📦 Deploy to Production

When ready to install permanently:

```bash
# Package the app
fdk pack

# Install to your Freshdesk instance
fdk install
```

## 🆘 Troubleshooting

**App not showing in sidebar?**
- Make sure you added `?dev=true` to the URL
- Check that `fdk run` is still running
- Verify Global Apps is enabled: `fdk config set global_apps.enabled true`

**No data showing?**
- In dev mode: Should show mock data automatically
- In live mode: Check custom fields are configured correctly

**FDK command not found?**
- Reinstall: `npm install -g https://cdn.freshdev.io/fdk/latest.tgz`
- Check Node.js version (requires 18.x)

## 📁 Project Structure

```
app/
├── index.html          # Main UI with Crayons components
├── scripts/app.js      # Application logic
├── styles/
│   ├── style.css       # Custom styles
│   └── images/icon.svg # App icon
└── manifest.json       # App configuration
```

## 🎨 Built With

- **Freshworks App SDK 3.0**
- **Crayons Design System** (Freshworks UI components)
- **Vanilla JavaScript** (no frameworks required)

---

**Need help?** Check the browser console for detailed logs when testing with `?dev=true`.
