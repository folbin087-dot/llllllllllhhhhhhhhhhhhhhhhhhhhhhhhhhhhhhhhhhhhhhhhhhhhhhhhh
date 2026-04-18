#!/bin/bash
#============================================
# PlaidCas Casino - Startup Script
# Domain: plaidcas.live
#============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "   PlaidCas Casino Startup Script"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${BLUE}[INFO]${NC} Node.js version: $(node --version)"
echo ""

# Determine package manager
if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
else
    echo -e "${RED}[ERROR]${NC} No package manager found (pnpm or npm)"
    exit 1
fi

echo -e "${BLUE}[INFO]${NC} Using package manager: $PKG_MANAGER"
echo ""

# Navigate to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo -e "${BLUE}[INFO]${NC} Working directory: $(pwd)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}[INFO]${NC} Installing dependencies..."
    $PKG_MANAGER install
    echo -e "${GREEN}[SUCCESS]${NC} Dependencies installed"
    echo ""
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}[WARNING]${NC} .env.local not found!"
    
    if [ -f "config.env" ]; then
        echo -e "${BLUE}[INFO]${NC} Copying config.env to .env.local..."
        cp config.env .env.local
        
        # Add additional required variables
        cat >> .env.local << 'EOF'

# ===========================================
# Site Configuration (Auto-generated)
# ===========================================
NEXT_PUBLIC_APP_URL=https://plaidcas.live
NEXT_PUBLIC_SITE_NAME=Plaid Casino
NEXTAUTH_URL=https://plaidcas.live
NEXTAUTH_SECRET=plaidcas-super-secret-key-2024-change-this

# Make admin IDs available to frontend
NEXT_PUBLIC_ADMIN_IDS=8181317905,8557654209
NEXT_PUBLIC_SUPER_ADMIN_IDS=159513461

# Make casino settings available to frontend
NEXT_PUBLIC_CASINO_TON_WALLET=UQBnNJLqapeBbFxuEYvhbueEqVnrhC3pxRyJf1PLOFqj1xIF

# ===========================================
# Database Configuration
# ===========================================
DATABASE_URL=postgresql://plaidcas_user:plaidcas_password@localhost:5432/plaidcas_db

# ===========================================
# PLAIDEX Payment API
# ===========================================
PLAIDEX_API_KEY=zR-rWu0wzfCdF2gz8iZeij4ReHmcidkkPIJetPjmhOk
PLAIDEX_API_SECRET=PRlqSQ3Lj4_Tak91dbfWbEVtORY3NPNc44t8c2n2jzm_gb7fjaao6JbpnWFbkw0LzCnPyNSxwpytyPjzrEW16w

# ===========================================
# Telegram Webhook
# ===========================================
TELEGRAM_WEBHOOK_URL=https://plaidcas.live/api/telegram/webhook

# ===========================================
# Production Settings
# ===========================================
NODE_ENV=production
PORT=3000

# ===========================================
# Security Settings
# ===========================================
JWT_SECRET=plaidcas-jwt-secret-key-2024-change-this
ENCRYPTION_KEY=plaidcas-encryption-key-32-chars-long
SESSION_SECRET=plaidcas-session-secret-2024

# ===========================================
# External APIs
# ===========================================
COINGECKO_API_KEY=your-coingecko-api-key-here
EXCHANGE_RATE_API_KEY=your-exchange-rate-api-key-here

# ===========================================
# Logging & Monitoring
# ===========================================
LOG_LEVEL=info
ENABLE_ANALYTICS=true
SENTRY_DSN=your-sentry-dsn-here
EOF
        
        echo -e "${GREEN}[SUCCESS]${NC} .env.local created from config.env"
    else
        echo -e "${BLUE}[INFO]${NC} Creating .env.local from template..."
        
        cat > .env.local << 'EOF'
# ===========================================
# PlaidCas Casino Configuration
# ===========================================

# Site Configuration
NEXT_PUBLIC_APP_URL=https://plaidcas.live
NEXT_PUBLIC_SITE_NAME=Plaid Casino
NEXTAUTH_URL=https://plaidcas.live
NEXTAUTH_SECRET=plaidcas-super-secret-key-2024-change-this

