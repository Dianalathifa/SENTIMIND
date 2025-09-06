import styles from './home.module.css';

import { Link as RouterLink } from 'react-router-dom';
import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

import Navbar from '../../../layouts/nav-home/nav-view';

interface FeatureCardProps {
  iconSrc: string;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ iconSrc, title, description }) => (
  <div className={styles.featureCard}>
    <img src={iconSrc} alt={title} className={styles.featureIcon} loading="lazy" />
    <h3 className={styles.featureTitle}>{title}</h3>
    <p className={styles.featureDescription}>{description}</p>
  </div>
);

interface BlogCardProps {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  link: string; // Link ke halaman blog detail
}

const BlogCard: React.FC<BlogCardProps> = ({ imageUrl, title, description, link }) => ( // <-- Ganti '{' dengan '(' di sini
  <motion.div // Pastikan ini 'motion.div' dengan 'd' kecil
    className={styles.blogCard}
    whileHover={{ scale: 1.05 }}
    transition={{ type: "spring", stiffness: 400, damping: 10 }}
  >
    <img src={imageUrl} alt={title} className={styles.blogImage} loading="lazy" />
    <div className={styles.blogContent}>
      <h3 className={styles.blogTitle}>{title}</h3>
      <p className={styles.blogDescription}>{description}</p>
      <RouterLink to={link} className={styles.blogLink}>Baca Selengkapnya &rarr;</RouterLink>
    </div>
  </motion.div>
);

