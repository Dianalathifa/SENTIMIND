import pandas as pd
import numpy as np
import re
import os
import joblib
from nlp_id.stopword import StopWord
from nlp_id.lemmatizer import Lemmatizer
from nlp_id.tokenizer import Tokenizer
from gensim.models import Word2Vec


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))

MODELS_DIR = os.path.join(BACKEND_ROOT, 'models')
SLANGWORD_FILE_PATH = os.path.join(BACKEND_ROOT, 'slangword.csv') 

SWEAR_WORDS = [
    'anjing', 'bajingan', 'keparat', 'bangsat', 'tolol', 'babi', 'kontol', 'sialan', 'memek',
    'perek', 'tai', 'goblok', 'kampret', 'parah', 'celaka', 'gila', 'mampus', 'pukimak',
    'setan', 'banci', 'jancok', 'brengsek', 'asu', 'bego', 'bodoh', 'dongo', 'ngentot',
    'ngeselin', 'bacot', 'jembut', 'titid', 'bencong', 'cacat', 'edan', 'idiot',
    'keparat', 'kurap', 'lonte', 'ngewe', 'peler', 'sampah', 'syalan'
]

class SentimentAnalyzer:
    def __init__(self):
        print(f"--- Menginisialisasi SentimentAnalyzer. Memuat model dari: {MODELS_DIR} ---")
        
        self.tokenizer_id = Tokenizer()
        self.stopword_id = StopWord()
        self.lemmatizer_id = Lemmatizer()

        self.slangword_dict = self._load_slangword_dict(SLANGWORD_FILE_PATH)
        if not self.slangword_dict:
            print("Peringatan: Kamus slangword tidak berhasil dimuat. Pra-pemrosesan slangword mungkin tidak berfungsi.")

        try:
            self.loaded_best_pipeline = joblib.load(os.path.join(MODELS_DIR, 'svm_sentiment_pipeline_optimized.pkl'))
            self.loaded_word2vec_model = Word2Vec.load(os.path.join(MODELS_DIR, 'word2vec_model_optimized.model'))
            self.loaded_tfidf_vectorizer = joblib.load(os.path.join(MODELS_DIR, 'tfidf_vectorizer_optimized.pkl'))
            print("✅ Semua model yang diperlukan berhasil dimuat.")
        except FileNotFoundError as e:
            print(f"❌ ERROR FATAL: Satu atau lebih file model tidak ditemukan. Pastikan semua file berada di direktori '{MODELS_DIR}'. Detail: {e}")
            raise
        except Exception as e:
            print(f"❌ ERROR FATAL: Kesalahan saat memuat model. Ini bisa terjadi jika model korup, atau versi Python/pustaka tidak kompatibel. Detail: {e}")
            raise

    def _load_slangword_dict(self, slangword_file_path):
        """Memuat kamus slangword dari file CSV."""
        try:
            slang_df = pd.read_csv(slangword_file_path)
            slangword_dict = dict(zip(slang_df['original'], slang_df['translated']))
            return slangword_dict
        except FileNotFoundError:
            print(f"Error: File kamus slang word '{slangword_file_path}' tidak ditemukan. Inferensi mungkin tidak akurat.")
            return {}

    def _casefolding(self, text):
        """Mengubah teks menjadi huruf kecil."""
        return text.lower()

    def _cleaning_text(self, text):
        """Membersihkan teks dari URL, mention, hashtag, angka, dan karakter non-alfanumerik."""
        text = re.sub(r"http\S+|www\S+|https\S+", "", text)  # Remove URLs
        text = re.sub(r"@\w+", "", text)  # Remove mentions
        text = re.sub(r"#\w+", "", text)  # Remove hashtags
        text = re.sub(r"\d+", "", text)  # Remove numbers
        text = re.sub(r"[^\w\s]", "", text)  # Remove punctuation
        return text

    def _slangword_tonormal(self, tokens):
        """Mengganti kata slang menjadi kata normal berdasarkan kamus."""
        return [self.slangword_dict.get(word, word) for word in tokens]

    def _remove_swear_words(self, tokens):
        """Menghapus kata-kata kasar dari daftar token."""
        return [word for word in tokens if word not in SWEAR_WORDS]

    def _lemmatize_and_stopword_removal(self, text):
        """Melakukan lemmatisasi dan penghapusan stopword."""
        lemmatized_text = self.lemmatizer_id.lemmatize(text)
        cleaned_text = self.stopword_id.remove_stopword(lemmatized_text)
        return cleaned_text

    def _full_preprocessing_pipeline(self, text):
        """Pipeline preprocessing lengkap untuk inferensi."""
        text = self._casefolding(text)
        text = self._cleaning_text(text)
        tokens = text.split()
        tokens = self._slangword_tonormal(tokens)
        tokens = self._remove_swear_words(tokens)
        processed_text_str = " ".join(tokens)
        final_processed_text_str = self._lemmatize_and_stopword_removal(processed_text_str)
        return self.tokenizer_id.tokenize(final_processed_text_str)

    def _get_sentence_embedding(self, tokens):
        """Menghasilkan fitur Word2Vec yang dibobotkan TF-IDF."""
        if not hasattr(self.loaded_tfidf_vectorizer, 'idf_'):
            raise ValueError("TF-IDF Vectorizer belum di-fit.")
        
        try:
            tfidf_weights = dict(zip(self.loaded_tfidf_vectorizer.get_feature_names_out(), self.loaded_tfidf_vectorizer.idf_))
        except AttributeError: # Fallback untuk versi scikit-learn yang lebih lama
            tfidf_weights = dict(zip(self.loaded_tfidf_vectorizer.get_feature_names(), self.loaded_tfidf_vectorizer.idf_))

        vectors = []
        for word in tokens:
            if word in self.loaded_word2vec_model.wv and word in tfidf_weights:
                vectors.append(self.loaded_word2vec_model.wv[word] * tfidf_weights[word])

        if vectors:
            avg_vector = np.mean(vectors, axis=0)
        else:
            # Jika tidak ada kata yang ditemukan, kembalikan vektor nol dengan dimensi Word2Vec
            avg_vector = np.zeros(self.loaded_word2vec_model.vector_size)

        return avg_vector.reshape(1, -1)

    # --- Metode Prediksi Utama ---
    def predict_sentiment(self, text):
        """
        Melakukan preprocessing dan prediksi sentimen untuk satu teks.
        Mengembalikan label sentimen (Positif, Negatif, Netral) atau pesan error.
        """
        if pd.isna(text) or not str(text).strip():
            return 'Tidak Dapat Diprediksi (Teks Kosong)'

        preprocessed_tokens = self._full_preprocessing_pipeline(str(text))

        if not preprocessed_tokens:
            return 'Tidak Dapat Diprediksi (Kosong Setelah Preprocessing)'
        
        try:
            features = self._get_sentence_embedding(preprocessed_tokens)
            predicted_sentiment = self.loaded_best_pipeline.predict(features)[0]
            return predicted_sentiment
        except Exception as e:
            # Ini bisa jadi logging ke file atau sistem monitoring di aplikasi nyata
            print(f"Peringatan: Gagal memprediksi untuk teks '{str(text)[:50]}...'. Error: {e}")
            return f'Error Prediksi: {e}'

