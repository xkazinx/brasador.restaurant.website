# Brasad'Or

The website of **Brasad'Or**, a restaurant in Spain serving traditional Armenian food: grilled meats, skewers and the dishes of the house. One page in Spanish: the restaurant, its services, the menu, a booking section and how to reach it. Live at **[kazin.dev/projects/brasador](https://kazin.dev/projects/brasador/)**.

Built in 2025 by [Elias Lujan (Kazin)](https://kazin.dev) on a free HTML Codex template, kept static so it can be hosted anywhere.

[![Landing page](docs/screenshots/home-1440.jpg)](https://kazin.dev/projects/brasador/)

## What a visitor meets

- **Landing**: the restaurant's logo, "Comida Tradicional Armenia" over a looping video of the grill, two calls to action (see the menu, book a table).
- **Servicios**: open every day, events, online bookings, table service.
- **Menú**: a photo gallery of the dishes and the room.
- **Reservar**: the booking form (date, time, number of guests, a note).
- **Contacto**: the address, a WhatsApp link, the map, and the social links.
- A back-to-top button, smooth scrolling and entrance animations as the sections appear.

## Screenshots

Taken from the live site on 2026-11-06.

| | |
|---|---|
| [![Services](docs/screenshots/services-1440.jpg)](docs/screenshots/services-1440.jpg) Services | [![Menu](docs/screenshots/reserve-1440.jpg)](docs/screenshots/reserve-1440.jpg) Menu gallery |
| [![Contact](docs/screenshots/contact-1440.jpg)](docs/screenshots/contact-1440.jpg) Contact | <img src="docs/screenshots/home-mobile.jpg" alt="Landing page on a phone" width="195"> On a phone |

## What runs behind it

- **Static HTML**, no backend: the page is `index.html` with its CSS, fonts, images and scripts; the video is a local WebM.
- **Bootstrap 5** (and the template's Bootstrap 4 stylesheet), **jQuery 3.4**, **Owl Carousel** for the galleries, **WOW.js** with `animate.css` for the entrance animations, Waypoints and CounterUp, Tempus Dominus for the date and time pickers, **Font Awesome** and Bootstrap Icons, Google Fonts (Heebo, Nunito, Pacifico).
- **Template**: HTML Codex's free restaurant template, licensed CC BY 4.0; the author's credit is kept as the license asks.

## Deploying

`deploy.ps1` packs the site, copies it to the Ubuntu box (ssh alias `kazin-music`) into `/opt/brasador-web/web`, installs `deploy/brasador-web.caddy` under the kazin.dev site and restarts Caddy. The old address `kazin.dev/brasador-web` redirects to the new one.

```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

## Layout

```
index.html                 the whole site
css/                       style.css and the Bootstrap stylesheets
js/main.js                 the template's behaviour (spinner, navbar, carousels, animations)
lib/                       animate, counterup, easing, owlcarousel, tempusdominus, waypoints, wow
img/                       photos, logo, capture.webm (the hero video)
fonts/, font-awesome-4.7.0/
deploy.ps1, deploy/        publishing to kazin.dev/projects/brasador
docs/screenshots/          the screenshots above
```

## History

- **2025-11-02**: first version of the site.
- **2026-10-18**: published on the Ubuntu box at kazin.dev/brasador-web with a one-command deploy.
- **2026-11-06**: moved to kazin.dev/projects/brasador; the repository renamed to brasador.restaurant.website.
