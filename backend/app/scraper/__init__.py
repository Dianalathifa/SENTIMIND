from .tweet_scraper import crawl_tweets

def run_scraping():
    keyword = "kesehatan mental"
    filename = "hasil_scraping.csv"
    auth_token = "a26cf56f3731ef63f318b50fe993ab64ebc4c0ad"  # Ganti dengan tokenmu

    hasil = crawl_tweets(
        keyword=keyword,
        filename=filename,
        total_limit=300,
        batch_size=500,
        sleep_duration=60,
        auth_token=auth_token
    )

    return {
        "total": len(hasil),
        "file": f"tweets-data/{filename}"
    }
