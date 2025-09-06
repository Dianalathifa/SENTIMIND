import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from .models import Admin, AdminLog # Pastikan AdminLog diimpor jika digunakan di utils.py
from .utils import add_admin_log
from . import db

main = Blueprint("main", __name__, url_prefix="/api/admin")

# Setup logger khusus untuk blueprint ini
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)  # Bisa diubah sesuai kebutuhan

# Jika belum ada handler, buat handler untuk file dan console
if not logger.hasHandlers():
    file_handler = logging.FileHandler("logs/admin.log")
    formatter = logging.Formatter('%(asctime)s %(levelname)s: %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

@main.route("/", methods=["GET"])
@jwt_required()
def get_admins():
    auth_header = request.headers.get("Authorization")
    logger.info(f"Authorization header: {auth_header}")

    current_user = get_jwt_identity()
    logger.info(f"Current user from token: {current_user}")

    admins = Admin.query.all()
    admins_list = []

    for admin in admins:
        pw_hash = admin.password_hash or ""
        # Sensor password hash agar tidak tampil full
        if len(pw_hash) > 12:
            pw_hash_sensored = pw_hash[:6] + '***' + pw_hash[-6:]
        else:
            pw_hash_sensored = pw_hash

        admins_list.append({
            "id": admin.id,
            "username": admin.username,
            "email": admin.email, # Tambahkan email ke response
            "password_hash": pw_hash_sensored,
        })

    logger.info(f"Get admins berhasil, total: {len(admins_list)}")
    return jsonify(admins_list), 200

@main.route("/all", methods=["GET"])
def get_admins_public():
    admins = Admin.query.all()
    admins_list = []
    for admin in admins:
        pw_hash = admin.password_hash or ""
        pw_hash_sensored = (pw_hash[:6] + '***' + pw_hash[-6:]) if len(pw_hash) > 12 else pw_hash
        admins_list.append({
            "id": admin.id,
            "username": admin.username,
            "email": admin.email, # Tambahkan email ke response
            "password_hash": pw_hash_sensored,
        })

    logger.info(f"[Public] Get all admins berhasil, total: {len(admins_list)}")
    return jsonify(admins_list), 200

@main.route("/register", methods=["POST"])
def register_admin():
    data = request.get_json()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip() # Ambil email dari request
    password = data.get("password", "").strip()

    if not username or not email or not password: # Validasi email
        logger.warning("Register gagal: username, email, atau password kosong")
        return jsonify({"error": "Username, email, dan password wajib diisi"}), 400

    if Admin.query.filter_by(username=username).first():
        logger.warning(f"Register gagal: username sudah dipakai - {username}")
        return jsonify({"error": "Username sudah digunakan"}), 409

    if Admin.query.filter_by(email=email).first(): # Cek email sudah digunakan
        logger.warning(f"Register gagal: email sudah dipakai - {email}")
        return jsonify({"error": "Email sudah digunakan"}), 409

    new_admin = Admin(username=username, email=email) # Inisialisasi Admin dengan email
    new_admin.set_password(password)
    db.session.add(new_admin)
    db.session.commit()

    logger.info(f"Admin baru berhasil didaftarkan: {username} ({email})")
    return jsonify({"message": "✅ Admin berhasil didaftarkan"}), 201


@main.route("/login", methods=["POST"])
def login_admin():
    data = request.get_json()
    # Anda bisa memilih login dengan username atau email. Saya contohkan dengan username.
    # Jika ingin dengan email, ganti "username" dengan "email" di sini dan query filter.
    username_or_email = data.get("username") or data.get("email")
    password = data.get("password")

    logger.info(f"Percobaan login admin: {username_or_email}")

    # Mencari admin berdasarkan username atau email
    admin = Admin.query.filter((Admin.username == username_or_email) | (Admin.email == username_or_email)).first()
    
    if admin:
        password_check = admin.check_password(password)
        logger.info(f"Admin ditemukan: {admin.username} ({admin.email}), password valid: {password_check}")
    else:
        logger.warning(f"Admin tidak ditemukan: {username_or_email}")
        password_check = False

    if admin and password_check:
        token = create_access_token(identity=str(admin.id))  # identity harus string
        logger.info(f"Login berhasil: {admin.username} (ID: {admin.id})")

        # Tambahkan log ke database
        add_admin_log(
            admin_id=admin.id,
            action="login",
            description=f"Admin {admin.username} berhasil login."
        )
        
        return jsonify({"token": token, "admin_id": admin.id, "username": admin.username, "email": admin.email}), 200

    # Log kegagalan login ke file
    logger.warning(f"Login gagal untuk username/email: {username_or_email}")

    # Jika login gagal dan admin ditemukan, log juga ke database
    if admin:
        add_admin_log(
            admin_id=admin.id,
            action="login_failed",
            description="Percobaan login gagal: password salah."
        )

    return jsonify({"error": "Username/Email atau password salah"}), 401


@main.route("/protected", methods=["GET"])
@jwt_required()
def protected_route():
    current_admin_id = get_jwt_identity()
    admin = Admin.query.get(current_admin_id) # Ambil objek admin
    
    if admin:
        logger.info(f"Admin akses protected route: {admin.username} (ID: {admin.id})")
        return jsonify({"message": f"👋 Hello admin {admin.username} ({admin.email}), ini halaman yang dilindungi."}), 200
    else:
        logger.warning(f"Admin dengan ID {current_admin_id} tidak ditemukan saat akses protected route.")
        return jsonify({"error": "Admin tidak ditemukan"}), 404