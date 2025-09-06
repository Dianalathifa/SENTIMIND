from app import create_app, db
from app.models import Admin
from werkzeug.security import generate_password_hash

app = create_app()
app.app_context().push()

username = 'admin1'
password = '123456'

admin = Admin.query.filter_by(username=username).first()
if not admin:
    admin = Admin(username=username)

admin.password_hash = generate_password_hash(password)
db.session.add(admin)
db.session.commit()

print("Password hash updated for admin:", username)
