#!/bin/bash
set -e

echo "🎛️ Setting up Linux Control Deck..."

# Go to home directory
cd "$HOME"

# Clone if it doesn't exist, otherwise just pull
if [ -d "control-deck" ]; then
    echo "🔄 Existing directory found. Pulling latest changes..."
    cd control-deck
    git pull
else
    echo "📥 Cloning repository..."
    git clone https://github.com/Mohammad-JN21/Linux-Control-Deck.git control-deck
    cd control-deck
fi

# Install and build Client
echo "📦 Installing Client dependencies and building Vue app..."
cd client
npm install
npm run build
cd ..

# Install Server
echo "📦 Installing Server dependencies..."
cd server
npm install
cd ..

# Setup Systemd Service
echo "⚙️ Configuring background service (systemd)..."
mkdir -p "$HOME/.config/systemd/user"

SERVICE_FILE="$HOME/.config/systemd/user/control-deck.service"
cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=Linux Control Deck Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node $HOME/control-deck/server/server.js
WorkingDirectory=$HOME/control-deck/server
Restart=on-failure
RestartSec=5
Environment=PORT=3001

[Install]
WantedBy=default.target
EOF

# Reload and Enable Service
echo "🚀 Starting service and enabling on boot..."
systemctl --user daemon-reload
systemctl --user enable --now control-deck.service

echo "✅ All done! The Control Deck is now running live on Port 3001 in the background."
echo "You can check its status anytime with: systemctl --user status control-deck"
