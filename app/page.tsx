import MainView from "./components/main-view/MainView";
import AutoScroll from "./components/auto-scroll/AutoScroll";
import CallToAction from "./components/call-to-action/CallToAction";
import Footer from "./components/footer/Footer";
import Industries from "./components/industries/Industries";
import WhatWeDo from "./components/whatwedo/WhatWeDo";

export default function Home() {
  return (
    <main>
      {/* Main View - Hero Section */}
      <section id="main-view">
        <MainView />
      </section>
      
      {/* What We Do - Servicios */}
      <section id="what-we-do">
        <WhatWeDo />
      </section>

      {/* Industries - Especializaciones */}
      <section id="industries">
        <Industries />
      </section>

      {/* Call to Action - Contacto */}
      <section id="call-to-action">
        <CallToAction />
      </section>

      {/* Footer */}
      <Footer />
      
      {/* Auto Scroll */}
      <AutoScroll />
    </main>
  )
}