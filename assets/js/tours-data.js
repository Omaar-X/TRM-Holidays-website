/* ==========================================================================
   TRM HOLIDAYS — Local tour catalogue
   Used as the fallback whenever the Apps Script API is unreachable or the
   API_URL has not been filled in yet. Once the backend is live, the same
   shape comes back from ?action=get_tours.

   region   — 'domestic' (inside Bangladesh) or 'international'. This is what
              splits the site into its two package lists.
   category — trip style used by the filter pills: domestic, international,
              honeymoon, adventure, group.
   ========================================================================== */

const TOURS = [
  {
    id: 'TR-001',
    name: "Cox's Bazar Beachside Escape",
    category: 'domestic',
    region: 'domestic',
    destination: "Cox's Bazar, Bangladesh",
    days: 5, nights: 4,
    price: 12500,
    badge: 'hot',
    rating: 4.8, reviews: 214,
    people: '2-15',
    hotel: '3★ Beachfront',
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80',
    desc: "Five days on the world's longest unbroken sea beach. Sunrise at Laboni Point, an afternoon at Himchari waterfall, and a full day trip out to Inani and Marine Drive."
  },
  {
    id: 'TR-002',
    name: 'Bangkok City & Beach Combo',
    category: 'international',
    region: 'international',
    destination: 'Bangkok & Pattaya, Thailand',
    days: 7, nights: 6,
    price: 55000,
    badge: 'new',
    rating: 4.7, reviews: 168,
    people: '2-20',
    hotel: '4★ City + Beach',
    img: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=900&q=80',
    desc: 'Temples, street food and an evening cruise on the Chao Phraya in Bangkok, then down to Pattaya for Coral Island and the floating market.'
  },
  {
    id: 'TR-003',
    name: 'Dubai Luxury Explorer',
    category: 'international',
    region: 'international',
    destination: 'Dubai, UAE',
    days: 6, nights: 5,
    price: 78000,
    badge: 'hot',
    rating: 4.9, reviews: 302,
    people: '2-16',
    hotel: '5★ Downtown',
    img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&q=80',
    desc: 'Burj Khalifa at the top, a desert safari with BBQ dinner, the Dubai Frame, Marina cruise and a full day at your own pace in the Mall of the Emirates.'
  },
  {
    id: 'TR-004',
    name: 'Sajek Valley Adventure Trek',
    category: 'adventure',
    region: 'domestic',
    destination: 'Sajek, Rangamati',
    days: 3, nights: 2,
    price: 8500,
    badge: 'new',
    rating: 4.6, reviews: 141,
    people: '4-25',
    hotel: 'Hill Resort',
    img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80',
    desc: 'Above the clouds in the Kasalong range. Sunrise at Konglak Para, a Lusai village walk, and the long open-jeep ride up from Khagrachari.'
  },
  {
    id: 'TR-005',
    name: 'Turkey Istanbul & Cappadocia',
    category: 'international',
    region: 'international',
    destination: 'Istanbul & Cappadocia, Türkiye',
    days: 10, nights: 9,
    price: 120000,
    badge: 'limited',
    rating: 4.9, reviews: 96,
    people: '2-18',
    hotel: '4★ + Cave Hotel',
    img: 'https://images.unsplash.com/photo-1570939274717-7eda259b50ed?w=900&q=80',
    desc: 'Hagia Sophia, the Blue Mosque and the Grand Bazaar, then a flight to Cappadocia for a sunrise hot-air balloon over the fairy chimneys.'
  },
  {
    id: 'TR-006',
    name: 'Maldives Honeymoon Paradise',
    category: 'honeymoon',
    region: 'international',
    destination: 'Malé Atoll, Maldives',
    days: 6, nights: 5,
    price: 150000,
    badge: 'limited',
    rating: 5.0, reviews: 78,
    people: '2',
    hotel: '5★ Water Villa',
    img: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=900&q=80',
    desc: 'An overwater villa with a private deck, candlelit dinner on the sandbank, snorkelling on the house reef and a sunset dolphin cruise.'
  },
  {
    id: 'TR-007',
    name: 'Sundarbans Wildlife Safari',
    category: 'adventure',
    region: 'domestic',
    destination: 'Sundarbans, Khulna',
    days: 3, nights: 2,
    price: 9500,
    badge: 'hot',
    rating: 4.7, reviews: 187,
    people: '6-30',
    hotel: 'Launch (on board)',
    img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80',
    desc: 'Three days aboard a river launch through the largest mangrove forest on earth — Karamjal, Kotka, Jamtola Beach and Hiron Point.'
  },
  {
    id: 'TR-008',
    name: 'Bali Romantic Honeymoon',
    category: 'honeymoon',
    region: 'international',
    destination: 'Bali, Indonesia',
    days: 8, nights: 7,
    price: 95000,
    badge: 'new',
    rating: 4.8, reviews: 133,
    people: '2',
    hotel: '4★ Villa + Pool',
    img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&q=80',
    desc: 'Ubud rice terraces, the Tegallalang swing, a private pool villa in Seminyak and a day trip to Nusa Penida.'
  },
  {
    id: 'TR-009',
    name: 'Bandarban Hill Tracts Tour',
    category: 'domestic',
    region: 'domestic',
    destination: 'Bandarban, Chattogram',
    days: 4, nights: 3,
    price: 10000,
    badge: 'hot',
    rating: 4.6, reviews: 158,
    people: '4-22',
    hotel: 'Hill Resort',
    img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80',
    desc: 'Nilgiri, Nilachal, Boga Lake and the Chimbuk range — the highest road in Bangladesh, plus a boat ride on the Sangu river.'
  },
  {
    id: 'TR-010',
    name: 'Sylhet Tea Garden Retreat',
    category: 'domestic',
    region: 'domestic',
    destination: 'Sylhet & Sreemangal',
    days: 3, nights: 2,
    price: 9000,
    badge: 'new',
    rating: 4.5, reviews: 112,
    people: '2-20',
    hotel: '3★ Resort',
    img: 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=900&q=80',
    desc: 'Endless green in Sreemangal — Lawachara rainforest, the seven-layer tea, Ratargul swamp forest and Jaflong on the Indian border.'
  },
  {
    id: 'TR-011',
    name: 'Singapore City Tour',
    category: 'international',
    region: 'international',
    destination: 'Singapore',
    days: 5, nights: 4,
    price: 68000,
    badge: 'new',
    rating: 4.7, reviews: 124,
    people: '2-18',
    hotel: '4★ Central',
    img: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=900&q=80',
    desc: 'Gardens by the Bay, Sentosa and Universal Studios, the Night Safari and a Singapore Flyer ride over Marina Bay.'
  },
  {
    id: 'TR-012',
    name: "Cox's Bazar + Bandarban Combo",
    category: 'group',
    region: 'domestic',
    destination: "Cox's Bazar & Bandarban",
    days: 7, nights: 6,
    price: 18500,
    badge: 'hot',
    rating: 4.8, reviews: 96,
    people: '8-35',
    hotel: '3★ Beach + Hill',
    img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=900&q=80',
    desc: 'Sea and hills in one trip — four days on the Cox\'s Bazar coast, then up into the Bandarban hill tracks. Built for groups and corporate outings.'
  }
];

