{
    'name': 'Apps Dashboard Folders',
    'version': '18.0.1.0.0',
    'category': 'Tools',
    'summary': 'Organize Odoo application tiles into folders inside the existing Apps dashboard',
    'license': 'LGPL-3',
    'author': 'Your Company',
    'website': 'https://www.example.com',
    'depends': ['web'],
    'data': [
        'security/ir.model.access.csv',
    ],
    'assets': {
        'web.assets_backend': [
            'ws_apps_dashboard_folders/static/src/js/apps_dashboard_folders.js',
            'ws_apps_dashboard_folders/static/src/xml/apps_dashboard_folders.xml',
            'ws_apps_dashboard_folders/static/src/scss/apps_dashboard_folders.scss',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
}
