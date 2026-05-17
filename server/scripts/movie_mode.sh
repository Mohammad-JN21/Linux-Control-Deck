#!/bin/bash
pkill -f steam_tv.sh

# LG (DP-2) @ 144Hz | HP (DP-1) @ 60Hz | TV (HDMI-A-1) @ 120Hz
# TV Centered at X=320, LG/HP start at Y=2160
kscreen-doctor output.DP-2.enable output.DP-2.mode.2560x1440@144 output.DP-2.position.0,2160 \
               output.DP-1.enable output.DP-1.mode.1920x1080@60 output.DP-1.position.2560,2160 \
               output.HDMI-A-1.enable output.HDMI-A-1.mode.3840x2160@120 output.HDMI-A-1.scale.1 output.HDMI-A-1.position.320,0

sleep 1.5
kscreen-doctor output.DP-2.primary
echo "Movie Mode: 4K 120Hz (100% Scale) Applied."