# Contoh penggunaan (opsional, untuk menguji modul ini secara langsung)
if __name__ == "__main__":
    try:
        analyzer = SentimentAnalyzer()
        
        # Contoh teks dari database atau input lainnya
        sample_texts = [
            "Layanan pelanggan sangat buruk hari ini, saya sangat kecewa.",
            "Produk ini luar biasa! Saya sangat merekomendasikannya.",
            "Cuaca hari ini cukup cerah, tidak terlalu panas.",
            "Pemerintah perlu lebih memperhatikan kesejahteraan rakyat."
        ]

        print("\n--- Melakukan prediksi untuk contoh teks ---")
        for text in sample_texts:
            sentiment = analyzer.predict_sentiment(text)
            print(f"Teks: '{text}'\nSentimen: {sentiment}\n")

        print("\n--- Memproses 'ScrapedData.csv' ---")
        scraped_data_path = os.path.join(BACKEND_ROOT, 'ScrapedData.csv')

        if not os.path.exists(scraped_data_path):
            print(f"File '{scraped_data_path}' tidak ditemukan. Lewati pemrosesan CSV.")
        else:
            try:
                df_scraped = pd.read_csv(scraped_data_path)
                print(f"Memuat {len(df_scraped)} baris dari 'ScrapedData.csv'.")

                if 'full_text' not in df_scraped.columns:
                    print("Kolom 'full_text' tidak ditemukan di ScrapedData.csv. Lewati pemrosesan CSV.")
                else:
                    df_scraped['predicted_sentiment'] = None
                    df_scraped['preprocessed_text_for_inference'] = None

                    start_time = pd.Timestamp.now()
                    for index, row in df_scraped.iterrows():
                        original_text = row['full_text']
                        
                        # Preprocessing teks lengkap
                        preprocessed_tokens = analyzer._full_preprocessing_pipeline(str(original_text))
                        df_scraped.at[index, 'preprocessed_text_for_inference'] = " ".join(preprocessed_tokens)

                        sentiment = analyzer.predict_sentiment(original_text)
                        df_scraped.at[index, 'predicted_sentiment'] = sentiment
                    end_time = pd.Timestamp.now()
                    
                    print(f"Analisis sentimen pada CSV selesai dalam {(end_time - start_time).total_seconds():.2f} detik.")

                    output_inference_filename = os.path.join(BACKEND_ROOT, 'ScrapedData_with_predicted_sentiment.csv')
                    df_scraped.to_csv(output_inference_filename, index=False)
                    print(f"Hasil prediksi disimpan ke '{output_inference_filename}'.")

                    print("\nContoh beberapa hasil prediksi:")
                    print(df_scraped[['full_text', 'preprocessed_text_for_inference', 'predicted_sentiment']].head(10))
                    print(f"\nDistribusi sentimen yang diprediksi:\n{df_scraped['predicted_sentiment'].value_counts()}")

            except Exception as e:
                print(f"Error saat memproses ScrapedData.csv: {e}")

    except Exception as e:
        print(f"Gagal menginisialisasi SentimentAnalyzer: {e}")