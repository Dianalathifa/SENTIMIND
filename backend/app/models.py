# models.py

from . import db # Pastikan ini mengacu pada instance SQLAlchemy Anda
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import json

class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    # Relasi ke konten analisis yang dibuat admin
    contents = db.relationship('Content', backref='author', lazy=True)
    # Relasi ke komentar yang dibuat admin (jika ada)
    comments = db.relationship('ContentComment', backref='commenter', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class AdminLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=False)
    action = db.Column(db.String(255))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    admin = db.relationship('Admin', backref=db.backref('logs', lazy=True))

class Tweet(db.Model):
    __tablename__ = 'tweets'
    id = db.Column(db.String(255), primary_key=True, unique=True, nullable=False)
    conversation_id = db.Column(db.String(255), nullable=True)
    
    # Informasi tanggal dan waktu
    created_at = db.Column(db.DateTime, nullable=True) # Waktu tweet dibuat di Twitter
    date = db.Column(db.Date, nullable=True)
    time = db.Column(db.Time, nullable=True)
    timezone = db.Column(db.String(50), nullable=True)

    # Informasi pengguna
    user_id = db.Column(db.String(255), nullable=True) # User ID juga seringkali string
    username = db.Column(db.String(255), nullable=True)
    name = db.Column(db.String(255), nullable=True)
    place = db.Column(db.String(255), nullable=True) # Dari 'location' di CSV

    # Konten tweet
    tweet = db.Column(db.Text, nullable=True)
    mentions = db.Column(db.Text, nullable=True) # Jika disimpan sebagai JSON string dari list usernames
    hashtags = db.Column(db.Text, nullable=True) # Jika disimpan sebagai JSON string dari list hashtags
    cashtags = db.Column(db.Text, nullable=True)

    # Media dan tautan
    urls = db.Column(db.Text, nullable=True) # Jika disimpan sebagai JSON string dari list URLs
    photos = db.Column(db.Text, nullable=True) # Jika disimpan sebagai JSON string dari list URLs
    thumbnail = db.Column(db.String(255), nullable=True)
    link = db.Column(db.String(500), nullable=True) # URL bisa panjang, pakai 500
    quote_url = db.Column(db.String(500), nullable=True) # URL bisa panjang, pakai 500

    # Statistik tweet
    replies_count = db.Column(db.Integer, nullable=True, default=0)
    retweets_count = db.Column(db.Integer, nullable=True, default=0)
    likes_count = db.Column(db.Integer, nullable=True, default=0) # Dari 'favorite_count' di CSV
    quote_count = db.Column(db.Integer, nullable=True, default=0)

    # Status tweet
    retweet = db.Column(db.Boolean, nullable=True, default=False)
    video = db.Column(db.Boolean, nullable=True, default=False)

    # Terkait terjemahan
    translate = db.Column(db.Text, nullable=True)
    trans_src = db.Column(db.String(50), nullable=True)
    trans_dest = db.Column(db.String(50), nullable=True)

    # Kolom tambahan aplikasi
    keyword_used = db.Column(db.String(255), nullable=True)
    scraped_at = db.Column(db.DateTime, default=datetime.utcnow) # Waktu saat disimpan ke DB

    # --- Relasi ke SentimentAnalysisResult (opsional, tapi baik untuk navigasi) ---
    sentiment_result = db.relationship('SentimentAnalysisResult', backref='tweet', uselist=False, lazy=True)
    # uselist=False menandakan relasi satu-ke-satu (satu tweet memiliki paling banyak satu hasil analisis sentimen)

    def __repr__(self):
        return f'<Tweet {self.id}>'

    def to_dict(self):
        """Mengonversi objek Tweet ke kamus Python untuk JSON serialization."""
        data_dict = {
            "id_str": self.id, # Menggunakan id_str agar konsisten dengan frontend Anda
            "conversation_id_str": self.conversation_id, # Menggunakan id_str
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "date": self.date.isoformat() if self.date else None,
            "time": self.time.isoformat(timespec='seconds') if self.time else None,
            "timezone": self.timezone,
            "user_id_str": self.user_id, # Menggunakan id_str
            "username": self.username,
            "name": self.name,
            "place": self.place,
            "full_text": self.tweet, # Memetakan 'tweet' DB ke 'full_text' frontend
            "mentions": self.mentions,
            "urls": self.urls,
            "photos": self.photos,
            "replies_count": self.replies_count,
            "retweets_count": self.retweets_count,
            "likes_count": self.likes_count,
            "hashtags": self.hashtags,
            "cashtags": self.cashtags,
            "tweet_url": self.link, # Memetakan 'link' DB ke 'tweet_url' frontend
            "retweet": self.retweet,
            "quote_url": self.quote_url,
            "video": self.video,
            "thumbnail": self.thumbnail,
            "translate": self.translate,
            "trans_src": self.trans_src,
            "trans_dest": self.trans_dest,
            "keyword_used": self.keyword_used,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
            "quote_count": self.quote_count,
        }
        # Tambahkan hasil sentimen jika tersedia melalui relasi
        if self.sentiment_result:
            data_dict['sentiment'] = self.sentiment_result.sentiment
            data_dict['sentiment_analyzed_at'] = self.sentiment_result.analyzed_at.isoformat() if self.sentiment_result.analyzed_at else None
        else:
            # Penting: Jika tidak ada sentiment_result, pastikan field ini None untuk frontend
            data_dict['sentiment'] = None
            data_dict['sentiment_analyzed_at'] = None
        return data_dict

