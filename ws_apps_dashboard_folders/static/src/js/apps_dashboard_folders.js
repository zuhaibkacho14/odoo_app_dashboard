(function () {
    const STORAGE_KEY = 'ws_apps_dashboard_folders_state';
    const FOLDER_TEMPLATE = `
        <div class="ws_apps_dashboard_folder_tile" draggable="true" data-role="folder">
            <div class="ws_apps_dashboard_folder_icon">
                <i class="fa fa-folder" aria-hidden="true"></i>
            </div>
            <div class="ws_apps_dashboard_folder_body">
                <div class="ws_apps_dashboard_folder_name">Folder</div>
                <div class="ws_apps_dashboard_folder_count">0 apps</div>
            </div>
        </div>
    `;

    function normalizeState(state) {
        const folders = Array.isArray(state && state.folders) ? state.folders : [];
        return {
            folders: folders.map((folder) => ({
                id: folder.id || null,
                name: String(folder.name || 'Folder').trim() || 'Folder',
                menu_ids: Array.isArray(folder.menu_ids) ? folder.menu_ids : [],
                sequence: Number(folder.sequence || 0),
                color: folder.color || '#F2F4F8',
            })),
        };
    }

    function getAppMenuContainer() {
        return (
            document.querySelector('.o_navbar_apps_menu .o-dropdown--menu') ||
            document.querySelector('.o_navbar_apps_menu .dropdown-menu') ||
            document.querySelector('.o_navbar_apps_menu .o_dropdown_menu') ||
            document.querySelector('.o_app_menu') ||
            document.querySelector('.o_main_navbar .o-dropdown--menu') ||
            document.querySelector('.o_apps_menu') ||
            document.querySelector('.o_menu_apps') ||
            document.querySelector('.o_menu')
        );
    }

    function getMenuData() {
        const menuService = window.odoo && window.odoo.menuService;
        if (menuService && typeof menuService.getApps === 'function') {
            return menuService.getApps();
        }
        return [];
    }

    function getAppIdFromNode(node) {
        if (!(node instanceof HTMLElement)) {
            return null;
        }
        const raw =
            node.dataset.menuId ||
            node.dataset.appId ||
            node.getAttribute('data-menu-id') ||
            node.getAttribute('data-app-id');
        return raw ? Number(raw) || raw : null;
    }

    function folderContainsApp(folder, appId) {
        return (folder.menu_ids || []).includes(appId);
    }

    function getFolderAppLabels(folder, appMap) {
        return (folder.menu_ids || [])
            .map((menuId) => appMap.get(menuId))
            .filter(Boolean)
            .map((item) => item.label || item.name || 'App');
    }

    function saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to persist app folders state', e);
        }

        if (window.odoo && window.odoo.rpc) {
            window.odoo.rpc({
                model: 'ws_apps_dashboard.folder',
                method: 'save_user_state',
                args: [state.folders],
            }).catch((err) => {
                console.warn('Failed to save folder state to server', err);
            });
        }
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return normalizeState(raw ? JSON.parse(raw) : { folders: [] });
        } catch (e) {
            return { folders: [] };
        }
    }

    function renderFolders(container, folders, appMap) {
        const existing = container.querySelectorAll('[data-folder-tile="true"]');
        existing.forEach((node) => node.remove());

        if (!folders.length) {
            return;
        }

        folders.forEach((folder) => {
            const tile = document.createElement('div');
            tile.className = 'ws_apps_dashboard_folder_tile';
            tile.setAttribute('data-folder-tile', 'true');
            tile.draggable = true;
            tile.dataset.folderId = folder.id || `tmp-${Math.random().toString(16).slice(2)}`;
            tile.innerHTML = `
                <div class="ws_apps_dashboard_folder_icon">
                    <i class="fa fa-folder" aria-hidden="true"></i>
                </div>
                <div class="ws_apps_dashboard_folder_body">
                    <div class="ws_apps_dashboard_folder_name">${(folder.name || 'Folder').replace(/</g, '&lt;')}</div>
                    <div class="ws_apps_dashboard_folder_count">${(folder.menu_ids || []).length} apps</div>
                </div>
            `;

            const labels = getFolderAppLabels(folder, appMap);
            if (labels.length) {
                const preview = document.createElement('div');
                preview.className = 'ws_apps_dashboard_folder_preview';
                preview.textContent = labels.slice(0, 3).join(', ');
                tile.appendChild(preview);
            }

            tile.addEventListener('click', (event) => {
                if (event.target.closest('.ws_apps_dashboard_folder_tile')) {
                    openFolderOverlay(folder, appMap);
                }
            });

            tile.addEventListener('dragstart', (event) => {
                event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'folder', folderId: tile.dataset.folderId }));
                event.dataTransfer.effectAllowed = 'move';
            });

            tile.addEventListener('dragover', (event) => {
                event.preventDefault();
                tile.classList.add('ws_apps_dashboard_folder_tile--drag-over');
            });

            tile.addEventListener('dragleave', () => {
                tile.classList.remove('ws_apps_dashboard_folder_tile--drag-over');
            });

            tile.addEventListener('drop', (event) => {
                event.preventDefault();
                tile.classList.remove('ws_apps_dashboard_folder_tile--drag-over');
                const payload = event.dataTransfer.getData('text/plain');
                try {
                    const data = JSON.parse(payload);
                    if (data.type === 'app' && data.menuId) {
                        addAppToFolder(folder, data.menuId);
                    }
                } catch (e) {}
            });

            container.appendChild(tile);
        });
    }

    function getAppMap() {
        const apps = getMenuData();
        const map = new Map();
        apps.forEach((app) => {
            const key = app.id || app.menuID || app.actionID;
            if (key !== undefined && key !== null) {
                map.set(Number(key) || key, app);
            }
        });
        return map;
    }

    function listStandaloneApps() {
        const container = getAppMenuContainer();
        if (!container) {
            return [];
        }
        return Array.from(container.querySelectorAll('.o_app, .o-dropdown-item, .dropdown-item, .o_menu_item'))
            .filter((node) => node && !node.closest('[data-folder-tile="true"]'));
    }

    function hideAppsInFolders(apps, folders) {
        const hiddenMenuIds = new Set();
        folders.forEach((folder) => {
            (folder.menu_ids || []).forEach((menuId) => hiddenMenuIds.add(menuId));
        });

        apps.forEach((node) => {
            const menuId = getAppIdFromNode(node);
            if (menuId && hiddenMenuIds.has(Number(menuId) || menuId)) {
                node.style.display = 'none';
            } else {
                node.style.display = '';
            }
        });
    }

    function ensureFolderOverlay() {
        let overlay = document.getElementById('ws_apps_dashboard_folder_overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ws_apps_dashboard_folder_overlay';
            overlay.className = 'ws_apps_dashboard_folder_overlay hidden';
            overlay.innerHTML = `
                <div class="ws_apps_dashboard_folder_panel">
                    <div class="ws_apps_dashboard_folder_panel_header">
                        <h3>Folder</h3>
                        <button type="button" class="ws_apps_dashboard_folder_close">Close</button>
                    </div>
                    <div class="ws_apps_dashboard_folder_panel_content"></div>
                </div>
            `;
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    overlay.classList.add('hidden');
                }
            });
            overlay.querySelector('.ws_apps_dashboard_folder_close').addEventListener('click', () => {
                overlay.classList.add('hidden');
            });
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    function openFolderOverlay(folder, appMap) {
        const overlay = ensureFolderOverlay();
        const content = overlay.querySelector('.ws_apps_dashboard_folder_panel_content');
        content.innerHTML = '';

        const apps = (folder.menu_ids || [])
            .map((menuId) => appMap.get(Number(menuId) || menuId))
            .filter(Boolean);

        if (!apps.length) {
            content.innerHTML = '<div class="ws_apps_dashboard_folder_empty">This folder is empty.</div>';
        } else {
            apps.forEach((app) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'ws_apps_dashboard_folder_item';
                button.innerHTML = `
                    <span class="ws_apps_dashboard_folder_item_icon">${app.webIcon ? app.webIcon.icon || '▣' : '▣'}</span>
                    <span>${(app.label || app.name || 'App').replace(/</g, '&lt;')}</span>
                `;
                button.addEventListener('click', () => {
                    if (app.href) {
                        window.location.href = app.href;
                    }
                });
                content.appendChild(button);
            });
        }

        overlay.classList.remove('hidden');
    }

    function addAppToFolder(folder, menuId) {
        const state = loadState();
        const normalized = normalizeState(state);
        const target = normalized.folders.find((item) => (item.id || item.name) === folder.id || item.name === folder.name);
        const folderEntry = target || normalized.folders[0];
        if (!folderEntry) {
            return;
        }

        if (!folderEntry.menu_ids.includes(menuId)) {
            folderEntry.menu_ids.push(menuId);
        }

        saveState(normalized);
        refreshDashboard();
    }

    function createFolderFromDrop(targetMenuId, sourceMenuId) {
        if (sourceMenuId === targetMenuId) {
            return;
        }

        const state = loadState();
        const normalized = normalizeState(state);
        const folderName = `Folder ${normalized.folders.length + 1}`;
        const newFolder = {
            id: `temp-${Date.now()}`,
            name: folderName,
            menu_ids: [sourceMenuId, targetMenuId],
            sequence: normalized.folders.length,
            color: '#F2F4F8',
        };
        normalized.folders.push(newFolder);
        saveState(normalized);
        refreshDashboard();
    }

    function refreshDashboard() {
        const container = getAppMenuContainer();
        if (!container) {
            return;
        }

        const appMap = getAppMap();
        const state = loadState();
        const normalized = normalizeState(state);
        const appNodes = listStandaloneApps();
        hideAppsInFolders(appNodes, normalized.folders);
        renderFolders(container, normalized.folders, appMap);

        const folderNodes = container.querySelectorAll('[data-folder-tile="true"]');
        folderNodes.forEach((node) => {
            node.style.order = '999';
        });
        appNodes.forEach((node) => {
            node.style.order = '';
        });

        const appNodesAfter = Array.from(container.querySelectorAll('.o_app, .o-dropdown-item, .dropdown-item, .o_menu_item'));
        appNodesAfter.forEach((node) => {
            if (!node.closest('[data-folder-tile="true"]')) {
                const menuId = getAppIdFromNode(node);
                const assignedToFolder = normalized.folders.some((folder) => folder.menu_ids.includes(Number(menuId) || menuId));
                if (assignedToFolder) {
                    node.style.display = 'none';
                }
            }
        });
    }

    function initDragAndDrop() {
        const container = getAppMenuContainer();
        if (!container) {
            return;
        }

        const appNodes = Array.from(container.querySelectorAll('.o_app, .o-dropdown-item, .dropdown-item, .o_menu_item'));
        appNodes.forEach((node) => {
            node.draggable = true;
            node.addEventListener('dragstart', (event) => {
                const menuId = getAppIdFromNode(node);
                event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'app', menuId }));
                event.dataTransfer.effectAllowed = 'move';
            });

            node.addEventListener('dragover', (event) => {
                event.preventDefault();
                node.classList.add('ws_apps_dashboard_drag_over');
            });

            node.addEventListener('dragleave', () => {
                node.classList.remove('ws_apps_dashboard_drag_over');
            });

            node.addEventListener('drop', (event) => {
                event.preventDefault();
                node.classList.remove('ws_apps_dashboard_drag_over');
                try {
                    const payload = JSON.parse(event.dataTransfer.getData('text/plain'));
                    if (payload.type === 'app' && payload.menuId) {
                        const targetMenuId = getAppIdFromNode(node);
                        if (targetMenuId && payload.menuId !== targetMenuId) {
                            createFolderFromDrop(targetMenuId, payload.menuId);
                        }
                    }
                } catch (e) {}
            });
        });
    }

    function bindDashboard() {
        const container = getAppMenuContainer();
        if (!container) {
            return;
        }

        initDragAndDrop();
        refreshDashboard();
    }

    function observeDashboard() {
        const observer = new MutationObserver(() => {
            bindDashboard();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    if (typeof window !== 'undefined') {
        window.wsAppsDashboardFolders = {
            loadState,
            saveState,
            refreshDashboard,
        };
        setTimeout(() => {
            bindDashboard();
            observeDashboard();
        }, 300);
    }
})();
