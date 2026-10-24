# Odoo Apps Dashboard Folders

This module adds user-personal app folders directly inside the existing Odoo Apps dashboard.

## Features

- Create folders by dragging one app onto another.
- Open a folder from the dashboard grid.
- Move apps into and out of folders.
- Rename and manage folder names.
- Persist organization per user.
- Keep the standard Odoo apps navigation unchanged.

## Structure

- `ws_apps_dashboard_folders/__init__.py`
- `ws_apps_dashboard_folders/__manifest__.py`
- `ws_apps_dashboard_folders/models/apps_dashboard_folder.py`
- `ws_apps_dashboard_folders/security/ir.model.access.csv`
- `ws_apps_dashboard_folders/static/src/js/apps_dashboard_folders.js`
- `ws_apps_dashboard_folders/static/src/xml/apps_dashboard_folders.xml`
- `ws_apps_dashboard_folders/static/src/scss/apps_dashboard_folders.scss`

## Installation

1. Place the module in your Odoo addons path.
2. Restart Odoo.
3. Update the apps list.
4. Install `Apps Dashboard Folders`.
5. Open the app dashboard and drag apps together to create a folder.

## Notes

This module is designed for the public Odoo 18 app-menu structure and should be validated on a real Odoo 18 Enterprise instance before production use. The code is implemented as a targeted frontend extension to the existing app dashboard and does not replace the standard app interface.