class SentimentAnalysisResult(db.Model):
    __tablename__ = 'sentiment_analysis_results' # Nama tabel di database

    id = db.Column(db.Integer, primary_key=True)

    tweet_id = db.Column(db.String(255), db.ForeignKey('tweets.id'), unique=True, nullable=False) 


    sentiment = db.Column(db.String(50), nullable=False) # Menyimpan hasil sentimen (misalnya "Positif", "Negatif")
    analyzed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False) # Waktu analisis dilakukan

    def __repr__(self):
        return f'<SentimentAnalysisResult TweetID:{self.tweet_id} Sentiment:{self.sentiment}>'

    def to_dict(self):
        return {
            "id": self.id,
            "tweet_id": self.tweet_id,
            "sentiment": self.sentiment,
            "analyzed_at": self.analyzed_at.isoformat() if self.analyzed_at else None # Pastikan ada pengecekan None
        }

# --- Entitas Content (Pengganti Blog Posts) ---
class Content(db.Model):
    __tablename__ = 'content'

    id = db.Column(db.String(255), primary_key=True, unique=True, nullable=False)
    author_admin_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    explanation_text = db.Column(db.Text, nullable=True)
    excerpt = db.Column(db.Text, nullable=True)
    cover_image_url = db.Column(db.String(500), nullable=True)
    published_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=True)
    views_count = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0) # Ini adalah kolom langsung
    shares_count = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default='draft')

    visualization_data_json = db.Column(db.Text, nullable=True) # Nama kolom di DB
    recommendation_text = db.Column(db.Text, nullable=True)
    related_links_json = db.Column(db.Text, nullable=True) # Nama kolom di DB

    tags = db.relationship('ContentTag', secondary='content_post_tags', backref='contents', lazy='dynamic')
    comments = db.relationship('ContentComment', backref='content', lazy=True)

    def __repr__(self):
        return f'<Content {self.id}>'

    def to_dict(self):
        data_dict = {
            "id": self.id,
            "author_admin_id": self.author_admin_id,
            "title": self.title,
            "explanation_text": self.explanation_text,
            "excerpt": self.excerpt,
            "cover_image_url": self.cover_image_url,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "views_count": self.views_count,
            "comments_count": self.comments_count,
            "shares_count": self.shares_count,
            "status": self.status,
            "recommendation_text": self.recommendation_text,
            # PENTING: Ubah nama key di respons JSON agar sesuai dengan frontend (tanpa _json)
            "visualization_data": json.loads(self.visualization_data_json) if self.visualization_data_json else None,
            "related_links": json.loads(self.related_links_json) if self.related_links_json else None,
            "tags": [tag.to_dict() for tag in self.tags.all()] if hasattr(self, 'tags') else []
        }
        return data_dict
# --- Entitas ContentTag ---
class ContentTag(db.Model):
    __tablename__ = 'content_tags' # Nama tabel baru

    id = db.Column(db.String(255), primary_key=True, unique=True, nullable=False) # Menggunakan String untuk ID (misal UUID)
    tag_name = db.Column(db.String(100), unique=True, nullable=False)

    def __repr__(self):
        return f'<ContentTag {self.tag_name}>'

    def to_dict(self):
        return {
            "id": self.id,
            "tag_name": self.tag_name
        }

# --- Entitas ContentComment ---
class ContentComment(db.Model):
    __tablename__ = 'content_comments' # Nama tabel baru

    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.String(255), db.ForeignKey('content.id'), nullable=False)
    commenter_admin_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=True) # Nullable jika anonim
    anonymous_name = db.Column(db.String(100), nullable=True)
    anonymous_email = db.Column(db.String(120), nullable=True)
    comment_text = db.Column(db.Text, nullable=False)
    commented_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(50), default='pending') # 'approved', 'pending', 'spam'

    def __repr__(self):
        return f'<ContentComment {self.id} for Content {self.content_id}>'

    def to_dict(self):
        return {
            "id": self.id,
            "content_id": self.content_id,
            "commenter_admin_id": self.commenter_admin_id,
            "anonymous_name": self.anonymous_name,
            "anonymous_email": self.anonymous_email,
            "comment_text": self.comment_text,
            "commented_at": self.commented_at.isoformat() if self.commented_at else None,
            "status": self.status
        }

# --- Tabel Penghubung Many-to-Many Content dan ContentTag ---
class ContentPostTags(db.Model):
    __tablename__ = 'content_post_tags' # Nama tabel baru
    content_id = db.Column(db.String(255), db.ForeignKey('content.id'), primary_key=True)
    content_tag_id = db.Column(db.String(255), db.ForeignKey('content_tags.id'), primary_key=True)

    def __repr__(self):
        return f'<ContentPostTags ContentID:{self.content_id} TagID:{self.content_tag_id}>'

class PublicAnalysisRequest(db.Model):
    __tablename__ = 'public_analysis_requests'

    id = db.Column(db.String(255), primary_key=True, default=lambda: str(uuid4()), unique=True, nullable=False)
    keyword = db.Column(db.String(255), nullable=False)
    requested_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(50), default='pending', nullable=False) # 'pending', 'processing', 'completed', 'failed'
    processed_by_admin_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=True) # Admin yang memproses
    result_content_id = db.Column(db.String(255), db.ForeignKey('content.id'), nullable=True) # Link ke konten hasil jika selesai

    # Relasi opsional ke Content jika permintaan ini menghasilkan konten baru
    result_content = db.relationship('Content', backref='analysis_request', lazy=True)

    def __repr__(self):
        return f'<PublicAnalysisRequest ID:{self.id} Keyword:{self.keyword} Status:{self.status}>'

    def to_dict(self):
        return {
            "id": self.id,
            "keyword": self.keyword,
            "requested_at": self.requested_at.isoformat() if self.requested_at else None,
            "status": self.status,
            "processed_by_admin_id": self.processed_by_admin_id,
            "result_content_id": self.result_content_id
        }
