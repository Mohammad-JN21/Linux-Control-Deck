#!/bin/bash
pkill -f steam_tv.sh

# TV (HDMI-A-1) @ 120Hz (2x Scale)
# Logical height is 1080. Start LG/HP at Y=1080.
# Logical width is 1920. Center over 4480: (4480 - 1920) / 2 = 1280.
kscreen-doctor output.DP-2.enable output.DP-2.mode.2560x1440@144 output.DP-2.position.0,1080 \
               output.DP-1.enable output.DP-1.mode.1920x1080@60 output.DP-1.position.2560,1080 \
               output.HDMI-A-1.enable output.HDMI-A-1.mode.3840x2160@120 output.HDMI-A-1.scale.2 output.HDMI-A-1.position.1280,0

sleep 1.5
kscreen-doctor output.DP-2.primary
echo "Desk Mode: 4K 120Hz (200% Scale) Applied."
