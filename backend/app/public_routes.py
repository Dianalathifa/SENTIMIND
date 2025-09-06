# routes/public_routes.py

from flask import Blueprint, request, jsonify, send_file
from uuid import uuid4
from datetime import datetime
import logging
from flask_jwt_extended import jwt_required, get_jwt_identity

# Import untuk PDF
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics # Untuk font
from reportlab.pdfbase.ttfonts import TTFont # Untuk font
from reportlab.lib.units import inch # <--- BARU: Import inch dari reportlab.lib.units
import io
import csv
import xml.sax.saxutils # Untuk escape karakter HTML/XML
import re # Import modul regex untuk sanitasi lebih lanjut

# Pastikan import ini benar sesuai struktur proyek Anda
from app import db
from app.models import PublicAnalysisRequest, Admin, Tweet, SentimentAnalysisResult, Content

# Import fungsi scraping dan sentiment analyzer
from .scraper.tweet_scraper import run_scraping
from .sentiment_analyzer import SentimentAnalyzer

public_bp = Blueprint("public", __name__, url_prefix="/api/public")

# Setup logger untuk rute publik
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.hasHandlers():
    handler = logging.FileHandler("logs/public_routes.log")
    formatter = logging.Formatter('%(asctime)s %(levelname)s: %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# Inisialisasi SentimentAnalyzer secara global
sentiment_analyzer_instance = None
try:
    sentiment_analyzer_instance = SentimentAnalyzer()
    logger.info("✅ SentimentAnalyzer berhasil diinisialisasi di public_routes.")
except Exception as e:
    logger.error(f"❌ ERROR: Gagal menginisialisasi SentimentAnalyzer di public_routes. Fungsi analisis sentimen tidak akan tersedia. Detail: {e}", exc_info=True)

# Register a font that supports a wider range of characters (e.g., Arial, if available)
# Or use a standard ReportLab font like 'Helvetica'
# For better character support, you might need to provide a .ttf file.
# Example if you have a font file:
# try:
#     pdfmetrics.registerFont(TTFont('Arial', 'Arial.ttf'))
#     pdfmetrics.registerFont(TTFont('Arial-Bold', 'Arialbd.ttf'))
#     logger.info("Arial font registered for ReportLab.")
# except Exception as e:
#     logger.warning(f"Could not register Arial font: {e}. Falling back to default fonts.")

@public_bp.route('/request-analysis', methods=['OPTIONS'])
def handle_options_request_analysis():
    """Menangani permintaan OPTIONS untuk rute permintaan analisis."""
    return '', 200

@public_bp.route('/request-analysis', methods=['POST'])
def request_analysis():
    """
    Menerima permintaan analisis sentimen dari pengunjung publik.
    Menyimpan permintaan ke database untuk diproses oleh admin nanti.
    """
    data = request.get_json(silent=True)

    if not data:
        logger.warning("Permintaan analisis publik: Data JSON tidak ditemukan.")
        return jsonify({"error": "Data JSON tidak ditemukan"}), 400

    keyword = data.get('keyword')

    if not keyword:
        logger.warning("Permintaan analisis publik: Keyword kosong.")
        return jsonify({"error": "Kata kunci wajib diisi."}), 400

    new_request_id = str(uuid4())

    try:
        new_analysis_request = PublicAnalysisRequest(
            id=new_request_id,
            keyword=keyword.strip(),
            requested_at=datetime.utcnow(),
            status='pending'
        )
        db.session.add(new_analysis_request)
        db.session.commit()

        logger.info(f"Permintaan analisis baru diterima dan disimpan: ID={new_request_id}, Keyword='{keyword}'")
        return jsonify({
            "message": f"Permintaan analisis untuk '{keyword}' berhasil diajukan! Permintaan Anda akan diproses.",
            "request_id": new_request_id
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Gagal menyimpan permintaan analisis publik untuk keyword '{keyword}': {e}", exc_info=True)
        return jsonify({"error": "Terjadi kesalahan saat mengajukan permintaan analisis: " + str(e)}), 500

# --- Endpoint untuk Admin melihat daftar permintaan analisis publik ---
@public_bp.route('/admin/analysis-requests', methods=['GET'])
@jwt_required()
def get_all_public_analysis_requests_for_admin():
    """
    Mengambil semua permintaan analisis publik dari database.
    Hanya dapat diakses oleh admin yang terautentikasi.
    """
    current_admin_id = get_jwt_identity()
    logger.info(f"Admin ID: {current_admin_id} meminta daftar semua permintaan analisis publik.")

    try:
        all_requests = db.session.query(
            PublicAnalysisRequest,
            Admin.username.label('processed_by_admin_username'),
            Content.title.label('result_content_title')
        )\
        .outerjoin(Admin, PublicAnalysisRequest.processed_by_admin_id == Admin.id)\
        .outerjoin(Content, PublicAnalysisRequest.result_content_id == Content.id)\
        .order_by(PublicAnalysisRequest.requested_at.desc())\
        .all()

        requests_data = []
        for req, admin_username, content_title in all_requests:
            req_dict = req.to_dict()
            req_dict['processed_by_admin_username'] = admin_username
            req_dict['result_content_title'] = content_title
            requests_data.append(req_dict)

        logger.info(f"Berhasil mengambil {len(requests_data)} permintaan analisis publik untuk admin ID: {current_admin_id}.")
        return jsonify({"requests": requests_data}), 200

    except Exception as e:
        logger.error(f"Gagal mengambil permintaan analisis publik untuk admin ID: {current_admin_id}: {e}", exc_info=True)
        return jsonify({"error": "Gagal mengambil daftar permintaan analisis: " + str(e)}), 500

# --- Endpoint untuk Admin Menyetujui dan Memproses Permintaan Analisis ---
@public_bp.route('/admin/analysis-requests/<string:request_id>/approve', methods=['POST'])
@jwt_required()
def approve_analysis_request(request_id):
    """
    Memproses permintaan analisis publik yang diajukan oleh pengunjung.
    Admin akan memicu scraping dan analisis sentimen untuk keyword yang diminta.
    """
    current_admin_id = get_jwt_identity()
    logger.info(f"Admin ID: {current_admin_id} mencoba menyetujui permintaan analisis ID: {request_id}")

    if sentiment_analyzer_instance is None:
        logger.error(f"Admin ID: {current_admin_id} - SentimentAnalyzer belum diinisialisasi. Tidak dapat melakukan analisis.")
        return jsonify({"error": "Layanan analisis sentimen tidak tersedia. Cek log server."}), 500

    analysis_request = PublicAnalysisRequest.query.get(request_id)
    if not analysis_request:
        logger.warning(f"Admin ID: {current_admin_id} - Permintaan analisis ID: {request_id} tidak ditemukan.")
        return jsonify({"error": "Permintaan analisis tidak ditemukan."}), 404

    if analysis_request.status != 'pending':
        logger.warning(f"Admin ID: {current_admin_id} - Permintaan analisis ID: {request_id} sudah berstatus '{analysis_request.status}', tidak bisa diproses lagi.")
        return jsonify({"error": f"Permintaan sudah berstatus '{analysis_request.status}', tidak bisa diproses."}), 400

    analysis_request.status = 'processing'
    analysis_request.processed_by_admin_id = current_admin_id
    db.session.commit()

    logger.info(f"Permintaan analisis ID: {request_id} untuk keyword '{analysis_request.keyword}' mulai diproses oleh Admin ID: {current_admin_id}.")

    try:
        scrape_count = 100
        scrape_result = run_scraping(keyword=analysis_request.keyword, count=scrape_count)
        
        total_scraped = scrape_result.get('total_scraped', 0)
        scraped_tweet_ids = [tweet['id_str'] for tweet in scrape_result.get('data', [])]

        if total_scraped == 0:
            analysis_request.status = 'failed'
            db.session.commit()
            logger.warning(f"Permintaan analisis ID: {request_id} gagal: Tidak ada tweet yang discrape untuk keyword '{analysis_request.keyword}'.")
            return jsonify({"message": "Tidak ada tweet yang discrape untuk keyword ini. Permintaan gagal.", "status": "failed"}), 200

        tweets_to_analyze = db.session.query(Tweet)\
                                .outerjoin(SentimentAnalysisResult, Tweet.id == SentimentAnalysisResult.tweet_id)\
                                .filter(Tweet.id.in_(scraped_tweet_ids), SentimentAnalysisResult.id.is_(None))\
                                .all()
        
        analyzed_count = 0
        for tweet in tweets_to_analyze:
            # Pastikan tweet.tweet adalah string sebelum dianalisis
            tweet_text = str(tweet.tweet) if tweet.tweet is not None else ""
            if tweet_text: # Hanya analisis jika teks tidak kosong
                predicted_sentiment = sentiment_analyzer_instance.predict_sentiment(tweet_text)
                new_sentiment_result = SentimentAnalysisResult(
                    tweet_id=tweet.id,
                    sentiment=predicted_sentiment
                )
                db.session.add(new_sentiment_result)
                analyzed_count += 1
            else:
                logger.warning(f"Tweet ID: {tweet.id} memiliki teks kosong, dilewati analisis sentimen.")
                new_sentiment_result = SentimentAnalysisResult(
                    tweet_id=tweet.id,
                    sentiment="Teks Kosong/Tidak Valid"
                )
                db.session.add(new_sentiment_result)
                analyzed_count += 1

        db.session.commit()

        analysis_request.status = 'completed'
        db.session.commit()

        logger.info(f"Permintaan analisis ID: {request_id} untuk keyword '{analysis_request.keyword}' berhasil diselesaikan. Total {total_scraped} tweet discrape, {analyzed_count} dianalisis.")
        return jsonify({
            "message": "Permintaan analisis berhasil diproses.",
            "request_id": request_id,
            "status": "completed",
            "total_scraped": total_scraped,
            "analyzed_tweets": analyzed_count
        }), 200

    except Exception as e:
        db.session.rollback()
        analysis_request.status = 'failed'
        db.session.commit()
        logger.error(f"Gagal memproses permintaan analisis ID: {request_id} untuk keyword '{analysis_request.keyword}': {e}", exc_info=True)
        return jsonify({"error": "Terjadi kesalahan saat memproses permintaan analisis: " + str(e)}), 500

# --- Endpoint untuk Pengunjung melihat hasil analisis sentimen berdasarkan keyword ---
@public_bp.route('/analysis-results', methods=['GET'])
def get_public_analysis_results():
    keyword = request.args.get("keyword", "").strip()
    if not keyword:
        return jsonify({"error": "Kata kunci diperlukan untuk melihat hasil analisis."}), 400

    logger.info(f"Pengunjung meminta hasil analisis untuk keyword: '{keyword}'")

    try:
        tweets_with_sentiment = db.session.query(Tweet, SentimentAnalysisResult)\
                                    .join(SentimentAnalysisResult, Tweet.id == SentimentAnalysisResult.tweet_id)\
                                    .filter(Tweet.keyword_used == keyword)\
                                    .order_by(Tweet.created_at.desc())\
                                    .all()

        if not tweets_with_sentiment:
            return jsonify({"message": f"Tidak ada hasil analisis sentimen untuk keyword '{keyword}' yang ditemukan."}), 200

        results_data = []
        sentiment_counts = {'Positif': 0, 'Netral': 0, 'Negatif': 0}
        
        for tweet, sentiment_res in tweets_with_sentiment:
            tweet_dict = tweet.to_dict()
            tweet_dict['sentiment'] = sentiment_res.sentiment
            tweet_dict['sentiment_analyzed_at'] = sentiment_res.analyzed_at.isoformat() if sentiment_res.analyzed_at else None
            results_data.append(tweet_dict)

            if sentiment_res.sentiment in sentiment_counts:
                sentiment_counts[sentiment_res.sentiment] += 1

        total_analyzed = len(results_data)
        
        return jsonify({
            "message": f"Berhasil mengambil {total_analyzed} hasil analisis untuk keyword '{keyword}'.",
            "keyword": keyword,
            "total_analyzed": total_analyzed,
            "sentiment_summary": sentiment_counts,
            "tweets": results_data
        }), 200

    except Exception as e:
        logger.error(f"Gagal mengambil hasil analisis publik untuk keyword '{keyword}': {e}", exc_info=True)
        return jsonify({"error": "Terjadi kesalahan saat mengambil hasil analisis: " + str(e)}), 500

# --- Endpoint untuk Pengunjung mengunduh Laporan Analisis (PDF) ---
@public_bp.route('/download-analysis-pdf/<string:keyword>', methods=['GET'])
def download_analysis_pdf(keyword):
    logger.info(f"Pengunjung meminta download PDF laporan analisis untuk keyword: '{keyword}'")

    try:
        tweets_with_sentiment = db.session.query(Tweet, SentimentAnalysisResult)\
                                    .join(SentimentAnalysisResult, Tweet.id == SentimentAnalysisResult.tweet_id)\
                                    .filter(Tweet.keyword_used == keyword)\
                                    .order_by(Tweet.created_at.desc())\
                                    .all()

        if not tweets_with_sentiment:
            logger.warning(f"Tidak ada data analisis sentimen untuk keyword '{keyword}' yang dapat dibuat PDF.")
            return jsonify({"error": f"Tidak ada data analisis sentimen untuk keyword '{keyword}' yang dapat dibuat PDF."}), 404

        sentiment_counts = {'Positif': 0, 'Netral': 0, 'Negatif': 0}
        for _, sentiment_res in tweets_with_sentiment:
            if sentiment_res.sentiment in sentiment_counts:
                sentiment_counts[sentiment_res.sentiment] += 1
        total_analyzed = len(tweets_with_sentiment)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()

        # Custom styles
        styles.add(ParagraphStyle(name='Center', alignment=TA_CENTER))
        styles.add(ParagraphStyle(name='Heading1Center', parent=styles['h1'], alignment=TA_CENTER))
        styles.add(ParagraphStyle(name='Heading2Center', parent=styles['h2'], alignment=TA_CENTER))
        styles.add(ParagraphStyle(name='NormalSmall', parent=styles['Normal'], fontSize=8)) # Smaller font for table content

        story = []

        story.append(Paragraph("Laporan Analisis Sentimen Media Sosial X", styles['Heading1Center']))
        story.append(Spacer(1, 0.2 * inch)) # <--- DIPERBAIKI: Menggunakan inch
        story.append(Paragraph(f"Keyword: <b>{keyword}</b>", styles['Heading2Center']))
        story.append(Spacer(1, 0.4 * inch)) # <--- DIPERBAIKI: Menggunakan inch

        story.append(Paragraph("<b>Ringkasan Sentimen:</b>", styles['h2']))
        story.append(Spacer(1, 0.1 * inch)) # <--- DIPERBAIKI: Menggunakan inch
        
        summary_data = [
            ['Kategori Sentimen', 'Jumlah Tweet', 'Persentase'],
            ['Positif', sentiment_counts['Positif'], f"{ (sentiment_counts['Positif'] / total_analyzed * 100):.2f}%" if total_analyzed > 0 else "0.00%"],
            ['Netral', sentiment_counts['Netral'], f"{ (sentiment_counts['Netral'] / total_analyzed * 100):.2f}%" if total_analyzed > 0 else "0.00%"],
            ['Negatif', sentiment_counts['Negatif'], f"{ (sentiment_counts['Negatif'] / total_analyzed * 100):.2f}%" if total_analyzed > 0 else "0.00%"],
            ['Total Dianalisis', total_analyzed, '100.00%']
        ]
        
        summary_table = Table(summary_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch]) # <--- DIPERBAIKI: Menggunakan inch
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#424242')), # Darker grey for header
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F5F5F5')), # Light grey for rows
            ('GRID', (0,0), (-1,-1), 0.5, colors.black),
            ('BOX', (0,0), (-1,-1), 1, colors.black)
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 0.4 * inch)) # <--- DIPERBAIKI: Menggunakan inch

        story.append(Paragraph("<b>Detail Tweet Teratas (Contoh 10 Tweet Terbaru):</b>", styles['h2']))
        story.append(Spacer(1, 0.1 * inch)) # <--- DIPERBAIKI: Menggunakan inch

        tweet_data = [['No.', 'Teks Tweet', 'Sentimen', 'Likes', 'Retweets']]
        for i, (tweet, sentiment_res) in enumerate(tweets_with_sentiment[:10]):
            # Pastikan teks tweet adalah string dan handle None
            tweet_text = str(tweet.tweet) if tweet.tweet is not None else 'N/A'
            
            # Hapus semua karakter non-ASCII dan karakter kontrol
            tweet_text = re.sub(r'[^\x00-\x7F]+', '', tweet_text) # Pertahankan hanya karakter ASCII (0-127)
            # Pastikan printable (meskipun regex di atas seharusnya sudah menangani sebagian besar)
            tweet_text = ''.join(char for char in tweet_text if char.isprintable())
            # Gunakan xml.sax.saxutils.escape untuk sanitasi karakter HTML/XML
            tweet_text = xml.sax.saxutils.escape(tweet_text)
            
            if len(tweet_text) > 150:
                tweet_text = tweet_text[:147] + '...'
            
            # Pastikan likes_count dan retweets_count adalah string
            likes_str = str(tweet.likes_count) if tweet.likes_count is not None else '0'
            retweets_str = str(tweet.retweets_count) if tweet.retweets_count is not None else '0'

            tweet_data.append([
                str(i + 1),
                tweet_text, # Gunakan teks yang sudah disanitasi
                str(sentiment_res.sentiment) if sentiment_res.sentiment is not None else 'N/A', # Pastikan sentimen adalah string
                likes_str,
                retweets_str
            ])
        
        tweet_table = Table(tweet_data, colWidths=[0.5*inch, 3.5*inch, 1*inch, 0.7*inch, 0.7*inch]) # <--- DIPERBAIKI: Menggunakan inch
        tweet_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#424242')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('ALIGN', (0,0), (0,-1), 'CENTER'),
            ('ALIGN', (3,0), (4,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, colors.black),
            ('BOX', (0,0), (-1,-1), 1, colors.black),
            ('FONTSIZE', (0,1), (-1,-1), 8), # Smaller font for table body
        ]))
        story.append(tweet_table)
        story.append(Spacer(1, 0.4 * inch)) # <--- DIPERBAIKI: Menggunakan inch

        story.append(Paragraph(f"Laporan dibuat pada: {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}", styles['Normal']))

        # Tambahkan blok try-except yang lebih spesifik untuk proses build PDF
        try:
            doc.build(story)
        except Exception as build_e:
            logger.error(f"ReportLab build error for keyword '{keyword}': {build_e}", exc_info=True)
            return jsonify({"error": "Gagal membangun PDF: " + str(build_e)}), 500

        buffer.seek(0)

        return send_file(buffer, as_attachment=True, download_name=f"Laporan_Analisis_Sentimen_{keyword}.pdf", mimetype='application/pdf')

    except Exception as e:
        logger.error(f"Gagal membuat PDF laporan analisis untuk keyword '{keyword}': {e}", exc_info=True)
        return jsonify({"error": "Terjadi kesalahan saat membuat laporan PDF: " + str(e)}), 500

