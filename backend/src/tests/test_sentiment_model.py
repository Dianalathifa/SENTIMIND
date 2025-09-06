import sys
import os
import pandas as pd
import random
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

# Menambahkan direktori 'app' ke Python path agar bisa mengimpor module dari sana
current_script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.join(current_script_dir, '..', '..')
sys.path.insert(0, os.path.join(project_root, 'app'))

# Sekarang kita mengimpor KELAS SentimentAnalyzer
try:
    from sentiment_analyzer import SentimentAnalyzer
    print("Kelas 'SentimentAnalyzer' berhasil diimpor dari app/sentiment_analyzer.py.")
    # Inisialisasi analyzer hanya sekali
    analyzer = SentimentAnalyzer()
except ImportError as e:
    print(f"Error: Tidak dapat mengimpor kelas 'SentimentAnalyzer'. Pastikan app/sentiment_analyzer.py ada dan benar.")
    print(f"Detail error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Terjadi kesalahan saat menginisialisasi SentimentAnalyzer (memuat model, dll.): {e}")
    sys.exit(1)


# --- Fungsi ini TIDAK DIGUNAKAN LAGI secara langsung untuk mengambil tweet,
# --- melainkan kita akan membaca dari CSV berlabel. Biarkan saja sebagai referensi.
# def simulate_new_tweets(num_tweets=5):
#     """
#     Mensimulasikan data tweet baru yang "dicrawl".
#     """
#     sample_tweets = [
#         "Sangat senang dengan liburan ini, cuaca sempurna!",
#         "Layanan internet sangat buruk akhir-akhir ini, bikin frustrasi.",
#         "Rapat pagi ini cukup membosankan, tapi penting.",
#         "Produk baru ini inovatif dan sangat membantu!",
#         "Berita ekonomi terbaru tampak stabil, tidak ada yang mengejutkan.",
#         "Antrean di bank panjang sekali, membuang waktu.",
#         "Terima kasih untuk bantuan cepatnya, sangat menghargai.",
#         "Film yang baru saja saya tonton cukup standar, tidak istimewa.",
#         "Sangat kecewa dengan kualitas makanan di restoran itu.",
#         "Hari ini sangat produktif, merasa bahagia!"
#     ]
#     return random.sample(sample_tweets, min(num_tweets, len(sample_tweets)))

