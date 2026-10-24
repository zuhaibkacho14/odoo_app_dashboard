from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class AppsDashboardFolder(models.Model):
    _name = 'ws_apps_dashboard.folder'
    _description = 'Apps Dashboard Folder'
    _order = 'sequence, id'

    name = fields.Char(string='Folder name', required=True, trim=True)
    user_id = fields.Many2one(
        'res.users',
        string='User',
        required=True,
        default=lambda self: self.env.user,
        ondelete='cascade',
    )
    menu_ids = fields.Many2many(
        'ir.ui.menu',
        'ws_apps_dashboard_folder_ir_ui_menu_rel',
        'folder_id',
        'menu_id',
        string='Applications',
    )
    sequence = fields.Integer(default=10, string='Sequence')
    color = fields.Char(default='#F2F4F8')
    active = fields.Boolean(default=True)

    _sql_constraints = [
        (
            'folder_name_unique_per_user',
            'UNIQUE(user_id, name)',
            _('A folder name must be unique per user.'),
        ),
    ]

    @api.model
    def _sanitize_name(self, value):
        name = (value or '').strip()
        if not name:
            raise ValidationError(_('Folder name cannot be empty.'))
        name = name[:60]
        if not name.strip():
            raise ValidationError(_('Folder name cannot be empty.'))
        return name

    @api.constrains('name')
    def _check_name(self):
        for record in self:
            record.name = record._sanitize_name(record.name)

    @api.model
    def get_user_state(self):
        folders = self.search_read(
            [('user_id', '=', self.env.uid), ('active', '=', True)],
            ['id', 'name', 'sequence', 'color', 'menu_ids'],
        )
        for folder in folders:
            folder['menu_ids'] = [menu_id for menu_id in folder.get('menu_ids', [])]
        return {'folders': folders}

    @api.model
    def save_user_state(self, payload):
        payload = payload or []
        folder_ids = []

        for item in payload:
            folder_id = item.get('id')
            name = self._sanitize_name(item.get('name'))
            menu_ids = item.get('menu_ids') or []
            if folder_id:
                folder = self.browse(folder_id).filtered(lambda f: f.user_id == self.env.user)
                if not folder:
                    continue
                folder.write({'name': name, 'menu_ids': [(6, 0, [])]})
            else:
                folder = self.create({'name': name, 'user_id': self.env.user.id})
            valid_menu_ids = self.env['ir.ui.menu'].search([
                ('id', 'in', menu_ids),
                ('id', 'in', self.env.user._get_app_menus().ids),
            ]).ids
            if folder_id:
                folder.write({'menu_ids': [(6, 0, valid_menu_ids)]})
            else:
                folder.menu_ids = [(6, 0, valid_menu_ids)]
            folder_ids.append(folder.id)

        stale_folders = self.search([('user_id', '=', self.env.user.id), ('id', 'not in', folder_ids)])
        stale_folders.write({'active': False})

        return {'ok': True}

    @api.model
    def ensure_menu_in_folders(self, menu_id):
        folder = self.search([
            ('user_id', '=', self.env.user.id),
            ('menu_ids', 'in', menu_id),
            ('active', '=', True),
        ], limit=1)
        return bool(folder)