# ===========================================
# Telegram Bot Settings
# ===========================================
TELEGRAM_BOT_TOKEN=8782137962:AAHjWUffF6chhr11XRvh_D0YGWIfcse72t4
TELEGRAM_BOT_USERNAME=plaid_casino_bot
TELEGRAM_WEBHOOK_URL=https://plaidcas.live/api/telegram/webhook

# Admin Settings (comma-separated Telegram user IDs)
ADMIN_IDS=8181317905,8557654209
SUPER_ADMIN_IDS=159513461
NEXT_PUBLIC_ADMIN_IDS=8181317905,8557654209
NEXT_PUBLIC_SUPER_ADMIN_IDS=159513461

# ===========================================
# Casino Settings
# ===========================================
CASINO_NAME=Plaid Casino
MIN_BET=10
MAX_BET=500000
DEFAULT_BALANCE=0
HOUSE_EDGE=0.35
MAX_WIN_MULTIPLIER=100

# ===========================================
# Payment Settings
# ===========================================
# TON Wallet
CASINO_TON_WALLET=UQBnNJLqapeBbFxuEYvhbueEqVnrhC3pxRyJf1PLOFqj1xIF
NEXT_PUBLIC_CASINO_TON_WALLET=UQBnNJLqapeBbFxuEYvhbueEqVnrhC3pxRyJf1PLOFqj1xIF

# SBP Settings
SBP_PHONE_NUMBER=+79112328711
SBP_BANK_NAME=Т-банк
RUB_TO_TON_RATE=95.89

# Deposit Limits
MIN_DEPOSIT=50
MAX_DEPOSIT=50000

# PLAIDEX Payment API
PLAIDEX_API_KEY=zR-rWu0wzfCdF2gz8iZeij4ReHmcidkkPIJetPjmhOk
PLAIDEX_API_SECRET=PRlqSQ3Lj4_Tak91dbfWbEVtORY3NPNc44t8c2n2jzm_gb7fjaao6JbpnWFbkw0LzCnPyNSxwpytyPjzrEW16w

# TON Payment Webhook
TON_WEBHOOK_SECRET=mySuperKey4329012482

# ===========================================
# Feature Flags
# ===========================================
ENABLE_TON_PAYMENTS=true
ENABLE_SBP_PAYMENTS=true
ENABLE_BONUSES=true
ENABLE_REFERRALS=true
MAINTENANCE_MODE=false

# ===========================================
# Database Configuration
# ===========================================
DATABASE_URL=postgresql://plaidcas_user:plaidcas_password@localhost:5432/plaidcas_db

# ===========================================
# Production Settings
# ===========================================
NODE_ENV=production
PORT=3000

# ===========================================
# Security Settings
# ===========================================
JWT_SECRET=plaidcas-jwt-secret-key-2024-change-this
ENCRYPTION_KEY=plaidcas-encryption-key-32-chars-long
SESSION_SECRET=plaidcas-session-secret-2024

# ===========================================
# External APIs
# ===========================================
# CoinGecko for crypto rates
COINGECKO_API_KEY=your-coingecko-api-key-here

# Exchange rates
EXCHANGE_RATE_API_KEY=your-exchange-rate-api-key-here

# ===========================================
# Logging & Monitoring
# ===========================================
LOG_LEVEL=info
ENABLE_ANALYTICS=true
SENTRY_DSN=your-sentry-dsn-here
EOF
        
        echo -e "${GREEN}[SUCCESS]${NC} .env.local created - please edit with your values"
    fi
    echo ""
fi

