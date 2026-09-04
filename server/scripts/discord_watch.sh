#!/bin/bash
# TV 2K@120Hz Primary, others active below to prevent overlap
kscreen-doctor output.HDMI-A-1.enable output.HDMI-A-1.mode.2560x1440@120 output.HDMI-A-1.scale.1 output.HDMI-A-1.position.0,0 output.HDMI-A-1.primary \
               output.DP-3.enable output.DP-3.mode.2560x1440@144 output.DP-3.position.0,1440

sleep 1

cat << 'EOF' > /tmp/discord_mover.js
var clients = workspace.windowList();
for (var i=0; i<clients.length; i++) {
    var c = clients[i];
    if (String(c.resourceClass).toLowerCase().indexOf("discord") !== -1) {
        c.fullScreen = false;
        c.setMaximize(false, false);
        var nx = 100;
        var ny = 100;
        var nw = 800;
        var nh = 600;
        if (typeof c.moveResize === 'function') {
            c.moveResize({x: nx, y: ny, width: nw, height: nh});
        } else {
            c.frameGeometry = {x: nx, y: ny, width: nw, height: nh};
            if (typeof c.resize === 'function') c.resize(nw, nh);
            if (typeof c.move === 'function') c.move(nx, ny);
        }
        c.setMaximize(true, true);
    }
}
EOF
qdbus6 org.kde.KWin /Scripting org.kde.kwin.Scripting.loadScript "/tmp/discord_mover.js" "discordmover"
qdbus6 org.kde.KWin /Scripting org.kde.kwin.Scripting.start
qdbus6 org.kde.KWin /Scripting org.kde.kwin.Scripting.unloadScript "discordmover"

# Dynamically swap GPU Screen Recorder to the TV (HDMI-A-1)
sed -i 's/^replay.record_options.record_area_option.*/replay.record_options.record_area_option HDMI-A-1/' /home/judi/.config/gpu-screen-recorder/config_ui
pkill -9 gpu-screen-recorder
pkill -9 gsr-ui
setsid gsr-ui launch-hide-announce >/dev/null 2>&1 &

echo "Discord Watch Mode (2K) Applied."