# --- BARU: Endpoint untuk Pengunjung mengunduh Dataset Mentah (CSV) ---
@public_bp.route('/download-raw-csv/<string:keyword>', methods=['GET'])
def download_raw_csv(keyword):
    logger.info(f"Pengunjung meminta download CSV data mentah untuk keyword: '{keyword}'")

    try:
        # Ambil semua tweet yang terkait dengan keyword
        raw_tweets = Tweet.query.filter_by(keyword_used=keyword).order_by(Tweet.created_at.desc()).all()

        if not raw_tweets:
            return jsonify({"error": f"Tidak ada data tweet mentah untuk keyword '{keyword}' yang dapat dibuat CSV."}), 404

        # Buat CSV dalam memori
        buffer = io.StringIO()
        csv_writer = csv.writer(buffer)

        # Header CSV (sesuaikan dengan kolom yang ingin Anda sertakan)
        headers = [
            'id_str', 'tweet_url', 'username', 'full_text', 'favorite_count',
            'retweet_count', 'reply_count', 'quote_count', 'created_at',
            'user_id_str', 'conversation_id_str', 'location', 'image_url',
            'hashtags', 'mentions', 'cashtags', 'retweet', 'video', 'keyword_used',
            'scraped_at'
        ]
        csv_writer.writerow(headers)

        # Tulis data
        for tweet in raw_tweets:
            row = [
                tweet.id,
                tweet.link, # tweet_url
                tweet.username,
                tweet.tweet, # full_text
                tweet.likes_count, # favorite_count
                tweet.retweets_count, # retweet_count
                tweet.replies_count,
                tweet.quote_count,
                tweet.created_at.isoformat() if tweet.created_at else '',
                tweet.user_id, # user_id_str
                tweet.conversation_id, # conversation_id_str
                tweet.place, # location
                tweet.photos, # image_url
                tweet.hashtags,
                tweet.mentions,
                tweet.cashtags,
                tweet.retweet,
                tweet.video,
                tweet.keyword_used,
                tweet.scraped_at.isoformat() if tweet.scraped_at else ''
            ]
            csv_writer.writerow(row)
        
        buffer.seek(0) # Kembali ke awal buffer

        return send_file(io.BytesIO(buffer.getvalue().encode('utf-8')), as_attachment=True, download_name=f"Data_Tweet_Mentah_{keyword}.csv", mimetype='text/csv')

    except Exception as e:
        logger.error(f"Gagal membuat CSV data mentah untuk keyword '{keyword}': {e}", exc_info=True)
        return jsonify({"error": "Terjadi kesalahan saat membuat file CSV: " + str(e)}), 500

