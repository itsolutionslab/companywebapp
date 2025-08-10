import AutoScroll from "./components/auto-scroll/AutoScroll";
import CallToAction from "./components/call-to-action/CallToAction";
import Footer from "./components/footer/Footer";
import Header from "./components/header/Header";
import Industries from "./components/industries/Industries";
import SuccessStories from "./components/success-stories/SuccessStories";
import WhatWeDo from "./components/whatwedo/WhatWeDo";

export default function Home() {
  return (
    <main>
      {/* Header Section */}
      <Header></Header>
      {/* Hero Section */}
      <WhatWeDo></WhatWeDo>

      {/* Especializaciones */}
      <Industries></Industries>

      {/* Success Stories */}
      <SuccessStories></SuccessStories>

      {/* Contacto */}
      <CallToAction></CallToAction>

      {/* Footer */}
      <Footer></Footer>

      {/* Scroll */}
      <AutoScroll delayMs={5000} intervalMs={5000} stepPx={500}></AutoScroll>
    </main>
  )
}
