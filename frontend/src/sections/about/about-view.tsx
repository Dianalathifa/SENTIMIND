import styles from './about.module.css';

import React from 'react';

import Navbar from '../.././layouts/nav-home/nav-view';

const About = () => (
  <div className={styles.aboutBackground}>
    <Navbar />

    <section className={styles.aboutSection}>
      <h2 className={styles.aboutTitle}>About</h2>

      <div className={styles.aboutContent}>
        {/* Kiri */}
        <div className={styles.featureBox}>
          <div className={styles.featureIcon} />
          <div>
            <h3 className={styles.featureTitle}>Crawling</h3>
            <p className={styles.featureText}>
              Crawling memungkinkan kamu mengumpulkan data otomatis dari media sosial secara real-time.
              Contohnya, kamu bisa melacak opini publik tentang suatu produk atau isu tertentu.
            </p>
          </div>
        </div>

        {/* Gambar Tengah */}
        <div className={styles.imageWrapper}>
          <img
            src="../../../dist/assets/images/about/about-illustration.png"
            alt="About Illustration"
            className={styles.aboutImage}
          />
        </div>

        {/* Kanan */}
        <div className={styles.featureBox}>
          <div className={styles.featureIcon} />
          <div>
            <h3 className={styles.featureTitle}>Sentimen Analisis</h3>
            <p className={styles.featureText}>
              Sentimen Analisis membantu mengenali apakah opini bersifat positif, negatif, atau netral,
              sehingga kamu bisa memahami emosi publik secara cepat dan akurat.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
);


export default About;
