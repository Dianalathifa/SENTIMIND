# routes/content_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, current_user, verify_jwt_in_request # Import verify_jwt_in_request
from sqlalchemy.exc import IntegrityError
from uuid import uuid4 # Untuk menghasilkan ID unik untuk konten dan tag
import json # Untuk menangani JSON fields

from . import db # Asumsi db diinisialisasi di __init__.py atau sejenisnya
from . import models # Mengacu pada models.py di dalam paket 'app'

# Menggunakan model dari 'models'
Content = models.Content
Admin = models.Admin
ContentTag = models.ContentTag
ContentPostTags = models.ContentPostTags

# Mengubah nama blueprint dari content_bp menjadi content dan menambahkan url_prefix di sini
content = Blueprint("content", __name__, url_prefix="/api/content")

@content.route('/', methods=['OPTIONS'])
def handle_options_root():
    """Menangani permintaan OPTIONS untuk rute dasar konten."""
    return '', 200

@content.route('/tags', methods=['OPTIONS'])
def handle_options_tags():
    """Menangani permintaan OPTIONS untuk rute tags konten."""
    return '', 200


@content.route('/', methods=['GET'])
def get_all_content():
    """
    Mengambil semua konten analisis yang ada.
    Jika ada token JWT yang valid, akan mengembalikan semua konten (termasuk draft/archived).
    Jika tidak ada token atau token tidak valid, hanya akan mengembalikan konten 'published'.
    """
    try:
        is_admin_authenticated = False
        try:
            # Coba verifikasi JWT. optional=True berarti tidak akan mengembalikan 401
            # jika token tidak ada atau tidak valid, tetapi akan mengisi current_user jika valid.
            verify_jwt_in_request(optional=True)
            if current_user: # Jika current_user ada, berarti token valid dan admin terautentikasi
                is_admin_authenticated = True
        except Exception:
            # Jika verifikasi gagal (misal: token tidak ada, tidak valid, atau kedaluwarsa),
            # is_admin_authenticated akan tetap False. Ini menangani kasus non-admin.
            pass

        if is_admin_authenticated:
            # Jika admin terautentikasi, ambil semua konten tanpa filter status
            all_content = Content.query.all()
        else:
            # Jika tidak terautentikasi (pengguna publik), hanya ambil konten yang statusnya 'published'
            all_content = Content.query.filter_by(status='published').all()

        content_data = [content_item.to_dict() for content_item in all_content]
        return jsonify({"content": content_data}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@content.route('/<string:content_id>', methods=['GET'])
def get_content_by_id(content_id):
    """
    Mengambil konten analisis berdasarkan ID.
    Untuk halaman publik, hanya tampilkan jika statusnya 'published'.
    Admin dapat melihat semua status.
    """
    try:
        content_item = Content.query.get(content_id)
        if not content_item:
            return jsonify({"message": "Konten tidak ditemukan"}), 404

        is_admin_authenticated = False
        try:
            verify_jwt_in_request(optional=True)
            if current_user:
                is_admin_authenticated = True
        except Exception:
            pass

        # Jika bukan admin terautentikasi DAN status konten bukan 'published', kembalikan 404
        if not is_admin_authenticated and content_item.status != 'published':
            return jsonify({"message": "Konten tidak ditemukan atau tidak dipublikasikan"}), 404
        
        # Tambahkan view count hanya jika diakses oleh non-admin (pengguna publik)
        # Admin tidak akan menambah view count saat melihat konten di dashboard
        if not is_admin_authenticated:
            content_item.views_count += 1
            db.session.commit() # Commit perubahan view count

        return jsonify(content_item.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@content.route('/', methods=['POST']) # Menggunakan 'content.route'
@jwt_required()
def create_content():
    """
    Membuat konten analisis baru.
    Membutuhkan autentikasi JWT.
    Data yang dibutuhkan: title, explanation_text, excerpt, cover_image_url, status,
                          recommendation_text, visualization_data_json, related_links_json,
                          [opsional] tags (list of tag_name strings).
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Data JSON tidak ditemukan"}), 400

    required_fields = ['title']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Field '{field}' wajib diisi"}), 400

    new_content_id = str(uuid4())

    visualization_data_json_str = None
    if 'visualization_data_json' in data and data['visualization_data_json'] is not None:
        try:
            json.loads(data['visualization_data_json'])
            visualization_data_json_str = data['visualization_data_json']
        except json.JSONDecodeError:
            return jsonify({"error": "Format JSON untuk visualization_data_json tidak valid"}), 400

    related_links_json_str = None
    if 'related_links_json' in data and data['related_links_json'] is not None:
        try:
            json.loads(data['related_links_json'])
            related_links_json_str = data['related_links_json']
        except json.JSONDecodeError:
            return jsonify({"error": "Format JSON untuk related_links_json tidak valid"}), 400

    try:
        new_content = Content(
            id=new_content_id,
            author_admin_id=current_user.id,
            title=data['title'],
            explanation_text=data.get('explanation_text'),
            excerpt=data.get('excerpt'),
            cover_image_url=data.get('cover_image_url'),
            status=data.get('status', 'draft'),
            recommendation_text=data.get('recommendation_text'),
            visualization_data_json=visualization_data_json_str,
            related_links_json=related_links_json_str,
            views_count=data.get('views_count', 0),
            comments_count=data.get('comments_count', 0),
            shares_count=data.get('shares_count', 0),
            published_at=data.get('published_at', None)
        )
        db.session.add(new_content)
        # db.session.commit() # Commit setelah tags ditambahkan

        # --- Penanganan Tags ---
        if 'tags' in data and isinstance(data['tags'], list):
            for tag_name in data['tags']:
                tag_name_stripped = str(tag_name).strip()
                if tag_name_stripped:
                    existing_tag = ContentTag.query.filter_by(tag_name=tag_name_stripped).first()
                    if not existing_tag:
                        new_tag_id = str(uuid4())
                        existing_tag = ContentTag(id=new_tag_id, tag_name=tag_name_stripped)
                        db.session.add(existing_tag)
                    new_content.tags.append(existing_tag)
        # --- End Penanganan Tags ---

        db.session.commit()
        return jsonify({"message": "Konten berhasil dibuat", "content": new_content.to_dict()}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Terjadi kesalahan integritas database, mungkin ID duplikat atau FK tidak valid"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@content.route('/<string:content_id>', methods=['PUT']) # Menggunakan 'content.route'
@jwt_required()
def update_content(content_id):
    """
    Memperbarui konten analisis yang sudah ada.
    Membutuhkan autentikasi JWT.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Data JSON tidak ditemukan"}), 400

    try:
        content_item = Content.query.get(content_id)
        if not content_item:
            return jsonify({"message": "Konten tidak ditemukan"}), 404

        # Update fields
        content_item.title = data.get('title', content_item.title)
        content_item.explanation_text = data.get('explanation_text', content_item.explanation_text)
        content_item.excerpt = data.get('excerpt', content_item.excerpt)
        content_item.cover_image_url = data.get('cover_image_url', content_item.cover_image_url)
        content_item.status = data.get('status', content_item.status)
        content_item.recommendation_text = data.get('recommendation_text', content_item.recommendation_text)
        content_item.views_count = data.get('views_count', content_item.views_count)
        content_item.comments_count = data.get('comments_count', content_item.comments_count)
        content_item.shares_count = data.get('shares_count', content_item.shares_count)
        content_item.published_at = data.get('published_at', content_item.published_at)

        # Handle JSON fields: dump Python objects to JSON strings for storage
        if 'visualization_data_json' in data:
            if data['visualization_data_json'] is not None:
                try:
                    json.loads(data['visualization_data_json'])
                    content_item.visualization_data_json = data['visualization_data_json']
                except json.JSONDecodeError:
                    return jsonify({"error": "Format JSON untuk visualization_data_json tidak valid"}), 400
            else:
                content_item.visualization_data_json = None

        if 'related_links_json' in data:
            if data['related_links_json'] is not None:
                try:
                    json.loads(data['related_links_json'])
                    content_item.related_links_json = data['related_links_json']
                except json.JSONDecodeError:
                    return jsonify({"error": "Format JSON untuk related_links_json tidak valid"}), 400
            else:
                content_item.related_links_json = None
        
        # --- Penanganan Update Tags ---
        if 'tags' in data:
            # Clear existing tags for a dynamic relationship by reassigning to an empty list
            content_item.tags = [] # PERBAIKAN: Mengganti .clear() dengan reassignment
            # db.session.flush() # Tidak wajib setelah reassignment, tetapi tidak merusak

            if isinstance(data['tags'], list):
                for tag_name in data['tags']:
                    tag_name_stripped = str(tag_name).strip()
                    if tag_name_stripped:
                        existing_tag = ContentTag.query.filter_by(tag_name=tag_name_stripped).first()
                        if not existing_tag:
                            new_tag_id = str(uuid4())
                            existing_tag = ContentTag(id=new_tag_id, tag_name=tag_name_stripped)
                            db.session.add(existing_tag)
                        content_item.tags.append(existing_tag)

        db.session.commit()
        return jsonify({"message": "Konten berhasil diperbarui", "content": content_item.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@content.route('/<string:content_id>', methods=['DELETE']) # Menggunakan 'content.route'
@jwt_required()
def delete_content(content_id):
    """
    Menghapus konten analisis.
    Membutuhkan autentikasi JWT.
    """
    try:
        content_item = Content.query.get(content_id)
        if not content_item:
            return jsonify({"message": "Konten tidak ditemukan"}), 404

        db.session.delete(content_item)
        db.session.commit()
        return jsonify({"message": "Konten berhasil dihapus"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# --- API untuk Content Tags ---
@content.route('/tags', methods=['POST']) # Menggunakan 'content.route'
@jwt_required()
def create_content_tag():
    """
    Membuat tag konten baru.
    Membutuhkan autentikasi JWT.
    Data yang dibutuhkan: tag_name.
    """
    data = request.get_json()
    if not data or 'tag_name' not in data:
        return jsonify({"error": "Field 'tag_name' wajib diisi"}), 400

    tag_name = data['tag_name'].strip()
    if not tag_name:
        return jsonify({"error": "Nama tag tidak boleh kosong"}), 400

    try:
        existing_tag = ContentTag.query.filter_by(tag_name=tag_name).first()
        if existing_tag:
            return jsonify({"message": "Tag sudah ada", "tag": existing_tag.to_dict()}), 200

        new_tag_id = str(uuid4())
        new_tag = ContentTag(id=new_tag_id, tag_name=tag_name)
        db.session.add(new_tag)
        db.session.commit()
        return jsonify({"message": "Tag berhasil dibuat", "tag": new_tag.to_dict()}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Terjadi kesalahan integritas database, mungkin duplikat tag_name"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@content.route('/tags', methods=['GET']) # Menggunakan 'content.route'
# @jwt_required() # Tergantung apakah tags bisa diakses publik atau hanya admin
def get_all_content_tags():
    """
    Mengambil semua tag konten yang ada.
    Opsional: Membutuhkan autentikasi JWT.
    """
    try:
        all_tags = ContentTag.query.all()
        tags_data = [tag.to_dict() for tag in all_tags]
        return jsonify({"tags": tags_data}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@content.route('/tags/<string:tag_id>', methods=['DELETE']) # Menggunakan 'content.route'
@jwt_required()
def delete_content_tag(tag_id):
    """
    Menghapus tag konten berdasarkan ID.
    Membutuhkan autentikasi JWT.
    """
    try:
        tag = ContentTag.query.get(tag_id)
        if not tag:
            return jsonify({"message": "Tag tidak ditemukan"}), 404

        db.session.delete(tag)
        db.session.commit()
        return jsonify({"message": "Tag berhasil dihapus"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
