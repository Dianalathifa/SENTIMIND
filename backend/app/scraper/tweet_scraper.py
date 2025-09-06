import os
import pandas as pd
import subprocess
from datetime import datetime, date, time as dt_time_type
import logging
import shutil
import time
import re
import pytz # Masih diimpor, meskipun penggunaannya mungkin tidak eksplisit di sini, tapi baik untuk penanganan zona waktu.

from .. import db # Asumsi ini tetap ada dan benar untuk Flask-SQLAlchemy
from ..models import Tweet # Asumsi ini tetap ada dan benar untuk model Tweet Anda
from flask import current_app

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_BASE_DIR = os.path.dirname(BASE_DIR)

def crawl_tweets(keyword: str, filename: str, total_limit: int = 500, batch_size: int = 100, sleep_duration: int = 60, auth_token: str = None, since_date: date = None, until_date: date = None) -> pd.DataFrame:
    """
    Melakukan scraping tweet menggunakan tweet-harvest dalam beberapa batch, menggabungkan hasilnya,
    memfilter duplikat dan balasan, dan menyimpannya ke CSV serta database.

    Args:
        keyword (str): Kata kunci yang akan dicari.
        filename (str): Nama file CSV output akhir.
        total_limit (int): Jumlah tweet maksimum yang ingin discrap.
        batch_size (int): Jumlah tweet per batch scraping.
        sleep_duration (int): Durasi tidur antar batch dalam detik.
        auth_token (str): Token Bearer Twitter untuk autentikasi.
        since_date (date, optional): Tanggal mulai scraping (inklusif). Format: YYYY-MM-DD.
        until_date (date, optional): Tanggal akhir scraping (inklusif). Format: YYYY-MM-DD.

    Returns:
        pd.DataFrame: DataFrame yang berisi semua tweet yang berhasil discrap dan difilter.

    Raises:
        ValueError: Jika auth_token tidak disediakan atau tidak valid.
        Exception: Jika ada masalah dengan eksekusi subprocess atau parsing data.
    """
    logger.info(f"PATH environment variable in Flask process: {os.environ.get('PATH')}")
    logger.info(f"DEBUG: Type of 'datetime' from datetime module: {type(datetime)}")
    logger.info(f"DEBUG: Type of 'date' from datetime module: {type(date)}")
    logger.info(f"DEBUG: Type of 'dt_time_type' from datetime module: {type(dt_time_type)}")
    logger.info(f"DEBUG: Type of 'time' module: {type(time)}")
    logging.info(f"DEBUG: Is datetime.datetime type recognized? {isinstance(datetime.now(), datetime)}")
    logging.info(f"DEBUG: Is datetime.date type recognized? {isinstance(datetime.now().date(), date)}")
    logging.info(f"DEBUG: Is datetime.time type recognized? {isinstance(datetime.now().time(), dt_time_type)}")

    output_final_csv_dir = os.path.join(BASE_DIR, "tweets-data")
    os.makedirs(output_final_csv_dir, exist_ok=True)
    logger.info(f"Folder penyimpanan CSV final yang mudah diakses: {output_final_csv_dir}")

    session_timestamp = datetime.now().strftime('%Y%m%d%H%M%S')

    temp_harvest_cwd = os.path.join(APP_BASE_DIR, f"temp_harvest_output_{session_timestamp}")
    os.makedirs(temp_harvest_cwd, exist_ok=True)
    logger.info(f"Folder sementara (CWD untuk tweet-harvest): {temp_harvest_cwd}")

    final_csv_path = os.path.join(output_final_csv_dir, filename)
    logger.info(f"Jalur file CSV final yang diharapkan: {final_csv_path}")

    all_tweets = pd.DataFrame()

    logger.info(f"Memulai scraping untuk keyword: '{keyword}' dengan limit: {total_limit}")
    if since_date and until_date:
        logger.info(f"Rentang waktu scraping: dari {since_date.strftime('%Y-%m-%d')} hingga {until_date.strftime('%Y-%m-%d')}")
    elif since_date:
        logger.info(f"Rentang waktu scraping: sejak {since_date.strftime('%Y-%m-%d')}")
    elif until_date:
        logger.info(f"Rentang waktu scraping: hingga {until_date.strftime('%Y-%m-%d')}")

    if not auth_token:
        logger.error("Auth token tidak disediakan untuk crawl_tweets. Scraping dibatalkan.")
        raise ValueError("Auth token tidak disediakan. Pastikan TWITTER_BEARER_TOKEN disetel.")

    current_scraped_count = 0
    for batch_num, start_index in enumerate(range(0, total_limit, batch_size)):
        if current_scraped_count >= total_limit:
            logger.info(f"Target limit ({total_limit}) tercapai. Menghentikan scraping.")
            break

        current_batch_limit = min(batch_size, total_limit - current_scraped_count)
        if current_batch_limit <= 0:
            break

        batch_filename = f"batch_{batch_num}.csv"
        # Path di dalam direktori `tweet-harvest` output
        temp_filepath_for_batch = os.path.join(temp_harvest_cwd, 'tweets-data', batch_filename)

        # Base search query
        search_query_for_command = f"{keyword} -is:reply"

        # Tambahkan filter tanggal jika ada
        if since_date:
            search_query_for_command += f" since:{since_date.strftime('%Y-%m-%d')}"
        if until_date:
            search_query_for_command += f" until:{until_date.strftime('%Y-%m-%d')}"
        
        command = [
            "npx", "-y", "tweet-harvest@latest", # !!! PERBAIKAN KRUSIAL: Gunakan @latest
            "-o", batch_filename,
            "-s", search_query_for_command,
            "--tab", "LATEST", # Mungkin "LIVE" atau "TOP" juga relevan, tapi LATEST seringkali default yang baik
            "-l", str(current_batch_limit),
            "--token", auth_token
        ]

        logger.info(f"\n📡 Menjalankan perintah batch {batch_num} ({current_batch_limit} tweet): {' '.join(command)}")
        logger.info(f"📂 Direktori kerja untuk batch (cwd): {temp_harvest_cwd}")

        try:
            # Perhitungan timeout yang lebih dinamis, minimal 30 detik, maksimal 300 detik
            subprocess_timeout = max(30, min(current_batch_limit * 5, 300))
            result = subprocess.run(
                command,
                shell=True, 
                cwd=temp_harvest_cwd,
                capture_output=True,
                text=True,
                check=True, # Akan raise CalledProcessError jika perintah gagal
                timeout=subprocess_timeout
            )
            logger.info("📝 STDOUT:\n" + result.stdout)
            if result.stderr:
                logger.warning("⚠️ STDERR:\n" + result.stderr)

            harvest_output_dir = os.path.join(temp_harvest_cwd, 'tweets-data')
            
            # Pastikan file CSV benar-benar ada dan tidak kosong
            if os.path.exists(harvest_output_dir) and os.path.exists(temp_filepath_for_batch) and os.stat(temp_filepath_for_batch).st_size > 0:
                try:
                    logger.info(f"Mencoba membaca CSV: {temp_filepath_for_batch}")
                    batch_df = pd.read_csv(temp_filepath_for_batch, on_bad_lines='skip', encoding='utf-8')

                    if batch_df.empty:
                        logger.warning(f"DataFrame dari {temp_filepath_for_batch} kosong setelah dibaca.")
                    else:
                        logger.info(f"Berhasil membaca CSV. Kolom yang ditemukan: {batch_df.columns.tolist()}")

                        # Pastikan kolom-kolom kritis ada sebelum melanjutkan
                        required_cols_for_processing = ['id_str', 'tweet_url', 'full_text', 'created_at', 'username', 'in_reply_to_screen_name']
                        missing_cols_for_processing = [col for col in required_cols_for_processing if col not in batch_df.columns]
                        if missing_cols_for_processing:
                            logger.error(f"❌ Kolom penting berikut tidak ditemukan di DataFrame dari {temp_filepath_for_batch}: {missing_cols_for_processing}. Batch ini mungkin tidak lengkap atau data tidak valid.")
                            # Pertimbangkan untuk membuang batch ini jika kolom kunci hilang
                            # continue 

                        initial_batch_count = len(batch_df)

                        # Deduplikasi dalam batch
                        if 'id_str' in batch_df.columns and 'tweet_url' in batch_df.columns:
                            batch_df.drop_duplicates(subset=['id_str', 'tweet_url'], inplace=True)
                            if len(batch_df) < initial_batch_count:
                                logger.warning(f"Ditemukan {initial_batch_count - len(batch_df)} duplikat dalam batch {batch_num}. Dibuang.")
                        else:
                            logger.warning(f"Kolom 'id_str' atau 'tweet_url' tidak ditemukan di batch {batch_num}. Melewati drop_duplicates.")
                        
                        # --- Filtering balasan di sini (SETELAH deduplikasi batch) ---
                        original_count_before_reply_filter = len(batch_df)
                        if 'in_reply_to_screen_name' in batch_df.columns:
                            batch_df_filtered = batch_df[batch_df['in_reply_to_screen_name'].isna() | (batch_df['in_reply_to_screen_name'] == '')].copy()
                            removed_replies_count = original_count_before_reply_filter - len(batch_df_filtered)
                            if removed_replies_count > 0:
                                logger.info(f"🧹 Dibuang {removed_replies_count} balasan dari batch {batch_num}.")
                            batch_df = batch_df_filtered
                        else:
                            logger.warning("Kolom 'in_reply_to_screen_name' tidak ditemukan di CSV batch ini. Tidak dapat memfilter balasan secara langsung.")
                        # --- Akhir filtering balasan ---

                        all_tweets = pd.concat([all_tweets, batch_df], ignore_index=True)
                        current_scraped_count = len(all_tweets)
                        logger.info(f"✅ Batch {batch_num} berhasil dibaca dan difilter, menambahkan {len(batch_df)} tweet. Total terkumpul: {current_scraped_count} tweet.")

                except pd.errors.EmptyDataError:
                    logger.warning(f"File {temp_filepath_for_batch} kosong. Mungkin hanya header atau tidak ada data.")
                except pd.errors.ParserError as pe:
                    logger.error(f"❌ Gagal mem-parsing CSV {temp_filepath_for_batch}: {pe}", exc_info=True)
                except KeyError as ke:
                    # Ini menangkap jika kolom yang diakses secara langsung (misal row['full_text']) tidak ada di DataFrame
                    logger.error(f"❌ Kesalahan kolom saat memproses {temp_filepath_for_batch}: Kolom '{ke.args[0]}' tidak ditemukan. Baris diabaikan. Pastikan kolom ada di CSV.")
                except Exception as e:
                    logger.error(f"❌ Gagal membaca atau memproses {temp_filepath_for_batch}: {e}", exc_info=True)
                finally:
                    # Selalu coba bersihkan direktori output tweet-harvest untuk batch ini
                    if os.path.exists(harvest_output_dir):
                        try:
                            shutil.rmtree(harvest_output_dir)
                            logger.info(f"🗑️ Direktori output 'tweets-data' sementara di {harvest_output_dir} dihapus.")
                        except OSError as e:
                            logger.warning(f"Tidak dapat menghapus direktori sementara 'tweets-data' di {harvest_output_dir}: {e}.")
            else:
                logger.warning(f"❌ File {temp_filepath_for_batch} tidak ditemukan atau kosong (ukuran 0 byte). Kemungkinan gagal scraping atau tidak ada data di batch ini.")
                if result.stderr and ("No more content" in result.stderr or "No tweets found" in result.stdout):
                    logger.info("Tweet-Harvest menunjukkan tidak ada konten lebih lanjut. Menghentikan batching.")
                    break # Hentikan loop jika scraper melaporkan tidak ada lagi konten

        except subprocess.TimeoutExpired as e:
            logger.error(f"Subprocess timeout expired: {e.cmd}")
            logger.error(f"STDOUT: {e.stdout}")
            logger.error(f"STDERR: {e.stderr}")
            if os.path.exists(temp_harvest_cwd):
                # Bersihkan folder temp penuh jika timeout
                shutil.rmtree(temp_harvest_cwd)
                logger.info(f"🗑️ Folder sementara {temp_harvest_cwd} dihapus setelah timeout.")
            raise Exception(f"Proses scraping Tweet-Harvest timeout ({e.timeout} detik). Coba batas lebih kecil atau periksa koneksi internet Anda. STDOUT: {e.stdout.strip()}, STDERR: {e.stderr.strip()}")
        except subprocess.CalledProcessError as e:
            logger.error(f"Error saat menjalankan Tweet-Harvest: {e.cmd}")
            logger.error(f"STDOUT: {e.stdout}")
            logger.error(f"STDERR: {e.stderr}")
            if "Could not authenticate" in e.stderr or "Invalid bearer token" in e.stderr:
                raise ValueError("Token Twitter Bearer tidak valid atau kadaluarsa. Harap perbarui.")
            error_details = e.stderr.strip() if e.stderr else "Tidak ada detail error di STDERR."
            raise Exception(f"Gagal menjalankan Tweet-Harvest. Periksa log atau instalasi: {error_details}")
        except FileNotFoundError:
            raise Exception("Perintah 'npx' atau 'tweet-harvest' tidak ditemukan. Pastikan Node.js dan npx terinstal dan ada di PATH.")
        except Exception as e:
            logger.error(f"Terjadi kesalahan tak terduga saat scraping batch: {e}", exc_info=True)
            raise e # Reraise exception to signal failure

        if current_scraped_count < total_limit and (batch_num + 1) * batch_size < total_limit and not all_tweets.empty:
            # Hanya tidur jika ada tweet yang terkumpul dan belum mencapai limit
            logger.info(f"🕒 Menunggu {sleep_duration} detik sebelum batch selanjutnya...\n")
            time.sleep(sleep_duration)
        elif current_scraped_count >= total_limit:
            logger.info("Target limit tweet tercapai. Menyelesaikan scraping.")
            break
    
    # --- Filtering duplikat keseluruhan dan balasan di tahap akhir, setelah semua batch digabung ---
    # Ini penting karena duplikat bisa terjadi antar batch
    initial_total_count = len(all_tweets)
    if not all_tweets.empty:
        # Deduplikasi final
        if 'id_str' in all_tweets.columns and 'tweet_url' in all_tweets.columns:
            all_tweets.drop_duplicates(subset=['id_str', 'tweet_url'], inplace=True)
            if len(all_tweets) < initial_total_count:
                logger.info(f"⚠️ Dibuang {initial_total_count - len(all_tweets)} data duplikat dari total hasil akhir.")
            initial_total_count = len(all_tweets) # Perbarui count setelah deduplikasi

        # Filter balasan final
        if 'in_reply_to_screen_name' in all_tweets.columns:
            all_tweets_filtered = all_tweets[all_tweets['in_reply_to_screen_name'].isna() | (all_tweets['in_reply_to_screen_name'] == '')].copy()
            removed_replies_count_final = initial_total_count - len(all_tweets_filtered)
            if removed_replies_count_final > 0:
                logger.info(f"🧹 Dibuang {removed_replies_count_final} balasan tambahan dari hasil akhir.")
            all_tweets = all_tweets_filtered
        else:
            logger.warning("Kolom 'in_reply_to_screen_name' tidak ditemukan di DataFrame akhir. Tidak dapat memfilter balasan secara menyeluruh.")
        
        # --- Filtering tanggal di tahap akhir, memastikan rentang waktu tetap terpenuhi ---
        # Ini penting karena `tweet-harvest` mungkin tidak 100% mematuhi filter `since:`/`until:`
        if 'created_at' in all_tweets.columns:
            all_tweets['created_at_dt'] = pd.to_datetime(all_tweets['created_at'], errors='coerce', utc=True)
            
            # Filter by since_date
            if since_date:
                count_before_since_filter = len(all_tweets)
                all_tweets = all_tweets[all_tweets['created_at_dt'].dt.date >= since_date].copy()
                if len(all_tweets) < count_before_since_filter:
                    logger.info(f"🗑️ Dibuang {count_before_since_filter - len(all_tweets)} tweet yang lebih lama dari {since_date.strftime('%Y-%m-%d')} (post-processing).")

            # Filter by until_date
            if until_date:
                count_before_until_filter = len(all_tweets)
                all_tweets = all_tweets[all_tweets['created_at_dt'].dt.date <= until_date].copy()
                if len(all_tweets) < count_before_until_filter:
                    logger.info(f"🗑️ Dibuang {count_before_until_filter - len(all_tweets)} tweet yang lebih baru dari {until_date.strftime('%Y-%m-%d')} (post-processing).")
            
            all_tweets.drop(columns=['created_at_dt'], inplace=True, errors='ignore')
        else:
            logger.warning("Kolom 'created_at' tidak ditemukan di DataFrame akhir. Tidak dapat memfilter berdasarkan tanggal.")

        final_total_count = len(all_tweets)
    else:
        final_total_count = 0 # Jika all_tweets memang kosong dari awal
        logger.warning("DataFrame hasil scraping kosong. Tidak ada data untuk drop_duplicates atau filtering akhir.")

    # Pembersihan folder sementara
    if os.path.exists(temp_harvest_cwd) and os.path.isdir(temp_harvest_cwd):
        try:
            shutil.rmtree(temp_harvest_cwd)
            logger.info(f"🗑️ Folder sementara {temp_harvest_cwd} dan isinya dihapus.")
        except OSError as e:
            logger.warning(f"Tidak dapat menghapus folder sementara {temp_harvest_cwd}: {e}.")

    # Simpan ke CSV final
    if not all_tweets.empty:
        all_tweets.to_csv(final_csv_path, index=False)
        logger.info(f"\n📦 Semua {final_total_count} tweet (setelah filtering) disimpan di: {final_csv_path}")
    else:
        logger.warning(f"Tidak ada tweet yang berhasil discrap untuk keyword '{keyword}' setelah filtering. File CSV final tidak dibuat.")
        return pd.DataFrame() # Return DataFrame kosong jika tidak ada data

    # Simpan ke database
    if not all_tweets.empty:
        if 'id_str' not in all_tweets.columns:
            logger.error("❌ Kolom 'id_str' tidak ditemukan di DataFrame final, tidak dapat menyimpan ke database.")
            return all_tweets # Kembalikan data yang ada meskipun tidak bisa disimpan ke DB

        with current_app.app_context(): # Pastikan ini dijalankan dalam konteks aplikasi Flask
            logger.info("\n💾 Memulai penyimpanan data ke database...")

            # Buat salinan untuk operasi DB agar tidak memodifikasi all_tweets asli
            all_tweets_for_db = all_tweets[all_tweets['id_str'].notna()].copy()
            
            # Ganti nama kolom id_str menjadi id untuk sesuai dengan model DB
            if 'id_str' in all_tweets_for_db.columns:
                all_tweets_for_db.rename(columns={'id_str': 'id'}, inplace=True)
                all_tweets_for_db['id'] = all_tweets_for_db['id'].astype(str) # Pastikan id adalah string
            else:
                logger.error("❌ 'id_str' not found in all_tweets_for_db, cannot proceed with DB save (after rename attempt).")
                return all_tweets # Kembalikan data yang ada

            logger.info(f"Jumlah tweet yang akan diproses untuk disimpan ke DB: {len(all_tweets_for_db)}")
            if all_tweets_for_db.empty:
                logger.warning("DataFrame untuk DB kosong setelah filtering id_str. Tidak ada data untuk disimpan.")
                return all_tweets

            # Mapping kolom CSV ke kolom model database Tweet
            csv_to_db_map = {
                # 'id_str' sudah di-rename menjadi 'id'
                'id': 'id', # Pastikan ini ada di map setelah rename
                'conversation_id_str': 'conversation_id',
                'created_at': 'created_at',
                'full_text': 'tweet',
                'favorite_count': 'likes_count',
                'retweet_count': 'retweets_count',
                'reply_count': 'replies_count',
                'tweet_url': 'link',
                'username': 'username',
                'user_id_str': 'user_id',
                'location': 'place',
                'image_url': 'photos',
                'lang': 'lang',
                'in_reply_to_screen_name': 'in_reply_to_screen_name',
                'quote_count': 'quote_count',
                'cashtags': 'cashtags',
                'quote_url': 'quote_url'
            }
            
            model_columns = Tweet.__table__.columns.keys()
            logger.info(f"Kolom model database Tweet: {model_columns}")
            
            saved_count = 0
            tweets_to_add = []

            for index, row in all_tweets_for_db.iterrows():
                try:
                    tweet_id = str(row['id'])
                    existing_tweet = db.session.query(Tweet).filter_by(id=tweet_id).first()
                    if existing_tweet:
                        continue

                    tweet_data = {}
                    for db_col in model_columns:
                        csv_col_name = None
                        for k_csv, v_db in csv_to_db_map.items():
                            if v_db == db_col:
                                csv_col_name = k_csv
                                break
                        
                        if db_col == 'id':
                            tweet_data[db_col] = tweet_id # Sudah dijamin ada dan string
                        elif db_col == 'keyword_used':
                            tweet_data[db_col] = keyword
                        elif db_col == 'scraped_at':
                            tweet_data[db_col] = datetime.utcnow() # Waktu saat disimpan ke DB
                        elif db_col == 'created_at':
                            if 'created_at' in row and pd.notna(row['created_at']):
                                try:
                                    dt_object = datetime.strptime(str(row['created_at']), '%Y-%m-%dT%H:%M:%S.%fZ')
                                    tweet_data[db_col] = dt_object
                                    tweet_data['date'] = dt_object.date()
                                    tweet_data['time'] = dt_object.time()
                                    tweet_data['timezone'] = dt_object.tzinfo.tzname(dt_object) if dt_object.tzinfo else None
                                except ValueError as ve:
                                    logger.warning(f"Could not parse 'created_at' for tweet {tweet_id}: '{row['created_at']}'. Error: {ve}. Setting to None.")
                                    tweet_data[db_col] = None
                                    tweet_data['date'] = None
                                    tweet_data['time'] = None
                                    tweet_data['timezone'] = None
                            else:
                                logger.warning(f"Kolom 'created_at' tidak ditemukan atau kosong untuk tweet ID {tweet_id}. Disimpan sebagai None.")
                                tweet_data[db_col] = None
                                tweet_data['date'] = None
                                tweet_data['time'] = None
                                tweet_data['timezone'] = None
                        elif db_col in ['date', 'time', 'timezone']:
                            # Kolom ini diatur saat 'created_at' diparsing, jadi lewati di sini
                            continue 
                        elif db_col == 'mentions' and 'full_text' in row and pd.notna(row['full_text']):
                            tweet_data[db_col] = ','.join(re.findall(r'@(\w+)', str(row['full_text']))) or None
                        elif db_col == 'hashtags' and 'full_text' in row and pd.notna(row['full_text']):
                            tweet_data[db_col] = ','.join(re.findall(r'#(\w+)', str(row['full_text']))) or None
                        elif db_col == 'cashtags':
                            tweet_data[db_col] = str(row['cashtags']) if 'cashtags' in row and pd.notna(row['cashtags']) else None
                        elif db_col == 'tweet':
                            tweet_data[db_col] = str(row['full_text']) if 'full_text' in row and pd.notna(row['full_text']) else None
                        elif db_col == 'likes_count':
                            try:
                                tweet_data[db_col] = int(row['favorite_count']) if 'favorite_count' in row and pd.notna(row['favorite_count']) else 0
                            except (ValueError, TypeError):
                                tweet_data[db_col] = 0
                                logger.warning(f"Could not convert favorite_count '{row.get('favorite_count')}' to int for tweet {tweet_id}. Defaulting to 0.")
                        elif db_col == 'retweets_count':
                            try:
                                tweet_data[db_col] = int(row['retweet_count']) if 'retweet_count' in row and pd.notna(row['retweet_count']) else 0
                            except (ValueError, TypeError):
                                tweet_data[db_col] = 0
                                logger.warning(f"Could not convert retweet_count '{row.get('retweet_count')}' to int for tweet {tweet_id}. Defaulting to 0.")
                        elif db_col == 'replies_count':
                            try:
                                tweet_data[db_col] = int(row['reply_count']) if 'reply_count' in row and pd.notna(row['reply_count']) else 0
                            except (ValueError, TypeError):
                                tweet_data[db_col] = 0
                                logger.warning(f"Could not convert reply_count '{row.get('reply_count')}' to int for tweet {tweet_id}. Defaulting to 0.")
                        elif db_col == 'link':
                            tweet_data[db_col] = str(row['tweet_url']) if 'tweet_url' in row and pd.notna(row['tweet_url']) else None
                        elif db_col == 'photos':
                            tweet_data[db_col] = str(row['image_url']) if 'image_url' in row and pd.notna(row['image_url']) else None
                        elif db_col == 'user_id':
                            tweet_data[db_col] = str(row['user_id_str']) if 'user_id_str' in row and pd.notna(row['user_id_str']) else None
                        elif db_col == 'username':
                            # PERBAIKAN: Penanganan eksplisit untuk username
                            raw_username = row.get('username') # Gunakan .get() untuk akses yang lebih aman
                            tweet_data[db_col] = str(raw_username) if pd.notna(raw_username) else None
                            if tweet_data[db_col] is None:
                                logger.warning(f"Kolom 'username' ditemukan tapi kosong (NaN) untuk tweet ID {tweet_id}. Disimpan sebagai None. Raw value: '{raw_username}'")
                        elif db_col == 'conversation_id':
                            tweet_data[db_col] = str(row['conversation_id_str']) if 'conversation_id_str' in row and pd.notna(row['conversation_id_str']) else None
                        elif db_col == 'place':
                            tweet_data[db_col] = str(row['location']) if 'location' in row and pd.notna(row['location']) else None
                        elif db_col == 'quote_url':
                            tweet_data[db_col] = str(row['quote_url']) if 'quote_url' in row and pd.notna(row['quote_url']) else None
                        elif db_col == 'video':
                            tweet_data[db_col] = False # tweet-harvest tidak selalu menyediakan ini secara langsung sebagai bool
                        elif db_col == 'retweet':
                            tweet_data[db_col] = False # tweet-harvest tidak selalu menyediakan ini secara langsung sebagai bool
                        elif db_col == 'name': # Asumsi 'name' (display name user) mungkin tidak selalu ada
                            tweet_data[db_col] = None
                        elif db_col == 'urls':
                            tweet_data[db_col] = None
                        elif db_col == 'thumbnail':
                            tweet_data[db_col] = None
                        elif db_col == 'translate':
                            tweet_data[db_col] = None
                        elif db_col == 'trans_src':
                            tweet_data[db_col] = None
                        elif db_col == 'trans_dest':
                            tweet_data[db_col] = None
                        else: # Penanganan generik untuk kolom lain jika dipetakan langsung
                            if csv_col_name in row and pd.notna(row[csv_col_name]):
                                tweet_data[db_col] = str(row[csv_col_name]) # Pastikan disimpan sebagai string
                            else:
                                tweet_data[db_col] = None

                    new_tweet = Tweet(**tweet_data)
                    tweets_to_add.append(new_tweet)

                except KeyError as ke:
                    logger.error(f"❌ Kolom yang diharapkan tidak ditemukan dalam data DataFrame saat memproses tweet ID {row.get('id', 'N/A')}: '{ke}'. Baris diabaikan.")
                except Exception as e:
                    logger.error(f"❌ Gagal memproses atau menambahkan tweet ID {row.get('id', 'N/A')} ke batch database: {e}", exc_info=True)

            if tweets_to_add:
                try:
                    logger.info(f"Mencoba menyimpan {len(tweets_to_add)} tweet ke database...")
                    db.session.bulk_save_objects(tweets_to_add)
                    db.session.commit()
                    saved_count = len(tweets_to_add)
                    logger.info(f"✅ Berhasil menyimpan {saved_count} tweet baru ke database.")
                except Exception as e:
                    db.session.rollback() # Rollback jika ada kesalahan saat commit
                    logger.error(f"❌ Error saat melakukan commit ke database: {e}", exc_info=True)
                    raise e # Re-raise exception
            else:
                logger.info("Tidak ada tweet baru yang perlu disimpan ke database (mungkin semua sudah ada atau tidak ada data yang valid).")
    else:
        logger.warning("DataFrame hasil scraping kosong, tidak ada data untuk disimpan ke database.")

    return all_tweets

