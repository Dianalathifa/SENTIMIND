import logging
from app import db # Pastikan db diimpor dari app
from app.models import Tweet, SentimentAnalysisResult # Pastikan SentimentAnalysisResult ada di impor ini
from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
import os

from .scraper.tweet_scraper import run_scraping
from .sentiment_analyzer import SentimentAnalyzer

scraping_bp = Blueprint("scraping", __name__, url_prefix="/api/scraping")

# Setup logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.hasHandlers(): # Pastikan handler hanya ditambahkan sekali
    handler = logging.FileHandler("logs/scraping.log")
    formatter = logging.Formatter('%(asctime)s %(levelname)s: %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

sentiment_analyzer_instance = None # Inisialisasi dengan None
try:
    sentiment_analyzer_instance = SentimentAnalyzer()
    logger.info("✅ SentimentAnalyzer berhasil diinisialisasi.")
except Exception as e:
    logger.error(f"❌ ERROR: Gagal menginisialisasi SentimentAnalyzer. Fungsi analisis sentimen tidak akan tersedia. Detail: {e}", exc_info=True)


# Route scraping utama (butuh JWT token)
@scraping_bp.route("/run", methods=["GET"])
@jwt_required()
def run_scraping_route():
    current_admin = get_jwt_identity()

    keyword = request.args.get("keyword", "").strip()
    count = request.args.get("count", type=int)

    # Validasi input
    if not keyword:
        logger.warning(f"Admin ID: {current_admin} - Keyword kosong dalam request scraping.")
        return jsonify({"error": "Kata kunci tidak boleh kosong."}), 422
    if count is None or count <= 0:
        logger.warning(f"Admin ID: {current_admin} - Jumlah data tidak valid dalam request scraping.")
        return jsonify({"error": "Jumlah data harus lebih dari 0."}), 422

    logger.info(f"Scraping dimulai oleh admin ID: {current_admin} dengan keyword: '{keyword}' dan count: {count}")

    try:

        result_data = run_scraping(keyword=keyword, count=count)

        logger.info(f"Scraping berhasil dijalankan. Total {result_data['total_scraped']} tweet.")
        return jsonify({
            "message": "✅ Scraping berhasil",
            "data": result_data["preview_data"], # Hanya 10 data pertama untuk preview di frontend
            "total_scraped": result_data["total_scraped"], # Jumlah total data yang discrap
            "filename": result_data["filename"] # Nama file CSV yang disimpan untuk di-download
        }), 200
    except ValueError as ve: # Tangani error spesifik jika token Twitter tidak disetel
        logger.error(f"Scraping gagal karena konfigurasi: {str(ve)}")
        return jsonify({"error": str(ve)}), 500
    except Exception as e:
        logger.error(f"Scraping gagal: {str(e)}")
        return jsonify({"error": "Terjadi kesalahan saat scraping: " + str(e)}), 500


# Route proxy untuk bypass CORS terhadap domain eksternal (biarkan seperti ini)
@scraping_bp.route("/proxy-liveupdt", methods=["GET"])
def proxy_liveupdt():
    """
    Proxy request dari frontend ke domain eksternal (menghindari CORS error)
    """
    try:
        target_url = 'http://www.liveupdt.com/ext/rd.php?f=bai&t=na&rad=0.16350772176732098&c=06072521&d=120'
        external_response = requests.get(target_url)

        return (
            external_response.content,
            external_response.status_code,
            {'Content-Type': external_response.headers.get('Content-Type', 'text/html')}
        )

    except Exception as e:
        logger.error(f"Proxy error: {e}")
        return jsonify({"error": "Gagal mengambil data dari server eksternal."}), 500

@scraping_bp.route("/get-recent-tweets", methods=["GET"])
@jwt_required()
def get_recent_tweets_route():
    current_admin = get_jwt_identity()
    logger.info(f"Admin ID: {current_admin} meminta data tweet terbaru dari database.")

    # Ambil parameter opsional untuk limit (jumlah data)
    limit = request.args.get("limit", 10, type=int)
    if limit <= 0:
        return jsonify({"error": "Limit harus angka positif."}), 400

    try:
        # Query database untuk mengambil tweet terbaru
        # Gunakan 'outerjoin' untuk menyertakan hasil sentimen jika ada
        recent_tweets = db.session.query(Tweet, SentimentAnalysisResult)\
                            .outerjoin(SentimentAnalysisResult, Tweet.id == SentimentAnalysisResult.tweet_id)\
                            .order_by(Tweet.created_at.desc()).limit(limit).all()

        # Konversi objek Tweet menjadi list of dictionaries untuk respons JSON
        tweets_data = []
        for tweet, sentiment_result in recent_tweets:
            tweet_dict = {
                "id_str": tweet.id,
                "tweet_url": tweet.link,
                "username": tweet.username,
                "full_text": tweet.tweet,
                "favorite_count": tweet.likes_count,
                "retweet_count": tweet.retweets_count,
                "reply_count": tweet.replies_count,
                "quote_count": tweet.quote_count,
                "created_at": tweet.created_at.isoformat() if tweet.created_at else None,
                "user_id_str": tweet.user_id,
                "conversation_id_str": tweet.conversation_id,
                "location": tweet.place,
                "image_url": tweet.photos,
                "hashtags": tweet.hashtags,
                "mentions": tweet.mentions,
                "cashtags": tweet.cashtags,
                "retweet": tweet.retweet,
                "video": tweet.video,
                "keyword_used": tweet.keyword_used,
            }
            # Tambahkan hasil sentimen jika ada
            if sentiment_result:
                tweet_dict['sentiment'] = sentiment_result.sentiment
                tweet_dict['sentiment_analyzed_at'] = sentiment_result.analyzed_at.isoformat() if sentiment_result.analyzed_at else None
            else:
                tweet_dict['sentiment'] = None # Atau 'Belum Dianalisis'
                tweet_dict['sentiment_analyzed_at'] = None

            tweets_data.append(tweet_dict)

        return jsonify({
            "message": f"Berhasil mengambil {len(tweets_data)} tweet terbaru dari database.",
            "preview_data": tweets_data,
            "total_retrieved": len(tweets_data)
        }), 200
    except Exception as e:
        logger.error(f"Gagal mengambil tweet terbaru dari database untuk admin ID: {current_admin}: {e}", exc_info=True)
        return jsonify({"error": "Gagal mengambil data tweet terbaru dari database: " + str(e)}), 500


# Endpoint untuk download file CSV
@scraping_bp.route("/download-csv/<filename>", methods=["GET"])
@jwt_required()
def download_csv(filename):
    current_admin = get_jwt_identity()
    logger.info(f"Admin ID: {current_admin} meminta download file: {filename}")

    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scraper', 'tweets-data')

    try:
        # send_from_directory secara otomatis menangani jenis MIME dan headers attachment
        return send_from_directory(output_dir, filename, as_attachment=True)
    except FileNotFoundError:
        logger.error(f"File {filename} tidak ditemukan untuk di-download dari {output_dir}.")
        return jsonify({"error": "File tidak ditemukan."}), 404
    except Exception as e:
        logger.error(f"Error saat download file {filename}: {str(e)}")
        return jsonify({"error": "Gagal download file."}), 500

# --- BARU: Route untuk Analisis Sentimen (VERSI SUDAH DIPERBAIKI) ---
@scraping_bp.route("/analyze-sentiment", methods=["POST"])
@jwt_required()
def analyze_sentiment_route():
    current_admin = get_jwt_identity()
    logger.info(f"Admin ID: {current_admin} memulai analisis sentimen.")

    if sentiment_analyzer_instance is None:
        logger.error(f"Admin ID: {current_admin} - SentimentAnalyzer belum diinisialisasi. Tidak dapat melakukan analisis.")
        return jsonify({"error": "Layanan analisis sentimen tidak tersedia. Cek log server."}), 500

    data = request.get_json(silent=True)
    
    if data is None:
        data = {}

    print(f"DEBUG: Tipe 'data': {type(data)}")
    print(f"DEBUG: Isi 'data': {data}")
    
    limit = int(data.get("limit", 100)) 
    tweet_ids = data.get("tweet_ids", [])

    if not isinstance(tweet_ids, list):
        return jsonify({"error": "tweet_ids harus berupa array/list."}), 400

    try:
        tweets_to_analyze = []
        if tweet_ids:
            # Ambil tweet berdasarkan ID yang diberikan
            # dan yang belum memiliki hasil analisis sentimen di tabel SentimentAnalysisResult
            tweets_to_analyze = db.session.query(Tweet)\
                                    .outerjoin(SentimentAnalysisResult, Tweet.id == SentimentAnalysisResult.tweet_id)\
                                    .filter(Tweet.id.in_(tweet_ids), SentimentAnalysisResult.id.is_(None))\
                                    .all()
            logger.info(f"Menganalisis {len(tweets_to_analyze)} tweet spesifik berdasarkan ID yang belum dianalisis.")
        else:
            # Ambil tweet yang belum dianalisis (tidak memiliki entri di SentimentAnalysisResult)
            tweets_to_analyze = db.session.query(Tweet)\
                                    .outerjoin(SentimentAnalysisResult, Tweet.id == SentimentAnalysisResult.tweet_id)\
                                    .filter(SentimentAnalysisResult.id.is_(None)).limit(limit).all()
            
            if not tweets_to_analyze:
                logger.info(f"Admin ID: {current_admin} - Tidak ada tweet yang belum dianalisis ditemukan.")
                return jsonify({"message": "Tidak ada tweet yang belum dianalisis ditemukan.", "analyzed_count": 0}), 200
            
            logger.info(f"Menganalisis {len(tweets_to_analyze)} tweet yang belum dianalisis.")

        analyzed_count = 0
        for tweet in tweets_to_analyze:
            if tweet.tweet:
                predicted_sentiment = sentiment_analyzer_instance.predict_sentiment(tweet.tweet)
                
                # Buat objek SentimentAnalysisResult baru dan tambahkan ke sesi
                new_sentiment_result = SentimentAnalysisResult(
                    tweet_id=tweet.id,
                    sentiment=predicted_sentiment
                )
                db.session.add(new_sentiment_result)
                analyzed_count += 1
            else:
                logger.warning(f"Tweet ID: {tweet.id} memiliki teks kosong, dilewati dan ditandai sebagai 'Teks Kosong/Tidak Valid'.")
                # Jika Anda ingin menyimpan ini juga di tabel baru:
                new_sentiment_result = SentimentAnalysisResult(
                    tweet_id=tweet.id,
                    sentiment="Teks Kosong/Tidak Valid"
                )
                db.session.add(new_sentiment_result)
                analyzed_count += 1 # Hitung juga yang ini sebagai diproses

        db.session.commit()

        logger.info(f"Admin ID: {current_admin} - Berhasil menganalisis dan memperbarui {analyzed_count} tweet.")
        return jsonify({
            "message": f"✅ Analisis sentimen berhasil untuk {analyzed_count} tweet.",
            "analyzed_count": analyzed_count
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Gagal melakukan analisis sentimen untuk admin ID: {current_admin}: {e}", exc_info=True)
        return jsonify({"error": "Terjadi kesalahan saat analisis sentimen: " + str(e)}), 500