# Function to display menu
show_menu() {
    echo ""
    echo "=========================================="
    echo " 🎰 PlaidCas Casino - Startup Menu"
    echo "=========================================="
    echo ""
    echo "  🌐 WEBSITE OPTIONS:"
    echo "  1. 🔥 Development mode (localhost:3000)"
    echo "  2. 🚀 Production build + start"
    echo "  3. ⚡ Production start only (already built)"
    echo "  4. 🔨 Build only"
    echo ""
    echo "  🤖 BOT + WEBSITE COMBO:"
    echo "  5. 🎯 START EVERYTHING (Bot + Website + Caddy)"
    echo "  6. 🛑 STOP EVERYTHING"
    echo ""
    echo "  🔧 CONFIGURATION & UTILS:"
    echo "  7. 📊 Database migration (run SQL)"
    echo "  8. 🔧 Start Caddy only (domain setup)"
    echo "  9. 🔍 Check services status"
    echo "  10. ⚙️ Check configuration"
    echo ""
    echo "  11. ❌ Exit"
    echo ""
    echo "  💡 TIP: Use option 5 to start bot + website on plaidcas.live domain!"
    echo ""
}

# Function to run development mode
run_dev() {
    echo ""
    echo -e "${BLUE}[INFO]${NC} Starting in development mode..."
    echo -e "${BLUE}[INFO]${NC} Server will be available at http://localhost:3000"
    echo -e "${BLUE}[INFO]${NC} Press Ctrl+C to stop"
    echo ""
    if [ "$PKG_MANAGER" = "npm" ]; then
        npx next dev --no-turbo
    else
        $PKG_MANAGER run dev
    fi
}

# Function to build and start
run_build_start() {
    echo ""
    echo -e "${BLUE}[INFO]${NC} Building for production..."
    if [ "$PKG_MANAGER" = "npm" ]; then
        npx next build --no-turbo
    else
        $PKG_MANAGER run build
    fi
    echo -e "${GREEN}[SUCCESS]${NC} Build completed"
    echo ""
    echo -e "${BLUE}[INFO]${NC} Starting production server..."
    echo -e "${BLUE}[INFO]${NC} Server will be available at http://localhost:3000"
    echo ""
    if [ "$PKG_MANAGER" = "npm" ]; then
        npx next start
    else
        $PKG_MANAGER run start
    fi
}

# Function to start production only
run_prod() {
    if [ ! -d ".next" ]; then
        echo -e "${RED}[ERROR]${NC} Production build not found!"
        echo -e "${BLUE}[INFO]${NC} Please run option 2 or 4 first"
        return
    fi
    echo ""
    echo -e "${BLUE}[INFO]${NC} Starting production server..."
    echo -e "${BLUE}[INFO]${NC} Server will be available at http://localhost:3000"
    echo ""
    if [ "$PKG_MANAGER" = "npm" ]; then
        npx next start
    else
        $PKG_MANAGER run start
    fi
}

# Function to build only
run_build() {
    echo ""
    echo -e "${BLUE}[INFO]${NC} Building for production..."
    if [ "$PKG_MANAGER" = "npm" ]; then
        npx next build --no-turbo
    else
        $PKG_MANAGER run build
    fi
    echo -e "${GREEN}[SUCCESS]${NC} Build completed"
    echo -e "${BLUE}[INFO]${NC} Run option 3 to start the server"
}

# Function to run migrations
run_migrate() {
    echo ""
    echo -e "${BLUE}[INFO]${NC} Running database migrations..."
    echo -e "${YELLOW}[WARNING]${NC} Make sure PostgreSQL is running and DATABASE_URL is configured"
    echo ""
    
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}[ERROR]${NC} psql not found. Please install PostgreSQL client tools."
        echo -e "${BLUE}[INFO]${NC} You can also run the SQL file manually:"
        echo "        scripts/001_init_database.sql"
        return
    fi
    
    if [ -f "scripts/001_init_database.sql" ]; then
        echo -e "${BLUE}[INFO]${NC} Running scripts/001_init_database.sql..."
        psql "$DATABASE_URL" -f scripts/001_init_database.sql
        echo -e "${GREEN}[SUCCESS]${NC} Migration completed"
    else
        echo -e "${RED}[ERROR]${NC} Migration file not found: scripts/001_init_database.sql"
    fi
}