def run_scraping(keyword: str, count: int, since_date_str: str = None, until_date_str: str = None) -> dict:
    """
    Fungsi pembungkus untuk menjalankan proses scraping.

    Args:
        keyword (str): Kata kunci untuk scraping.
        count (int): Jumlah tweet yang akan discrap.
        since_date_str (str, optional): Tanggal mulai dalam format 'YYYY-MM-DD'.
        until_date_str (str, optional): Tanggal akhir dalam format 'YYYY-MM-DD'.

    Returns:
        dict: Kamus berisi pratinjau data, total tweet yang discrap, dan nama file.

    Raises:
        ValueError: Jika token tidak disetel atau format tanggal tidak valid.
        Exception: Jika terjadi kesalahan selama proses scraping.
    """
    safe_keyword = re.sub(r'[\\/:*?"<>|]', '', keyword).replace(' ', '_').strip()
    final_filename = f"hasil_scraping_{safe_keyword}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    auth_token = os.getenv("TWITTER_BEARER_TOKEN")

    if not auth_token:
        logger.critical("TWITTER_BEARER_TOKEN tidak disetel di environment variables server.")
        raise ValueError("TWITTER_BEARER_TOKEN tidak disetel di environment variables server. Harap atur di file .env Anda.")

    # Konversi string tanggal ke objek date
    since_date_obj = None
    if since_date_str:
        try:
            since_date_obj = datetime.strptime(since_date_str, '%Y-%m-%d').date()
        except ValueError:
            raise ValueError("Format tanggal 'since_date' tidak valid. Gunakan format YYYY-MM-DD.")
    
    until_date_obj = None
    if until_date_str:
        try:
            until_date_obj = datetime.strptime(until_date_str, '%Y-%m-%d').date()
        except ValueError:
            raise ValueError("Format tanggal 'until_date' tidak valid. Gunakan format YYYY-MM-DD.")

    if since_date_obj and until_date_obj and since_date_obj > until_date_obj:
        raise ValueError("Tanggal mulai tidak boleh lebih lambat dari tanggal akhir.")

    logger.info(f"Menerima permintaan scraping: keyword='{keyword}', count={count}")
    if since_date_obj:
        logger.info(f"Tanggal Mulai: {since_date_obj}")
    if until_date_obj:
        logger.info(f"Tanggal Akhir: {until_date_obj}")

    try:
        tweets_df = crawl_tweets(
            keyword=keyword,
            filename=final_filename,
            total_limit=count,
            auth_token=auth_token,
            since_date=since_date_obj,
            until_date=until_date_obj
        )

        # Siapkan data preview untuk respons API
        preview_df = tweets_df.head(10).copy()

        # Iterate over all columns for a more robust datetime and object handling for API response
        for col in preview_df.columns:
            if pd.api.types.is_datetime64_any_dtype(preview_df[col]):
                # Convert to UTC and then to ISO format for consistent API response
                if preview_df[col].dt.tz is not None:
                    preview_df[col] = preview_df[col].dt.tz_convert('UTC').dt.isoformat(timespec='milliseconds').str.replace('+00:00', 'Z')
                else:
                    # If timezone-naive, assume UTC for ISO format compatibility
                    preview_df[col] = preview_df[col].dt.isoformat(timespec='milliseconds') + 'Z'
            elif pd.api.types.is_object_dtype(preview_df[col]):
                # Convert all objects (strings) to string or None
                preview_df[col] = preview_df[col].apply(lambda x: str(x) if pd.notna(x) else None)
            else:
                # For other types, convert to string or None
                preview_df[col] = preview_df[col].apply(lambda x: str(x) if pd.notna(x) else None)

        final_preview_data = []
        for _, row in preview_df.iterrows():
            preview_entry = {
                'id_str': row.get('id', str(datetime.now().timestamp())), # 'id' setelah rename dari 'id_str'
                'tweet_url': row.get('link', None), # 'link' setelah map dari 'tweet_url'
                'username': row.get('username', None),
                'full_text': row.get('tweet', None), # 'tweet' setelah map dari 'full_text'
                'favorite_count': row.get('likes_count', 0), # 'likes_count' setelah map dari 'favorite_count'
                'retweet_count': row.get('retweets_count', 0), # 'retweets_count' setelah map dari 'retweet_count'
                'created_at': row.get('created_at', None),
                'user_id_str': row.get('user_id', None), # 'user_id' setelah map dari 'user_id_str'
                'conversation_id_str': row.get('conversation_id', None), # 'conversation_id' setelah map dari 'conversation_id_str'
                'in_reply_to_screen_name': row.get('in_reply_to_screen_name', None),
                'lang': row.get('lang', None),
                'location': row.get('place', None), # 'place' setelah map dari 'location'
                'quote_count': row.get('quote_count', 0),
                'reply_count': row.get('replies_count', 0), # 'replies_count' setelah map dari 'reply_count'
                'image_url': row.get('photos', None), # 'photos' setelah map dari 'image_url'
                'hashtags': row.get('hashtags', None),
                'mentions': row.get('mentions', None),
                'cashtags': row.get('cashtags', None),
                'retweet': row.get('retweet', False),
                'video': row.get('video', False),
                'date': row.get('date', None),
                'time': row.get('time', None),
                'timezone': row.get('timezone', None),
                'keyword_used': row.get('keyword_used', None),
                'scraped_at': row.get('scraped_at', None)
            }
            final_preview_data.append(preview_entry)

        return {
            "preview_data": final_preview_data,
            "total_scraped": len(tweets_df),
            "filename": final_filename
        }
    except Exception as e:
        logger.error(f"Gagal dalam proses run_scraping untuk keyword '{keyword}': {e}", exc_info=True)
        # Tambahkan pesan error yang lebih spesifik jika id_str hilang
        if "id_str" in str(e): # Mencari substring 'id_str' di pesan error
            raise Exception(f"Terjadi kesalahan saat scraping: {e}. Pastikan output tweet-harvest memiliki kolom 'id_str' atau 'id'.")
        raise e