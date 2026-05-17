#!/bin/bash
pkill -9 steam
sleep 1

# Enable TV and make it primary FIRST, then disable DP-1 and DP-2
kscreen-doctor output.HDMI-A-1.enable \
               output.HDMI-A-1.mode.3840x2160@120 \
               output.HDMI-A-1.scale.1 \
               output.HDMI-A-1.position.0,0 \
               output.HDMI-A-1.primary \
               output.DP-1.disable \
               output.DP-2.disable

setsid steam -bigpicture >/dev/null 2>&1 &
echo "Steam Mode: TV 4K 120Hz."
