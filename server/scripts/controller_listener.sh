#!/bin/bash
# TRIGGER: Switch to TV Mode when a controller is detected

echo "Listening for controller connections..."

# Passive listener for input device additions
udevadm monitor --udev --subsystem-match=input | while read -r line; do
    # Check if the added device is a joystick (jsX)
    if echo "$line" | grep -q "add.*js"; then
        echo "Controller detected!"
        
        # Check if TV is already primary
        TV_IS_PRIMARY=$(kscreen-doctor -o | grep -A 5 "Output:.*HDMI-A-1" | grep -c "priority 1")
        
        if [ "$TV_IS_PRIMARY" -eq 0 ]; then
            # Automatically launch Steam in TV mode
            echo "Switching to Steam TV Mode..."
            bash /home/judi/control-deck/server/scripts/gaming_mode.sh
        fi
    fi
done