# Function to start everything (Bot + Website + Caddy)
start_everything() {
    echo ""
    echo "🎯 STARTING EVERYTHING - Bot + Website + Caddy"
    echo "=========================================="
    echo ""
    
    # Check if Caddy is installed
    if ! command -v caddy &> /dev/null; then
        echo -e "${RED}[ERROR]${NC} Caddy is not installed!"
        echo -e "${BLUE}[INFO]${NC} Install Caddy from: https://caddyserver.com/download"
        echo -e "${BLUE}[INFO]${NC} Or run: curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg"
        return
    fi
    
    # Build if needed
    if [ ! -d ".next" ]; then
        echo -e "${BLUE}[INFO]${NC} 🔨 Building website first..."
        if [ "$PKG_MANAGER" = "npm" ]; then
            npx next build --no-turbo
        else
            $PKG_MANAGER run build
        fi
        echo -e "${GREEN}[SUCCESS]${NC} ✅ Build completed"
        echo ""
    fi
    
    # Start PM2 processes
    if ! command -v pm2 &> /dev/null; then
        echo -e "${BLUE}[INFO]${NC} 📦 Installing PM2..."
        npm install -g pm2
    fi
    
    echo -e "${BLUE}[INFO]${NC} 🚀 Starting website with PM2..."
    if [ "$PKG_MANAGER" = "npm" ]; then
        pm2 start "npx next start" --name "plaidcas-web"
    else
        pm2 start npm --name "plaidcas-web" -- start
    fi
    
    echo -e "${BLUE}[INFO]${NC} 🤖 Starting Telegram bot with PM2..."
    if [ -f "bot.js" ]; then
        pm2 start bot.js --name "plaidcas-bot"
    elif [ -f "telegram-bot.js" ]; then
        pm2 start telegram-bot.js --name "plaidcas-bot"
    else
        echo -e "${YELLOW}[WARNING]${NC} Bot file not found (bot.js or telegram-bot.js)"
        echo -e "${BLUE}[INFO]${NC} Please create your bot file and restart"
    fi
    
    echo -e "${BLUE}[INFO]${NC} 🌐 Starting Caddy server..."
    sudo caddy start --config Caddyfile
    
    pm2 save
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}[SUCCESS]${NC} 🎉 EVERYTHING IS RUNNING!"
    echo "=========================================="
    echo ""
    echo -e "${GREEN}✅ Website:${NC} https://plaidcas.live"
    echo -e "${GREEN}✅ Local:${NC}   http://localhost:3000"
    echo -e "${GREEN}✅ Bot:${NC}     Running in background"
    echo -e "${GREEN}✅ Caddy:${NC}   Handling SSL & domain"
    echo ""
    echo -e "${BLUE}[INFO]${NC} 📊 Check status with: pm2 status"
    echo -e "${BLUE}[INFO]${NC} 📋 View logs with: pm2 logs"
    echo -e "${BLUE}[INFO]${NC} 🔍 Caddy logs: sudo caddy logs"
    echo ""
}

# Function to stop everything
stop_everything() {
    echo ""
    echo "🛑 STOPPING EVERYTHING"
    echo "=========================================="
    echo ""
    
    if command -v pm2 &> /dev/null; then
        echo -e "${BLUE}[INFO]${NC} 🛑 Stopping PM2 processes..."
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
        echo -e "${GREEN}[SUCCESS]${NC} ✅ PM2 processes stopped"
    fi
    
    if command -v caddy &> /dev/null; then
        echo -e "${BLUE}[INFO]${NC} 🛑 Stopping Caddy..."
        sudo caddy stop 2>/dev/null || true
        echo -e "${GREEN}[SUCCESS]${NC} ✅ Caddy stopped"
    fi
    
    echo ""
    echo -e "${GREEN}[SUCCESS]${NC} 🎉 Everything stopped!"
    echo ""
}

# Function to start Caddy only
start_caddy() {
    echo ""
    echo -e "${BLUE}[INFO]${NC} 🌐 Starting Caddy server..."
    
    if ! command -v caddy &> /dev/null; then
        echo -e "${RED}[ERROR]${NC} Caddy is not installed!"
        echo -e "${BLUE}[INFO]${NC} Install from: https://caddyserver.com/download"
        return
    fi
    
    sudo caddy start --config Caddyfile
    echo ""
    echo -e "${GREEN}[SUCCESS]${NC} ✅ Caddy started!"
    echo -e "${BLUE}[INFO]${NC} Domain: https://plaidcas.live"
    echo -e "${BLUE}[INFO]${NC} Make sure your website is running on localhost:3000"
    echo ""
}

