/* Injected SEO helpers — LodgingBusiness schema for Mik Zid Villa.
   Set SITE to the live domain before launch (see README). */
(function () {
  var SITE = 'https://your-domain.lk/';

  var villa = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    '@id': SITE + '#villa',
    name: 'Mik Zid Villa',
    slogan: 'A Private Escape',
    url: SITE,
    logo: SITE + 'media/emblem.png',
    image: [SITE + 'media/gate-night.jpg', SITE + 'media/pool-night.jpg', SITE + 'media/living.jpg'],
    description: 'A private villa in Piliyandala, Sri Lanka, for up to 15 guests, with a lit pool, a billiards games room, a gas BBQ and a lantern-lit garden. Suited to family gatherings, weekends with friends and celebrations.',
    telephone: '+94777327993',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Piliyandala',
      addressRegion: 'Western Province',
      addressCountry: 'LK'
    },
    parentOrganization: {
      '@type': 'Organization',
      name: 'Mikzid Holdings (Private) Limited'
    },
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Private pool', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Billiards table', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'BBQ grill', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Air conditioning', value: true }
    ],
    sameAs: [
      'https://www.instagram.com/mik_zid_villa_/',
      'https://www.facebook.com/share/14uth8M7kW4/'
    ]
  };

  var s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(villa);
  document.head.appendChild(s);
})();
