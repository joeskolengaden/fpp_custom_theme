#!/bin/bash

# fpp-plugin-Template install script

# FPP runs this (via sudo) after every fresh install AND after every
# "Update Now" in Plugin Manager (see api/controllers/plugin.php ->
# UpgradePlugin()). Only FPP's actual config directory
# (/home/fpp/media/config) is ever auto-loaded as custom.css/custom.js or
# served to custom.js's discoverSkins() via GET /api/configfile — files
# just sitting in this plugin's own themes/winterlights/ folder are
# invisible to FPP until copied there, which previously required a manual
# upload through this plugin's own Content Setup page after every update.
# This closes that gap: it runs automatically, touches nothing outside
# CONFIG_DIR, and only ever copies files this repo's own theme folder.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THEME_DIR="$SCRIPT_DIR/themes/winterlights"
CONFIG_DIR="/home/fpp/media/config"

if [ -d "$THEME_DIR" ] && [ -d "$CONFIG_DIR" ]; then
    cp -f "$THEME_DIR"/*.css "$CONFIG_DIR"/ 2>/dev/null
    cp -f "$THEME_DIR"/*.js  "$CONFIG_DIR"/ 2>/dev/null
    chown fpp:fpp "$CONFIG_DIR"/custom.css "$CONFIG_DIR"/custom.js "$CONFIG_DIR"/wl-picker.css "$CONFIG_DIR"/wl-skin-*.css 2>/dev/null
fi