def main():
    print("--- Memulai Pengujian Analisis Sentimen Data Baru ---")

    # Path ke file CSV data baru yang dilabeli secara manual
    # Sesuaikan path ini agar sesuai dengan lokasi new_crawled_and_labeled_data.csv Anda
    # Berdasarkan gambar Anda, file ada di src/tests/
    new_labeled_data_path = os.path.join(current_script_dir, 'new_crawled_and_labeled_data.csv') # PATH DI SESUAIKAN

    try:
        new_labeled_data = pd.read_csv(new_labeled_data_path)
        print(f"Berhasil memuat data baru berlabel dari: {new_labeled_data_path}")

        if 'tweet_text' not in new_labeled_data.columns or 'actual_sentiment_manual' not in new_labeled_data.columns:
            print(f"Error: Kolom 'tweet_text' atau 'actual_sentiment_manual' tidak ditemukan di '{new_labeled_data_path}'.")
            print("Pastikan CSV memiliki dua kolom ini.")
            return
        
        # Gunakan tweet dari CSV berlabel manual sebagai 'data baru' yang disimulasikan
        # Ini memastikan bahwa setiap tweet yang diprediksi memiliki label aktual yang sesuai
        new_tweets = new_labeled_data['tweet_text'].tolist()
        
        print(f"\n{len(new_tweets)} tweet baru diambil dari CSV berlabel untuk analisis:")
        for i, tweet in enumerate(new_tweets):
            print(f"  {i+1}. {tweet}")

    except FileNotFoundError:
        print(f'Error: File CSV data baru yang dilabeli tidak ditemukan di: {new_labeled_data_path}.')
        print("Pastikan 'new_crawled_and_labeled_data.csv' berada di direktori yang sama dengan skrip.")
        sys.exit(1) # Keluar jika file tidak ditemukan
    except Exception as e:
        print(f"Terjadi kesalahan saat memuat data baru berlabel: {e}")
        sys.exit(1) # Keluar jika ada error lain saat memuat CSV


    results = []
    print("\nMelakukan analisis sentimen pada setiap tweet...")
    for i, tweet_text in enumerate(new_tweets):
        try:
            # Panggil metode predict_sentiment dari objek analyzer
            sentiment = analyzer.predict_sentiment(tweet_text)
            results.append({'tweet_text': tweet_text, 'predicted_sentiment': sentiment})
            print(f"  Tweet {i+1}: '{tweet_text[:50]}...' -> Sentimen: {sentiment}")
        except Exception as e:
            print(f"  Error menganalisis tweet '{tweet_text[:50]}...': {e}")
            results.append({'tweet_text': tweet_text, 'predicted_sentiment': f'Error: {e}'}) # Simpan error untuk debugging

    if not results:
        print("\nTidak ada hasil analisis sentimen untuk ditampilkan.")
        return

    results_df = pd.DataFrame(results)
    print("\n--- Ringkasan Hasil Analisis Sentimen ---")
    print(results_df)

    # --- Bagian untuk Akurasi (Membutuhkan Data Berlabel Manual) ---
    print("\n--- Evaluasi Akurasi pada Data Baru yang Dilabeli Manual ---")
    
    # Gabungkan hasil prediksi dengan data berlabel manual
    # Gunakan 'inner' join agar hanya tweet yang ada di kedua dataset yang dianalisis
    merged_df = pd.merge(results_df, new_labeled_data, on='tweet_text', how='inner')

    if merged_df.empty:
        print("Tidak ada tweet yang cocok antara hasil prediksi dan data berlabel manual.")
        print("Pastikan tweet di hasil prediksi sama persis dengan tweet di CSV berlabel manual.")
        print("Ini mungkin terjadi jika ada perbedaan spasi, kapitalisasi, atau karakter lain.")
        return

    print(f"Jumlah sampel yang cocok untuk evaluasi akurasi: {len(merged_df)}")

    # Definisikan label yang digunakan oleh model Anda. Penting untuk konsistensi.
    LABELS = ['Positif', 'Netral', 'Negatif'] # SESUAIKAN DENGAN LABEL ACTUAL MODEL ANDA!

    # Hitung Akurasi
    accuracy_new = accuracy_score(merged_df['actual_sentiment_manual'], merged_df['predicted_sentiment'])
    print(f'\nAkurasi pada data baru yang dilabeli manual: {accuracy_new:.4f}')

    # Hitung Confusion Matrix
    print('\nConfusion Matrix pada data baru:')
    cm_new = confusion_matrix(merged_df['actual_sentiment_manual'], merged_df['predicted_sentiment'], labels=LABELS)
    cm_new_df = pd.DataFrame(cm_new, index=[f'Aktual {l}' for l in LABELS], columns=[f'Prediksi {l}' for l in LABELS])        
    print(cm_new_df)

    # Hitung Metrik per Kelas (Precision, Recall, F1-Score)
    precision_new, recall_new, f1_score_new, _ = precision_recall_fscore_support(
        merged_df['actual_sentiment_manual'], merged_df['predicted_sentiment'], labels=LABELS, average=None, zero_division='warn'
    )
    metrics_new_df = pd.DataFrame({
        'Kelas': LABELS,
        'Presisi': precision_new.round(4),
        'Recall': recall_new.round(4),
        'F1-Score': f1_score_new.round(4)
    })
    print('\nMetrik per kelas pada data baru:')
    print(metrics_new_df.set_index('Kelas'))

    # Hitung Rata-rata Metrik (Macro dan Weighted Average)
    avg_precision_macro_new, avg_recall_macro_new, avg_f1_macro_new, _ = precision_recall_fscore_support(
        merged_df['actual_sentiment_manual'], merged_df['predicted_sentiment'], labels=LABELS, average='macro', zero_division='warn'
    )
    avg_precision_weighted_new, avg_recall_weighted_new, avg_f1_weighted_new, _ = precision_recall_fscore_support(
        merged_df['actual_sentiment_manual'], merged_df['predicted_sentiment'], labels=LABELS, average='weighted', zero_division='warn'
    )
    print(f'\nRata-rata (Macro) data baru - Presisi: {avg_precision_macro_new:.4f}, Recall: {avg_recall_macro_new:.4f}, F1: {avg_f1_macro_new:.4f}')
    print(f'Rata-rata (Weighted) data baru - Presisi: {avg_precision_weighted_new:.4f}, Recall: {avg_recall_weighted_new:.4f}, F1: {avg_f1_weighted_new:.4f}')

if __name__ == "__main__":
    main()