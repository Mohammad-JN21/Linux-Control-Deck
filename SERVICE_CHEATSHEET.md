# Control Deck Service Cheatsheet

The Control Deck runs as a background "user service" using Linux's `systemd`. This means it will automatically start when your user logs in, and it will automatically restart if it crashes.

You can manage this service directly from your Linux terminal using the `systemctl` command.

## 🟢 Start the Service
If the service is stopped and you want to turn it on:
```bash
systemctl --user start control-deck.service
```

## 🔴 Stop the Service
If you want to turn the deck completely off (it will remain off until you start it again or reboot):
```bash
systemctl --user stop control-deck.service
```

## 🔄 Restart the Service
If you made changes to the code or just want to reboot the backend:
```bash
systemctl --user restart control-deck.service
```

## 📊 Check the Status
If you want to see if it's currently running, what its process ID is, and memory usage:
```bash
systemctl --user status control-deck.service
```
*(Press `q` to exit the status view)*

## 📜 View the Logs
If you want to see the live console output (errors, connections, socket messages):
```bash
journalctl --user -fu control-deck.service
```
* `-f` follows the logs live (like `tail -f`).
* `-u` targets our specific unit/service.
*(Press `Ctrl+C` to stop watching the logs)*

---

### How to update the code in the future:
If you ever edit the Vue (`.vue`) files in the `client` folder, you must rebuild the frontend for the changes to show up on port 3001:

1. Open your terminal.
2. Go to the client folder:
   ```bash
   cd /home/judi/.gemini/antigravity/scratch/control-deck/client
   ```
3. Build the frontend:
   ```bash
   npm run build
   ```
4. Restart the service so the backend picks up the new files:
   ```bash
   systemctl --user restart control-deck.service
   ```
