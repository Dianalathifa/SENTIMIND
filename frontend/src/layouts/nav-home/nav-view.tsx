import styles from './nav-view.module.css';

import { FaBars } from 'react-icons/fa';
import React, { useState, useRef, useEffect } from 'react';

import { links, social } from './data';
import logo from '../../../dist/favicon.ico';

const Navbar = () => {
  const [showLinks, setShowLinks] = useState(false);
  const linksContainerRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (showLinks) {
      const height = linksRef.current?.getBoundingClientRect().height || 0;
      if (linksContainerRef.current) {
        linksContainerRef.current.style.height = `${height}px`;
      }
    } else {
      if (linksContainerRef.current) {
        linksContainerRef.current.style.height = '0px';
      }
    }
  }, [showLinks]);

  return (
    <nav className={styles.nav}>
      <div className={styles['nav-center']}>
        <div className={styles['nav-header']}>
          <img src={logo} className={styles.logo} alt="logo" />
          <button className={styles['nav-toggle']} onClick={() => setShowLinks(!showLinks)}>
            <FaBars />
          </button>
        </div>

        <div className={styles['links-container']} ref={linksContainerRef}>
          <ul className={styles.links} ref={linksRef}>
            {links.map(({ id, url, text }) => (
              <li key={id}>
                <a href={url}>{text}</a>
              </li>
            ))}
          </ul>
        </div>

        <ul className={styles.social_icons}>
        {social.map(({ id, url, icon: Icon }) => (
            <li key={id}>
            <a href={url} target="_blank" rel="noreferrer">
                <Icon />
            </a>
            </li>
        ))}
        </ul>

      </div>
    </nav>
  );
};

export default Navbar;
