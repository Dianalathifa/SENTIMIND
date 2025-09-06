import pandas as pd
import os
import mysql.connector
import time
from backend.app.sentiment_analyzer import SentimentAnalyzer # <<< IMPORT MODUL BARU

# --- Konfigurasi Path (PENTING: Sesuaikan ini dengan struktur folder Anda) ---
# Dapatkan path absolut dari direktori tempat script ini berada (yaitu 'src/')
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Naik satu level untuk mendapatkan root proyek (dari 'src' ke 'SENTIMIND2')
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))

# Tentukan path ke folder output
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'output') # Folder untuk menyimpan hasil

# Pastikan folder output ada. Jika belum ada, script akan membuatnya.
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- Proses Inferensi Utama ---
if __name__ == "__main__":
    print("--- Memulai Inferensi Sentimen ---")

    # Inisialisasi SentimentAnalyzer (model akan dimuat di sini, sekali saja)
    try:
        analyzer = SentimentAnalyzer()
    except Exception as e:
        print(f"❌ ERROR FATAL: Gagal menginisialisasi SentimentAnalyzer. Detail: {e}")
        exit("Keluar karena kegagalan inisialisasi model.")

    # --- Bagian KONEKSI KE DATABASE MySQL ---
    df_scraped = pd.DataFrame() # Inisialisasi DataFrame kosong
    try:
        # Konfigurasi koneksi database MySQL Anda
        # GANTI DENGAN KREDENSIAL DATABASE ANDA YANG SEBENARNYA!
        db_config = {
            'host': 'localhost',
            'user': 'your_username',
            'password': 'your_password',
            'database': 'your_database_name'
        }

        print(f"--- Menghubungkan ke database MySQL '{db_config['database']}' di '{db_config['host']}' ---")
        conn = mysql.connector.connect(**db_config)

        if conn.is_connected():
            print("✅ Berhasil terhubung ke database MySQL.")
            cursor = conn.cursor(dictionary=True)

            query = "SELECT id, full_text FROM tweet ORDER BY id DESC LIMIT 4000"

            cursor.execute(query)
            records = cursor.fetchall()

            if records:
                df_scraped = pd.DataFrame(records)
                print(f"✅ Berhasil mengambil {len(df_scraped)} data dari MySQL.")
            else:
                print("⚠️ Tidak ada data ditemukan di tabel 'tweet'.")
                exit("Keluar: Tidak ada data dari database untuk diproses.")

            cursor.close()
            conn.close()
            print("✅ Koneksi MySQL ditutup.")
        else:
            raise Exception("Gagal terhubung ke database MySQL.")

    except mysql.connector.Error as err:
        print(f"❌ ERROR FATAL: Kesalahan koneksi database atau query: {err}")
        exit("Keluar karena kesalahan database.")
    except Exception as e:
        print(f"❌ ERROR FATAL: Terjadi kesalahan tak terduga selama operasi database: {e}")
        exit("Keluar karena kegagalan database yang kritis.")

    # --- Proses Pra-pemrosesan dan Prediksi Sentimen ---
    df_scraped = df_scraped.dropna(subset=['full_text'])
    df_scraped['full_text'] = df_scraped['full_text'].astype(str)
    df_scraped = df_scraped.drop_duplicates(subset=['full_text'], keep='first')
    print(f"Jumlah data setelah membersihkan duplikat dan NaN: {len(df_scraped)}")

    df_scraped['predicted_sentiment'] = None
    df_scraped['preprocessed_text_for_inference'] = None

    print("\n--- Memulai Prediksi Sentimen ---")
    start_time = time.time()

    for index, row in df_scraped.iterrows():
        original_text = row['full_text']

        # Menggunakan metode predict_sentiment dari objek analyzer
        sentiment_result = analyzer.predict_sentiment(original_text)
        
        # Karena predict_sentiment bisa mengembalikan string error atau sentimen,
        # kita perlu menanganinya
        if "Error Prediksi" in sentiment_result or "Tidak Dapat Diprediksi" in sentiment_result:
            df_scraped.at[index, 'predicted_sentiment'] = sentiment_result
            df_scraped.at[index, 'preprocessed_text_for_inference'] = '' # Kosongkan jika ada error
        else:
            df_scraped.at[index, 'predicted_sentiment'] = sentiment_result
            # Untuk mendapatkan preprocessed_text, kita perlu sedikit penyesuaian
            # karena predict_sentiment hanya mengembalikan label.
            # Jika Anda butuh preprocessed_text, Anda bisa memodifikasi predict_sentiment
            # untuk mengembalikan tuple (sentiment, preprocessed_text)
            # Untuk saat ini, kita bisa memproses ulang atau menghapusnya jika tidak mutlak perlu di DataFrame
            
            # Alternatif: tambahkan metode di analyzer untuk hanya preprocessing
            # df_scraped.at[index, 'preprocessed_text_for_inference'] = " ".join(analyzer._full_preprocessing_pipeline(original_text))
            # Atau, jika Anda hanya perlu sentimen, baris ini bisa dihapus dari DataFrame
            # atau diisi dengan placeholder.
            # Untuk demo ini, saya akan tambahkan kembali preprocessingnya (tidak ideal jika sudah dilakukan di dalam predict_sentiment)
            df_scraped.at[index, 'preprocessed_text_for_inference'] = " ".join(analyzer._full_preprocessing_pipeline(original_text))


    end_time = time.time()
    print(f"Prediksi sentimen selesai dalam {(end_time - start_time)/60:.2f} menit.")

    # Simpan hasil prediksi ke file CSV di folder 'output'
    output_inference_filename = os.path.join(OUTPUT_DIR, 'ScrapedData_with_predicted_sentiment_from_mysql.csv')
    df_scraped.to_csv(output_inference_filename, index=False)
    print(f"\n✅ Hasil prediksi sentimen disimpan ke '{output_inference_filename}'.")

    print("\nContoh beberapa hasil prediksi:")
    print(df_scraped[['full_text', 'preprocessed_text_for_inference', 'predicted_sentiment']].head(10))
    print(f"\nDistribusi prediksi sentimen:\n{df_scraped['predicted_sentiment'].value_counts()}")

    print("\n--- Inferensi Selesai ---")