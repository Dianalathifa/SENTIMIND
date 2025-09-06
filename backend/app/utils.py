from .models import AdminLog
from . import db

def add_admin_log(admin_id, action, description=None):
    try:
        log = AdminLog(admin_id=admin_id, action=action, description=description)
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"[ERROR] Gagal menyimpan log admin: {e}")