/* ---------------------------------------------------------------
   Card renderer — shared by index.html and tours.html
   --------------------------------------------------------------- */
function tourCard(t, aosDelay) {
  const badge = t.badge
    ? '<span class="badge badge-' + t.badge + '">' + t.badge + '</span>'
    : '';
  const region = TRM.regionOf(t);
  const regionTag = region === 'domestic'
    ? '<span class="region-tag region-dom"><i class="fa-solid fa-location-dot"></i>Domestic</span>'
    : '<span class="region-tag region-intl"><i class="fa-solid fa-plane"></i>International</span>';

  return (
    '<article class="card" data-cat="' + t.category + '" data-region="' + region + '" data-price="' + t.price + '"' +
      (aosDelay != null ? ' data-aos="fade-up" data-aos-delay="' + aosDelay + '"' : '') + '>' +
      '<div class="card-img">' +
        badge + regionTag +
        '<img src="' + t.img + '" alt="' + t.name + '" loading="lazy">' +
        '<span class="card-rating"><i class="fa-solid fa-star"></i>' + t.rating + '</span>' +
      '</div>' +
      '<div class="card-body">' +
        '<h3>' + t.name + '</h3>' +
        '<div class="card-meta">' +
          '<span><i class="fa-solid fa-location-dot"></i>' + t.destination + '</span>' +
          '<span><i class="fa-regular fa-clock"></i>' + t.days + 'D' + t.nights + 'N</span>' +
          '<span><i class="fa-solid fa-user-group"></i>' + t.people + '</span>' +
        '</div>' +
        '<div class="card-foot">' +
          '<div class="price"><small>Per person from</small>' +
            '<b>৳' + TRM.money(t.price) + '</b></div>' +
          '<a class="btn btn-gold btn-sm" href="tour-detail.html?id=' + t.id + '">Book Now</a>' +
        '</div>' +
      '</div>' +
    '</article>'
  );
}
