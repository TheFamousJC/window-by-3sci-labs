import { createStandaloneApplication } from './standalone/application.js';
import { describeError } from './standalone/errors.js';
import { t } from './i18n/index.js';

const renderHostname = 'window-by-3sci-labs.onrender.com';
const renderDefaultView =
  '#v=2&lat=30.2672&lon=-97.7431&alt=600&heading=15&pitch=-30&roll=360' +
  '&style=normal&bloom=0&sharpen=1&bi=0&bv=2&si=49&hud=tactical&hv=1&dm=DENSE&dd=75&da=elastic&kf=7&ko=1&cr=0&sc=1&scf=100' +
  '&map=esri-imagery&l=e.f.s.y.l.v.k&lo=f.e.1_k.o.n' +
  '&ui=c.c.1_c.p.0_l.c.1_l.p.0_d.c.0_v.c.1_i.c.0_t.c.1_r.c.1_s.c.1_g.c.1_p.c.1_m.c.0';

// Use the normal share-link restore path. A visitor's explicit view takes precedence.
if (window.location.hostname === renderHostname && !window.location.hash) {
  const url = new URL(window.location.href);
  url.hash = renderDefaultView;
  window.history.replaceState(window.history.state, '', url);
}

const application = createStandaloneApplication({
  googleApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
  cesiumToken: import.meta.env.CESIUM_ION_TOKEN,
  allowQaRegistration: import.meta.env.DEV,
});

application.start().catch((error) => {
  console.error("Window initialization failed:", error);
  const loaderStatus = document.querySelector('#loading-screen .loader-status');
  loaderStatus.textContent = t('Error: {message}', {
    message: describeError(error),
  });
  loaderStatus.style.color = '#ff4444';
});

export { application };