const Home: React.FC = () => {
  const processRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const blogRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: processScrollYProgress } = useScroll({
    target: processRef,
    offset: ["start end", "end start"]
  });
  const processOpacity = useTransform(processScrollYProgress, [0.3, 0.7, 0.9], [0, 1, 0]);
  const processY = useTransform(processScrollYProgress, [0.3, 0.7, 0.9], ["-50px", "0px", "50px"]);

  // Efek scroll untuk bagian "Fitur Unggulan"
  const { scrollYProgress: featuresScrollYProgress } = useScroll({
    target: featuresRef,
    offset: ["start end", "end start"]
  });
  const featuresOpacity = useTransform(featuresScrollYProgress, [0.3, 0.7, 0.9], [0, 1, 0]);
  const featuresScale = useTransform(featuresScrollYProgress, [0.3, 0.7, 0.9], [0.8, 1, 0.8]);

  // Efek scroll untuk bagian "Rekomendasi Blog Terbaru"
  const { scrollYProgress: blogScrollYProgress } = useScroll({
    target: blogRef,
    offset: ["start end", "end start"]
  });
  const blogOpacity = useTransform(blogScrollYProgress, [0.3, 0.7, 0.9], [0, 1, 0]);
  const blogY = useTransform(blogScrollYProgress, [0.3, 0.7, 0.9], ["50px", "0px", "-50px"]);


  // Contoh data fitur (sesuaikan dengan ikon Anda)
  const featuresData = [
    {
      iconSrc: "../../../../dist/assets/images/home/icon-web-crawling.png", // Ganti dengan path ikon Anda
      title: "Web Crawling Efisien",
      description: "Ambil data tweet terbaru dari berbagai platform dengan cepat dan akurat."
    },
    {
      iconSrc: "../../../../dist/assets/images/home/icon-sentiment.png", // Ganti dengan path ikon Anda
      title: "Analisis Sentimen Akurat",
      description: "Identifikasi opini (Positif, Negatif, Netral) secara otomatis menggunakan AI."
    },
    {
      iconSrc: "../../../../dist/assets/images/home/icon-dashboard.png", // Ganti dengan path ikon Anda
      title: "Visualisasi Data Interaktif",
      description: "Lihat tren sentimen dan statistik dalam dashboard yang mudah dipahami."
    },
    // Tambahkan lebih banyak fitur jika ada
  ];

  // Contoh data blog terbaru (sesuaikan dengan data dummy atau fetch dari API)
  const latestBlogsData: BlogCardProps[] = [
    {
      id: '1',
      imageUrl: "../../../../dist/assets/images/blog/blog-post-1.jpg", // Ganti dengan path gambar blog Anda
      title: "Memahami Apa Itu Sentimen Analisis",
      description: "Pelajari dasar-dasar sentimen analisis dan bagaimana teknologi ini bekerja...",
      link: "/blog/memahami-sentimen-analisis"
    },
    {
      id: '2',
      imageUrl: "../../../../dist/assets/images/blog/blog-post-2.jpg", // Ganti dengan path gambar blog Anda
      title: "Strategi Web Crawling untuk Pemula",
      description: "Panduan lengkap untuk memulai proyek web crawling pertama Anda...",
      link: "/blog/strategi-web-crawling"
    },
    {
      id: '3',
      imageUrl: "../../../../dist/assets/images/blog/blog-post-3.jpg", // Ganti dengan path gambar blog Anda
      title: "Manfaat Analisis Sentimen dalam Bisnis",
      description: "Bagaimana perusahaan menggunakan sentimen analisis untuk membuat keputusan yang lebih baik...",
      link: "/blog/manfaat-sentimen-bisnis"
    },
  ];

  // Untuk memastikan halaman discroll ke atas saat dimuat
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.homeBackground}>
      <Navbar />

      {/* SECTION 1: Hero Section */}
      <section className={styles.heroSection}>
        {/* Konten Hero */}
        <div className={styles.heroContentWrapper}>
          <div className={styles.heroLeft}>
            <h1 className={styles.titleHome}>
              Kenali Opini,<br />Pahami Emosi
            </h1>
            <p className={styles.t2}>
              Analisis Sentimen Cerdas untuk Keputusan Lebih Baik!
            </p>
            <RouterLink to="/crawling-user" className={styles.crawlingButton}>
              Crawling Sekarang!
            </RouterLink>
          </div>

          <div className={styles.heroRight}>
            <img
              src="../../../../dist/assets/images/home/analysis.png"
              alt="Ilustrasi Analisis Tim"
              className={styles.analysisImage}
              loading="lazy"
            />
          </div>
        </div>
        {/* Gambar Sosial di posisi baru, di bawah heroContentWrapper */}
        <img
          src="../../../../dist/assets/images/home/sosial.png"
          alt="Ilustrasi Media Sosial"
          className={styles.sosialImageHero}
          loading="lazy"
        />
      </section>

      {/* SECTION 2: Bagaimana Cara Kerjanya? (Animasi Saat Scroll) */}
      <motion.section
        ref={processRef}
        className={styles.processSection}
        style={{ opacity: processOpacity, y: processY }}
      >
        <h2 className={styles.sectionTitle}>Bagaimana Cara Kerjanya?</h2>
        <div className={styles.processSteps}>
          <div className={styles.processStep}>
            <div className={styles.stepNumber}>1</div>
            <h3>Web Crawling</h3>
            <p>Sistem kami secara otomatis mengumpulkan data tweet terbaru dari platform media sosial berdasarkan kata kunci yang Anda tentukan. Data ini mencakup teks tweet, informasi pengguna, jumlah likes, retweets, dan lainnya.</p>
          </div>
          <div className={styles.processStep}>
            <div className={styles.stepNumber}>2</div>
            <h3>Analisis Sentimen</h3>
            <p>Setelah data terkumpul, model AI kami menganalisis teks setiap tweet untuk menentukan sentimennya: Positif, Negatif, atau Netral. Proses ini dilakukan dengan cepat dan akurat untuk memberikan gambaran opini publik.</p>
          </div>
          <div className={styles.processStep}>
            <div className={styles.stepNumber}>3</div>
            <h3>Visualisasi Data</h3>
            <p>Hasil analisis sentimen disajikan dalam bentuk dashboard interaktif. Anda dapat melihat tren sentimen, distribusi opini, dan statistik penting lainnya untuk membantu Anda membuat keputusan yang lebih baik.</p>
          </div>
        </div>
      </motion.section>

      {/* SECTION 3: Fitur Unggulan (Animasi Saat Scroll) */}
      <motion.section
        ref={featuresRef}
        className={styles.featuresSection}
        style={{ opacity: featuresOpacity, scale: featuresScale }}
      >
        <h2 className={styles.sectionTitle}>Fitur Unggulan Sentitrend</h2>
        <div className={styles.featuresGrid}>
          {featuresData.map((feature, index) => (
            <FeatureCard
              key={index}
              iconSrc={feature.iconSrc}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </motion.section>

      {/* SECTION 4: Rekomendasi Blog Terbaru (Animasi Saat Scroll) */}
      <motion.section
        ref={blogRef}
        className={styles.blogSection}
        style={{ opacity: blogOpacity, y: blogY }}
      >
        <h2 className={styles.sectionTitle}>Rekomendasi Blog Terbaru</h2>
        <div className={styles.blogGrid}>
          {latestBlogsData.map((blog) => (
            <BlogCard
              key={blog.id}
              id={blog.id}
              imageUrl={blog.imageUrl}
              title={blog.title}
              description={blog.description}
              link={blog.link}
            />
          ))}
        </div>
      </motion.section>
    </div>
  );
};

export default Home;