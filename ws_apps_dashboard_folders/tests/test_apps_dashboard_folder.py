from odoo import api, fields, models


class TestAppsDashboardFolder(models.TransactionCase):

    def test_folder_creation_and_member_storage(self):
        folder = self.env['ws_apps_dashboard.folder'].create({
            'name': 'Daily Work',
            'user_id': self.env.user.id,
            'menu_ids': [1],
        })
        self.assertTrue(folder)
        self.assertEqual(folder.name, 'Daily Work')
        self.assertIn(1, folder.menu_ids.ids)