# Function to check configuration
check_config() {
    echo ""
    echo "🔍 CONFIGURATION CHECK"
    echo "=========================================="
    echo ""
    
    if [ -f ".env.local" ]; then
        echo -e "${GREEN}✅ .env.local found${NC}"
        
        # Check critical variables
        if grep -q "TELEGRAM_BOT_TOKEN=8782137962" .env.local; then
            echo -e "${GREEN}✅ Telegram bot token configured${NC}"
        else
            echo -e "${RED}❌ Telegram bot token not configured${NC}"
        fi
        
        if grep -q "CASINO_TON_WALLET=UQBnNJLqapeBbFxuEYvhbueEqVnrhC3pxRyJf1PLOFqj1xIF" .env.local; then
            echo -e "${GREEN}✅ TON wallet configured${NC}"
        else
            echo -e "${RED}❌ TON wallet not configured${NC}"
        fi
        
        if grep -q "ADMIN_IDS=8181317905,8557654209" .env.local; then
            echo -e "${GREEN}✅ Admin IDs configured${NC}"
        else
            echo -e "${RED}❌ Admin IDs not configured${NC}"
        fi
        
        if grep -q "plaidcas.live" .env.local; then
            echo -e "${GREEN}✅ Domain configured (plaidcas.live)${NC}"
        else
            echo -e "${RED}❌ Domain not configured${NC}"
        fi
        
    else
        echo -e "${RED}❌ .env.local not found${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}[INFO]${NC} Bot username: @plaid_casino_bot"
    echo -e "${BLUE}[INFO]${NC} Casino domain: https://plaidcas.live"
    echo -e "${BLUE}[INFO]${NC} Min bet: 10₽, Max bet: 500,000₽"
    echo -e "${BLUE}[INFO]${NC} TON payments: ✅ Enabled"
    echo -e "${BLUE}[INFO]${NC} SBP payments: ✅ Enabled (Т-банк)"
    echo ""
}

# Function to check services status
check_status() {
    echo ""
    echo "🔍 SERVICES STATUS"
    echo "=========================================="
    echo ""
    
    # Check PM2
    if command -v pm2 &> /dev/null; then
        echo -e "${BLUE}[PM2 PROCESSES]${NC}"
        pm2 status 2>/dev/null || echo "No PM2 processes running"
        echo ""
    fi
    
    # Check Caddy
    if command -v caddy &> /dev/null; then
        echo -e "${BLUE}[CADDY STATUS]${NC}"
        if sudo caddy list 2>/dev/null | grep -q "plaidcas.live"; then
            echo -e "${GREEN}✅ Caddy is running${NC}"
        else
            echo -e "${RED}❌ Caddy is not running${NC}"
        fi
        echo ""
    fi
    
    # Check if port 3000 is in use
    echo -e "${BLUE}[PORT 3000 STATUS]${NC}"
    if lsof -i :3000 &>/dev/null; then
        echo -e "${GREEN}✅ Something is running on port 3000${NC}"
    else
        echo -e "${RED}❌ Nothing running on port 3000${NC}"
    fi
    echo ""
    
    # Check domain connectivity
    echo -e "${BLUE}[DOMAIN CHECK]${NC}"
    if curl -s -o /dev/null -w "%{http_code}" https://plaidcas.live | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✅ plaidcas.live is accessible${NC}"
    else
        echo -e "${RED}❌ plaidcas.live is not accessible${NC}"
    fi
    echo ""
}

# Main loop
while true; do
    show_menu
    read -p "Enter choice (1-11): " choice
    
    case $choice in
        1) run_dev ;;
        2) run_build_start ;;
        3) run_prod ;;
        4) run_build ;;
        5) start_everything ;;
        6) stop_everything ;;
        7) run_migrate ;;
        8) start_caddy ;;
        9) check_status ;;
        10) check_config ;;
        11) 
            echo ""
            echo "👋 Goodbye!"
            exit 0 
            ;;
        *)
            echo -e "${RED}[ERROR]${NC} Invalid choice"
            ;;
    esac
done