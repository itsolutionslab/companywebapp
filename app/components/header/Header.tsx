"use client";
import React, { useState, useEffect, useRef } from "react";
import styles from "./Header.module.css";
// Importa la imagen
import logoImage from '../../assets/bpLogo.png';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("main-view");
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Secciones para navegación
  const menuItems = [
    { name: "Inicio", id: "main-view", icon: "🏠" },
    { name: "Servicios", id: "what-we-do", icon: "⚡" },
    { name: "Industrias", id: "industries", icon: "🏭" },
    { name: "Contacto", id: "call-to-action", icon: "📞" }
  ];

  // Efecto para detectar scroll y sección activa
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
      
      // Detectar sección activa
      const sections = menuItems.map(item => item.id);
      const current = sections.find(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });
      
      if (current) setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Función para scroll suave a sección
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = headerRef.current?.offsetHeight || 70; // 70px mobile first
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      setIsMenuOpen(false);
    }
  };

  // Cerrar menú al hacer resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 969) { // Cambiado a 969px para desktop
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header 
      ref={headerRef}
      className={`${styles.header} ${isScrolled ? styles.scrolled : ''} ${isMenuOpen ? styles.menuOpen : ''}`}
    >
      {/* Fondo animado */}
      <div className={styles.headerBackground}>
        <div className={styles.floatingParticles}>
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={styles.particle}
              style={{
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${12 + i * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className={styles.headerContainer}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <div className={styles.logo} onClick={() => scrollToSection('main-view')}>
            <div className={styles.logoContainer}>
              <div className={styles.logo} onClick={() => scrollToSection('main-view')}>
                <img 
                  src={logoImage.src} 
                  alt="Brecomperu - IT Solutions"
                  className={styles.logoImage}
                />
              </div>
            </div>
            <div className={styles.logoText}>
              <span className={styles.logoPrimary}>Brecomperu</span>
              <span className={styles.logoSecondary}>IT Solutions</span>
            </div>
          </div>
        </div>

        {/* Navegación Desktop - Solo se muestra en desktop */}
        <nav className={styles.navDesktop}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeSection === item.id ? styles.active : ''}`}
              onClick={() => scrollToSection(item.id)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navText}>{item.name}</span>
              <div className={styles.navUnderline}></div>
            </button>
          ))}
        </nav>

        {/* CTA Desktop - Solo se muestra en desktop */}
        <div className={styles.headerActions}>
          <a href="tel:+51972243083" className={styles.ctaButton}>
            <span className={styles.ctaIcon}>📞</span>
            <span className={styles.ctaText}>+51 972 243 083</span>
          </a>
        </div>

        {/* Botón móvil - Siempre visible en mobile/tablet */}
        <button 
          className={styles.menuToggle}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <div className={`${styles.hamburger} ${isMenuOpen ? styles.active : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>

      {/* Menú móvil - Solo para mobile/tablet */}
      <div className={`${styles.mobileMenu} ${isMenuOpen ? styles.active : ''}`}>
        <nav className={styles.navMobile}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.mobileNavItem} ${activeSection === item.id ? styles.active : ''}`}
              onClick={() => scrollToSection(item.id)}
            >
              <span className={styles.mobileNavIcon}>{item.icon}</span>
              <span className={styles.mobileNavText}>{item.name}</span>
              <div className={styles.mobileNavIndicator}></div>
            </button>
          ))}
          
          <div className={styles.mobileActions}>
            <a href="tel:+51972243083" className={styles.mobileCta}>
              <span>📞 Llamar Ahora</span>
              <span className={styles.mobilePhone}>+51 972 243 083</span>
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;